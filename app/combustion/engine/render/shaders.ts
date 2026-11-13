// The GLSL shaders.


/* =========================================================
   SHADERS

   One fragment shader serves every opaque part. Patterns:
   1 turned grooves, 2 cast grain, 3 ground cross-hatch,
   4 bands along local Y (pistons), 5 bands along local X
   (journals and pins). Light comes from fixed directions in the engine's own
   frame, so the highlights slide over the metal as the engine turns.
   ========================================================= */

// Each part is spun about the crankshaft's X axis, scaled along its own Y
// (springs), moved, and then seen by the camera
export const SCENE_VERTEX_SHADER = `
  precision highp float;

  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute float aShine;
  attribute float aOcc;
  attribute float aPattern;
  attribute float aWet;

  uniform vec2 uSpin;
  uniform vec3 uOffset;
  uniform float uScaleY;
  uniform mat3 uOrient; // a fixed turn of the whole part, after its own spin
  uniform mat4 uViewProj;
  uniform vec3 uEye;
  uniform float uFocus;

  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vColor;
  varying float vShine;
  varying float vOcc;
  varying float vPattern;
  varying float vWet;
  varying float vRadius;
  varying float vDepthN;
  varying vec3 vPos;

  vec3 spin(vec3 p) {
    return vec3(
      p.x,
      p.y * uSpin.x + p.z * uSpin.y,
      -p.y * uSpin.y + p.z * uSpin.x
    );
  }

  void main() {
    vec3 local = vec3(aPosition.x, aPosition.y * uScaleY, aPosition.z);
    vec3 world = uOrient * spin(local) + uOffset;

    gl_Position = uViewProj * vec4(world, 1.0);

    vec3 nLocal = vec3(aNormal.x, aNormal.y / uScaleY, aNormal.z);
    vNormal = uOrient * spin(normalize(nLocal));
    vWorld = world;
    vColor = aColor;
    vShine = aShine;
    vOcc = aOcc;
    vPattern = aPattern;
    vWet = aWet;
    vRadius = length(aPosition.yz);

    // Nearer than the middle of the engine is brighter, farther is darker
    vDepthN = (uFocus - distance(uEye, world)) / 700.0;
    vPos = aPosition;
  }
`;

export const PART_FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec3 vNormal;
  varying vec3 vColor;
  varying float vShine;
  varying float vOcc;
  varying float vPattern;
  varying float vWet;
  varying float vRadius;
  varying float vDepthN;
  varying vec3 vPos;
  varying vec3 vWorld;

  uniform vec3 uEye;
  uniform vec3 uKey;
  uniform vec3 uFill;
  uniform vec3 uKick;
  uniform float uOpacity;
  uniform float uRim; // 0..1: a steel contour on the silhouette, with shadow just inside it
  uniform vec3 uRimTint; // the contour's bright line: plain steel, or a cold blue that stands out against the red heads
  uniform float uRimWide; // 0..1: how much wider and brighter the contour is (the exhaust's, against the heads)
  uniform float uFrontOnly; // 1: a see-through pipe or casing, drawn as only its skin toward the eye (its far wall left out)

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  vec3 hash33(vec3 p) {
    return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
  }

  // The heat shield's emboss on one plane: an egg-crate of small raised dimples and pits on a grid turned 30 degrees,
  // the turn flipping from one band to the next, so that the rows run in a herringbone. Its height, and its slope in gr
  // Engine turning (spot polishing): overlapping round spots in offset rows, each laid over the one before like scales,
// each polished in circles round its own middle, so that the light catches it in a bright and a dark fan that turn
// with the eye. Returns the fans' brightness (0..1) and, in d, the way across the polishing at p (for the normal)
float spotTurn(vec2 p, vec2 light, out vec2 d) {
  const float R = 0.62; // a spot's radius, in cells (they overlap)
  vec2 q = vec2(p.x, p.y * 1.0);
  float row = floor(q.y);
  float best = -1e9;
  vec2 rel = vec2(0.0);

  for (int dy = -1; dy <= 1; dy++) {
    float ry = row + float(dy);
    float off = mod(ry, 2.0) * 0.5;

    for (int dx = -1; dx <= 1; dx++) {
      vec2 c = vec2(floor(q.x - off) + float(dx) + 0.5 + off, ry + 0.5);
      vec2 r = q - c;

      // the spot from the row further down lies over the ones above it
      if (length(r) < R && ry > best) { best = ry; rel = r; }
    }
  }

  float rr = length(rel) + 1e-4;
  vec2 rad = rel / rr;

  d = vec2(-rad.y, rad.x); // along the polishing: round the spot

  float fan = 0.5 + 0.5 * cos(2.0 * (atan(rad.y, rad.x) - atan(light.y, light.x)));
  float rings = 0.5 + 0.5 * sin(rr * 120.0);

  return clamp(0.82 * fan + 0.18 * rings - 0.25 * smoothstep(R - 0.06, R, rr), 0.0, 1.0);
}

float emboss(vec2 p, out vec2 gr) {
    float f = 1.45; // a dimple every 4 units or so
    float s = mod(floor(p.y * 0.085 + 0.35 * sin(p.x * 0.05)), 2.0) < 0.5 ? 1.0 : -1.0;
    vec2 ax = vec2(0.866, -0.5 * s) * f;
    vec2 ay = vec2(0.5 * s, 0.866) * f;
    vec2 q = vec2(dot(vec2(ax.x, ay.x), p), dot(vec2(ax.y, ay.y), p));
    float a = sin(q.x);
    float c = sin(q.y);
    vec2 dq = vec2(cos(q.x) * c, a * cos(q.y));

    gr = vec2(dot(dq, vec2(ax.x, ax.y)), dot(dq, vec2(ay.x, ay.y)));

    return a * c;
  }

  void main() {
    vec3 view = normalize(uEye - vWorld);
    vec3 n = normalize(vNormal);

    // A see-through pipe or casing shows only the skin that faces the eye: one layer of glass, so that it stays one whole
    // piece, its far wall never laid over what is behind it
    if (uFrontOnly > 0.5 && dot(n, view) < -0.02) discard;

    // Lit on both sides: a part seen from behind, or from inside, is not black
    if (dot(n, view) < 0.0) n = -n;

    // The rough skin of sand casting: fine pits and grains turn the surface this way and that, a little,
    // so that its highlights break up into sparkle instead of lying smooth
    if (vPattern > 6.5 && vPattern < 7.5) {
      vec3 sp = vWorld * 0.62; // a fine grain
      float ja = vnoise(sp.yz * 3.1 + sp.x * 1.7) - 0.5 + 0.6 * (vnoise(sp.yz * 7.3 + sp.x * 3.9 + 2.0) - 0.5);
      float jb = vnoise(sp.zx * 3.7 + sp.y * 1.3 + 5.2) - 0.5 + 0.6 * (vnoise(sp.zx * 8.1 + sp.y * 3.3 + 8.0) - 0.5);
      float jc = vnoise(sp.xy * 4.3 + sp.z * 2.1 + 9.1) - 0.5 + 0.6 * (vnoise(sp.xy * 9.3 + sp.z * 4.7 + 4.0) - 0.5);

      n = normalize(n + vec3(ja, jb, jc) * 0.7);
    }

    // Sandpaper: a dense, very fine grit, matte, its grains each tilted its own way, picked out three ways at once
    // (by the faces' own axes, so that it lies evenly on every curve)
    float sandGrit = 0.5;
    float sandGlint = 0.0;

    if (vPattern > 8.5 && vPattern < 9.5) {
      vec3 w = abs(n);
      w /= (w.x + w.y + w.z);
      vec3 sp = vWorld * 3.4; // the grit's size: very fine, under a third of a unit
      vec2 cx = floor(sp.yz);
      vec2 cy = floor(sp.zx);
      vec2 cz = floor(sp.xy);
      float gx = hash21(cx);
      float gy = hash21(cy + 17.0);
      float gz = hash21(cz + 31.0);
      float g = gx * w.x + gy * w.y + gz * w.z; // each grain's own shade
      float fine = vnoise(sp.yz * 2.3) * w.x + vnoise(sp.zx * 2.3 + 4.0) * w.y + vnoise(sp.xy * 2.3 + 8.0) * w.z;
      float coarse = vnoise(sp.yz * 0.21 + 2.0) * w.x + vnoise(sp.zx * 0.21 + 6.0) * w.y + vnoise(sp.xy * 0.21 + 9.0) * w.z;

      sandGrit = clamp(0.55 * g + 0.3 * fine + 0.15 * coarse, 0.0, 1.0);
      // now and then a grain catches the light
      sandGlint = step(0.975, g);

      vec3 tilt = vec3(hash21(cx + 3.1) - 0.5, hash21(cy + 5.7) - 0.5, hash21(cz + 9.3) - 0.5) + 0.5 * vec3(fine - 0.5, coarse - 0.5, g - 0.5);
      n = normalize(n + tilt * 0.34);
    }

    // The heat shield: embossed foil, its dimples catching the light, its pits falling dark
    float shieldH = 0.0;

    if (vPattern > 9.5 && vPattern < 10.5) {
      vec3 w = abs(n);
      w = w * w * w * w;
      w /= (w.x + w.y + w.z);
      vec2 gx;
      vec2 gy;
      vec2 gz;
      float hx = emboss(vWorld.yz, gx);
      float hy = emboss(vWorld.zx + 7.3, gy);
      float hz = emboss(vWorld.xy + 3.1, gz);

      shieldH = hx * w.x + hy * w.y + hz * w.z;
      // (deeper than it was: the dimples stand out in relief, their sides turned well to the light, and a fine grain of
      // the foil's own over them)
      n = normalize(n - 0.55 * (w.x * vec3(0.0, gx.x, gx.y) + w.y * vec3(gy.y, 0.0, gy.x) + w.z * vec3(gz.x, gz.y, 0.0)));
      n = normalize(n + 0.06 * (vec3(vnoise(vWorld.yz * 2.6), vnoise(vWorld.zx * 2.6 + 4.0), vnoise(vWorld.xy * 2.6 + 9.0)) - 0.5));

      // (no burnt seams: the foil is one clean sheet; the streaks along the pipes are in the mesh, exhaust.ts)
    }

    // Wet values above 1.5 mean "newly soaked": 1 + the wetness. Those parts
    // also get a broad, glossy oil sheen; the others keep their look.
    float soaked = step(1.5, vWet);
    float wetAmt = vWet - soaked;

    vec3 keyDir = uKey;
    vec3 fillDir = uFill;

    float key = max(dot(n, keyDir), 0.0);
    float fill = max(dot(n, fillDir), 0.0);

    float sky = 0.5 + 0.5 * (-n.y);
    vec3 ambient = mix(vec3(0.10, 0.11, 0.14), vec3(0.30, 0.33, 0.39), sky);

    float isTurned = step(0.5, vPattern) * (1.0 - step(1.5, vPattern));
    float isCast = step(1.5, vPattern) * (1.0 - step(2.5, vPattern));
    float isGround = step(2.5, vPattern) * (1.0 - step(3.5, vPattern));
    float isBandY = step(3.5, vPattern) * (1.0 - step(4.5, vPattern));
    float isBandX = step(4.5, vPattern) * (1.0 - step(5.5, vPattern));
    float isSkirt = step(5.5, vPattern) * (1.0 - step(6.5, vPattern));
    float isRough = step(6.5, vPattern) * (1.0 - step(7.5, vPattern));
    float isCarbon = step(7.5, vPattern) * (1.0 - step(8.5, vPattern));
    float isSand = step(8.5, vPattern) * (1.0 - step(9.5, vPattern));
    float isShield = step(9.5, vPattern) * (1.0 - step(10.5, vPattern));
    float isSpot = step(10.5, vPattern) * (1.0 - step(11.5, vPattern));
    float isKnurl = step(11.5, vPattern);

    // Knurled relief (pattern 12): a fine diamond knurl pressed into the metal, two sets of grooves crossing at an angle,
    // each diamond a little pyramid standing out, its faces turned to the light; projected on the face's three planes
    float knurlH = 0.0;

    if (isKnurl > 0.5) {
      vec3 w = abs(n);
      w = w * w * w * w;
      w /= (w.x + w.y + w.z);
      const float K = 0.42; // grooves per unit (each diamond a little over 2 units across)
      // The knurl fades away where its diamonds would come under a few pixels (far off, or seen edge-on), so that it
      // never shimmers or crawls as the engine turns: there the pipe is plain satin
      float dist = length(uEye - vWorld);
      float facing = abs(dot(n, view));
      float fade = (1.0 - smoothstep(480.0, 1000.0, dist / max(facing, 0.25))) * smoothstep(0.08, 0.32, facing);
      vec3 g = vec3(0.0);
      float h = 0.0;

      // a smooth diamond's height in a plane (u, v), and its slope: two soft waves crossing, no hard edges to alias
      for (int ax = 0; ax < 3; ax++) {
        vec2 uv = ax == 0 ? vWorld.yz : (ax == 1 ? vWorld.zx : vWorld.xy);
        float a = (uv.x + uv.y) * K * 6.2832;
        float b = (uv.x - uv.y) * K * 6.2832;
        float ca = 0.5 - 0.5 * cos(a);
        float cb = 0.5 - 0.5 * cos(b);
        float hh = ca * cb;
        vec2 da = 0.5 * sin(a) * cb * vec2(1.0, 1.0);
        vec2 db = 0.5 * sin(b) * ca * vec2(1.0, -1.0);
        vec2 slope = da + db;
        float wt = ax == 0 ? w.x : (ax == 1 ? w.y : w.z);

        h += hh * wt;
        if (ax == 0) g += wt * vec3(0.0, slope.x, slope.y);
        else if (ax == 1) g += wt * vec3(slope.y, 0.0, slope.x);
        else g += wt * vec3(slope.x, slope.y, 0.0);
      }

      knurlH = mix(0.5, h, fade);
      g -= n * dot(n, g);
      n = normalize(n - 2.3 * fade * g); // (steep: tall diamonds, their sides turned well away)
    }

    // Engine-turned spots (pattern 11): projected on the face's dominant plane, small, in offset rows
    float spotV = 0.5;

    if (isSpot > 0.5) {
      vec3 w = abs(n);
      vec2 sp;
      vec2 l2;

      if (w.x >= w.y && w.x >= w.z) { sp = vWorld.zy; l2 = vec2(keyDir.z, keyDir.y) + vec2(view.z, view.y); }
      else if (w.y >= w.z) { sp = vWorld.xz; l2 = vec2(keyDir.x, keyDir.z) + vec2(view.x, view.z); }
      else { sp = vWorld.xy; l2 = vec2(keyDir.x, keyDir.y) + vec2(view.x, view.y); }

      vec2 dd;

      spotV = spotTurn(sp / 2.7, normalize(l2 + vec2(1e-4)), dd);
    }

    // Turned grooves, cast grain, ground cross-hatch, turned bands
    float rings = 0.5 + 0.5 * sin(vRadius * 3.4);
    float hatch = 0.5 + 0.5 * sin(vPos.y * 4.6 + vPos.z * 1.6);
    float bandY = 0.5 + 0.5 * sin(vPos.y * 1.8);
    float bandX = 0.5 + 0.5 * sin(vPos.x * 1.8);
    float fineY = 0.5 + 0.5 * sin(vPos.y * 2.6);
    float grain = 0.5;
    float roughTone = 0.5;

    if (isRough > 0.5) {
      // fine and detailed: three grains, each finer than the last
      roughTone = smoothstep(0.2, 0.8, 0.45 * vnoise(vWorld.yz * 0.7 + vec2(vWorld.x * 0.45, 3.0)) + 0.35 * vnoise(vWorld.zx * 2.4 + vec2(vWorld.y * 1.0, 9.0)) + 0.2 * vnoise(vWorld.xy * 5.5 + vec2(vWorld.z * 2.2, 5.0)));
    }

    if (isCast + isSkirt > 0.5) {
      vec2 q = vPos.yz * 0.5 + vec2(vPos.x * 0.8, 0.0);
      grain = 0.6 * vnoise(q) + 0.4 * vnoise(q * 2.7 + 11.3);
    }

    // Carbon-fibre twill: a weave of small tiles, the fibres running one way in one tile and across in the next, each tile
    // lit along its fibres
    float weave = 0.5;

    if (isCarbon > 0.5) {
      // a 2x2 twill: tiles stepped one along each row, so that the weave runs in diagonals; each tile a tow of fibres,
      // rounded across (lit on its crown, dark into the seams between tows), its fine fibres catching the light along it
      vec2 q = vec2(vPos.y + vPos.x, vPos.z) * 0.24;
      vec2 cell = floor(q);
      vec2 f = fract(q);
      float par = mod(cell.x + floor((cell.y + mod(cell.x, 2.0)) * 0.5) * 2.0 + cell.y, 2.0);
      float across = par > 0.5 ? f.x : f.y; // across the tow
      float along = par > 0.5 ? f.y : f.x; // along it
      float crown = sin(across * 3.14159);
      float seam = smoothstep(0.0, 0.09, across) * smoothstep(0.0, 0.09, 1.0 - across) * smoothstep(0.0, 0.05, along) * smoothstep(0.0, 0.05, 1.0 - along);
      float fibres = 0.5 + 0.5 * sin(across * 62.8 + 1.7 * sin(along * 6.28));
      float sheen = pow(crown, 3.0);

      weave = clamp((0.12 + 0.62 * crown + 0.12 * fibres + 0.22 * sheen) * (0.35 + 0.65 * seam), 0.0, 1.0);

      // the tow's roundness turns the normal across it, so that the light runs over the weave as the engine turns
      vec3 tAcross = par > 0.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);

      n = normalize(n + tAcross * (0.5 - across) * 0.55 * seam);
    }

    float tone = 1.0
      + isCarbon * (-0.42 + 0.8 * weave)
      + isTurned * (-0.14 + 0.28 * rings)
      + isCast * (-0.16 + 0.34 * grain)
      + isGround * (-0.10 + 0.20 * (0.55 * rings + 0.45 * hatch))
      + isBandY * (-0.08 + 0.16 * bandY)
      + isBandX * (-0.07 + 0.14 * bandX)
      + isSkirt * (-0.05 + 0.10 * (0.8 * fineY + 0.2 * grain)) // the skirt: polished, its striations only just there
      + isRough * (-0.20 + 0.42 * roughTone)
      + isSand * (-0.16 + 0.30 * sandGrit)
      + isShield * (0.34 * shieldH - 0.04) // (the pits fall darker, the crowns lighter: relief)
      + isSpot * (-0.22 + 0.44 * spotV)
      + isKnurl * (-0.5 + 0.68 * pow(knurlH, 0.8)); // (the grooves fall deep and dark, the diamonds' crowns lit)

    // Oil fills in the grain: wet surfaces look smoother
    tone = 1.0 + (tone - 1.0) * (1.0 - (0.45 + 0.3 * soaked) * wetAmt);

    // Studio-style reflection gradient, so metal reads as metal
    vec3 refl = reflect(-view, n);
    float env = smoothstep(-0.9, 0.9, -refl.y);
    float band = smoothstep(0.35, 0.65, -refl.y) - smoothstep(0.70, 0.95, -refl.y);

    float metal = clamp(vShine, 0.0, 1.0);

    vec3 base = vColor * tone;

    vec3 col = base * (ambient + key * 0.80 + fill * 0.34);
    col *= mix(1.0, 0.62 + 0.75 * env, metal * 0.75);
    col *= mix(0.30, 1.0, vOcc);

    // Light bounced up from the floor: what faces down is not black
    col += base * max(n.y, 0.0) * 0.24 * mix(0.3, 1.0, vOcc);

    vec3 halfKey = normalize(keyDir + view);
    float spec = pow(max(dot(n, halfKey), 0.0), 36.0) * metal;
    spec *= 1.0
      + isTurned * (-0.45 + 0.9 * rings)
      + isGround * (-0.35 + 0.7 * hatch * rings)
      + isCast * (-0.55 + 0.7 * grain) * (1.0 - 0.6 * wetAmt)
      + isBandY * (-0.30 + 0.6 * bandY)
      + isBandX * (-0.25 + 0.5 * bandX)
      + isSkirt * (-0.15 + 0.3 * fineY)
      + isRough * (-0.40 + 0.95 * roughTone)
      + isCarbon * (-0.75 + 1.75 * weave)
      + isSand * (-0.5 + 1.5 * sandGlint)
      + isShield * (0.05 + 1.15 * max(shieldH, 0.0)) // (light only on the crowns)
      + isSpot * (-0.7 + 1.9 * spotV)
      + isKnurl * (-0.7 + 0.75 * knurlH); // (the highlight held down: only the crowns glint, softly)

    float fres = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 3.0);

    col += vec3(spec * 0.85 + band * metal * 0.14 + fres * 0.10 * metal) * mix(0.25, 1.0, vOcc);

    // ---- Oil film: wet metal is darker and richer, with sharp amber
    // highlights, a stronger grazing reflection and a faint rainbow ----
    float smear = 0.5;

    if (vWet > 0.02) {
      smear = vnoise(vPos.yz * 0.42 + vec2(vPos.x * 0.31, 7.0));
    }
    float wet = wetAmt * (0.55 + 0.45 * smear);

    vec3 oilTint = vec3(1.0, 0.86, 0.60);
    vec3 halfFill = normalize(fillDir + view);
    float tight = pow(max(dot(n, halfKey), 0.0), 48.0);
    float soft = pow(max(dot(n, halfFill), 0.0), 24.0);
    float film = 0.5 + 0.5 * sin(fres * 9.0 + smear * 6.0);
    vec3 rainbow = mix(vec3(0.10, 0.05, 0.0), vec3(0.0, 0.07, 0.13), film);

    col *= 1.0 - 0.20 * wet;
    col *= 1.0 + 0.30 * wet * env;
    col += oilTint * (tight * 0.9 + soft * 0.45) * wet * mix(0.3, 1.0, vOcc);

    // Soaked parts: a rim light from the right-hand side lays a glossy film
    // over flat faces, which the key light alone would never reach
    vec3 kickDir = uKick;
    vec3 halfKick = normalize(kickDir + view);
    float kick = pow(max(dot(n, halfKick), 0.0), 22.0);
    float broad = pow(max(dot(n, halfKey), 0.0), 3.0);
    col += oilTint * (kick * 0.4 + broad * 0.12) * wet * soaked * mix(0.3, 1.0, vOcc);
    col = mix(col, col * vec3(1.07, 0.97, 0.80), 0.35 * wet * soaked);
    col += rainbow * fres * wet * 0.7;
    col = mix(col, col * vec3(0.92, 0.80, 0.60), wet * (1.0 - vOcc) * 0.8);

    col *= 0.88 + 0.12 * smoothstep(-1.0, 1.0, vDepthN);

    // A two-tone contour on the silhouette, with a band of shadow just inside it: the tube has an edge, seen against the
    // bright gas inside it as well as against the dark around it. Toward the silhouette a line of bright, polished steel,
    // and on the very edge a line of dark, blued steel. edge is 0 facing the eye and 1 at the silhouette.
    float edge = 1.0 - clamp(dot(n, view), 0.0, 1.0);
    float shade = smoothstep(0.26, 0.58, edge) * (1.0 - smoothstep(0.58, 0.80, edge));
    // (a front-only piece, its contour drawn once, a little wider and stronger, so that its outline reads unbroken)
    float rimLine = smoothstep(0.66 - 0.26 * uRimWide - 0.1 * uFrontOnly, 0.86 - 0.12 * uRimWide - 0.04 * uFrontOnly, edge);
    float darkLine = smoothstep(0.86 - 0.1 * uRimWide, 0.97 - 0.03 * uRimWide, edge);

    col *= 1.0 - uRim * 0.55 * shade;

    vec3 steel = uRimTint * (0.6 + 0.45 * env) * (1.0 + 0.45 * uRimWide) * (1.0 + uRimWide * (0.6 * env - 0.3))
      + vec3(spec * (0.6 + 0.4 * uRimWide));
    vec3 blued = vec3(0.10, 0.12, 0.17) + vec3(0.25, 0.32, 0.45) * spec;

    col = mix(col, steel, uRim * rimLine * (1.0 - darkLine) * 0.95);
    col = mix(col, blued, uRim * darkLine * 0.9);

    float alpha = clamp(uOpacity + uRim * (0.32 * shade + (0.7 + 0.2 * uFrontOnly) * rimLine), 0.0, 1.0);

    // The glints on rough cast metal are not dimmed by the see-through skin: they sparkle on it
    vec3 glint = vec3(1.0, 0.84, 0.80) * spec * 0.5 * isRough;

    gl_FragColor = vec4(clamp(col * alpha + glint, 0.0, 1.0), alpha);
  }
`;

// The floor: a faint grid that gives the eye something to turn against, and a
// soft shadow under the engine
export const FLOOR_VERTEX_SHADER = `
  precision highp float;

  attribute vec3 aPos;
  uniform mat4 uViewProj;
  varying vec3 vWorld;

  void main() {
    vWorld = aPos;
    gl_Position = uViewProj * vec4(aPos, 1.0);
  }
`;

export const FLOOR_FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec3 vWorld;
  uniform vec3 uEye;
  uniform vec3 uBackground;
  uniform vec4 uFootprint; // centre x, half length, half width, floor level
  uniform float uFade;

  void main() {
    float eyeDist = distance(uEye, vWorld);

    // Fine grid every 100 units, and a stronger line every 500
    vec2 cell = vWorld.xz / 100.0;
    vec2 g = abs(fract(cell - 0.5) - 0.5) * 100.0;
    float w = 0.0011 * eyeDist + 0.35;
    float minor = 1.0 - smoothstep(w, 2.0 * w, min(g.x, g.y));

    vec2 big = abs(fract(vWorld.xz / 500.0 - 0.5) - 0.5) * 500.0;
    float major = 1.0 - smoothstep(w, 2.4 * w, min(big.x, big.y));

    // The engine's shadow: a soft rounded rectangle
    vec2 q = abs(vec2(vWorld.x - uFootprint.x, vWorld.z)) - vec2(uFootprint.y, uFootprint.z);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    float shadow = 1.0 - smoothstep(-30.0, 190.0, d);

    float radial = length(vWorld.xz - vec2(uFootprint.x, 0.0));
    float fade = 1.0 - smoothstep(500.0, 1500.0, radial);

    vec3 base = vec3(0.045, 0.052, 0.066);
    vec3 col = base + vec3(0.050, 0.060, 0.080) * minor * fade + vec3(0.07, 0.085, 0.115) * major * fade;

    // A faint pool of light under the engine, darkened right under it
    col += vec3(0.020, 0.026, 0.040) * (1.0 - smoothstep(0.0, 900.0, radial));
    col *= 1.0 - 0.72 * shadow;

    // Out toward the horizon it dissolves into the background
    float horizon = smoothstep(1100.0, 2600.0, radial);
    col = mix(col, uBackground, horizon);

    gl_FragColor = vec4(col * uFade, uFade);
  }
`;

// The charge inside a cylinder: a volume bounded by the bore, the chamber roof
// and the piston crown. Each pixel's ray is followed through it analytically,
// so the gas thickens toward the middle of the bore, and the flame (a sphere
// that grows from the spark) is cut off exactly by the walls, the roof and the
// piston.
export const VOLUME_VERTEX_SHADER = `
  precision highp float;

  attribute vec3 aUnit;
  uniform mat4 uViewProj;
  uniform vec2 uAxis;
  uniform float uRadius;
  uniform float uTop;
  uniform float uBottom;
  uniform mat3 uBank; // from the bank's own frame to the engine's
  varying vec3 vWorld;
  varying vec3 vLocal;

  void main() {
    vLocal = vec3(
      uAxis.x + aUnit.x * uRadius,
      mix(uTop, uBottom, aUnit.y),
      uAxis.y + aUnit.z * uRadius
    );
    vWorld = uBank * vLocal;
    gl_Position = uViewProj * vec4(vWorld, 1.0);
  }
`;

export const VOLUME_FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec3 vWorld;
  varying vec3 vLocal;
  uniform mat3 uBankInv; // from the engine's frame to the bank's own
  uniform vec3 uEye;
  uniform vec2 uAxis;
  uniform float uRadius;
  uniform float uTop;
  uniform float uBottom;
  uniform vec3 uGasColor;
  uniform float uGasSigma;
  uniform vec3 uFlameC;
  uniform float uFlameR;
  uniform float uFlameK;

  void main() {
    // the ray, followed in the bank's own frame, where the bore stands upright
    vec3 ro = uBankInv * uEye;
    vec3 rd = normalize(vLocal - ro);

    // Where the ray goes through the bore (an infinite cylinder about Y)...
    vec2 o = ro.xz - uAxis;
    vec2 d = rd.xz;
    float a2 = dot(d, d);
    float b2 = dot(o, d);
    float c2 = dot(o, o) - uRadius * uRadius;
    float t0 = -1.0e9;
    float t1 = 1.0e9;

    if (a2 > 1.0e-6) {
      float disc = b2 * b2 - a2 * c2;
      if (disc <= 0.0) discard;
      float s = sqrt(disc);
      t0 = (-b2 - s) / a2;
      t1 = (-b2 + s) / a2;
    } else if (c2 > 0.0) {
      discard;
    }

    // ...and between the chamber roof and the piston crown
    if (abs(rd.y) > 1.0e-6) {
      float ta = (uTop - ro.y) / rd.y;
      float tb = (uBottom - ro.y) / rd.y;
      t0 = max(t0, min(ta, tb));
      t1 = min(t1, max(ta, tb));
    } else if (ro.y < uTop || ro.y > uBottom) {
      discard;
    }

    t0 = max(t0, 0.0);
    if (t1 <= t0) discard;

    // The proxy's back faces are drawn too: keep only the front half
    if (distance(ro, vLocal) > 0.5 * (t0 + t1)) discard;

    float thick = t1 - t0;
    float gasA = 1.0 - exp(-uGasSigma * thick);

    // The flame: a sphere about the spark, clipped to the chamber
    float flameA = 0.0;
    vec3 flameCol = vec3(0.0);

    if (uFlameK > 0.001 && uFlameR > 0.5) {
      vec3 oc = ro - uFlameC;
      float bb = dot(oc, rd);
      float cc = dot(oc, oc) - uFlameR * uFlameR;
      float dd = bb * bb - cc;

      if (dd > 0.0) {
        float sq = sqrt(dd);
        float lo = max(-bb - sq, t0);
        float hi = min(-bb + sq, t1);

        if (hi > lo) {
          float len = hi - lo;
          vec3 mid = ro + rd * (0.5 * (lo + hi));
          float core = clamp(1.0 - length(mid - uFlameC) / uFlameR, 0.0, 1.0);
          float k = uFlameK * (0.010 + 0.034 * core * core);

          flameA = 1.0 - exp(-k * len);
          flameCol = mix(vec3(1.0, 0.26, 0.04), vec3(1.0, 0.93, 0.62), smoothstep(0.12, 0.9, core));
          flameCol *= 1.0 + 1.5 * core;
        }
      }
    }

    float alpha = gasA + flameA - gasA * flameA;
    // The gas's colour, richer than the stroke's own: pushed away from its grey and brightened, while how much it hides
    // (the alpha) stays as it was, so that the charge is as clear as ever and only its colour is stronger
    float grey = dot(uGasColor, vec3(0.299, 0.587, 0.114));
    vec3 gas = max(vec3(grey) + (uGasColor - vec3(grey)) * 1.45, vec3(0.0));
    vec3 col = gas * (gasA * 1.95) * (1.0 - flameA) + flameCol * flameA; // the colour stands out more than the alpha does

    gl_FragColor = vec4(col, alpha);
  }
`;

// The glass sleeve round each bore: nearly clear, brighter at the grazing
// edges and where the key light catches it, and flushed orange by the flame
export const GLASS_FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec3 vWorld;
  varying vec3 vN;
  uniform vec3 uEye;
  uniform vec3 uKey;
  uniform float uGlow;
  uniform float uWall; // 1 for the liner's wall round the bore: fainter, and grey rather than blue
  uniform float uOil; // 1 for the film of oil on the bore's wall: amber, glossy, running down in drips
  uniform float uOilTime; // seconds, for the drips' slow run down the wall
  uniform float uOilFresh; // 1 when the film's top edge is the fresh bead the rings scrape down, 0 when its bottom is
  varying vec3 vLocal; // the point in the bank's own frame, about the bore's axis
  varying float vV; // 0 at the band's top, 1 at its bottom

  float oilHash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

  void main() {
    vec3 view = normalize(uEye - vWorld);

    if (uOil > 0.5) {
      vec3 n = normalize(vN);
      if (dot(n, view) < 0.0) n = -n;
      float facing = abs(dot(n, view));
      float edge = pow(1.0 - facing, 2.0);
      vec3 h = normalize(uKey + view);
      float spec = pow(max(dot(n, h), 0.0), 90.0);

      // drips: thin runs down the wall, each at its own place round the bore, sliding slowly down
      float ang = atan(vLocal.z, vLocal.x) / 6.2831853 + 0.5;
      float lane = floor(ang * 46.0);
      float within = fract(ang * 46.0);
      float rnd = oilHash(lane + 3.1);
      float run = fract(vLocal.y * 0.018 - uOilTime * (0.15 + 0.25 * rnd) + rnd);
      float drip = smoothstep(0.42, 0.5, within) * (1.0 - smoothstep(0.5, 0.58, within)) * step(0.45, rnd)
        * smoothstep(0.0, 0.5, run) * (1.0 - smoothstep(0.75, 1.0, run));

      // the bead: oil the rings have wiped together, at the band's fresh edge
      float bead = mix(smoothstep(0.82, 1.0, vV), 1.0 - smoothstep(0.0, 0.16, vV), uOilFresh);

      vec3 amber = vec3(0.86, 0.52, 0.12);
      vec3 col = amber * (0.28 + 0.5 * edge + 0.5 * bead + 0.6 * drip) + vec3(1.0, 0.86, 0.6) * spec * 1.2;
      float alpha = clamp(0.04 + 0.12 * edge + 0.42 * bead + 0.38 * drip + 0.55 * spec, 0.0, 0.8);
      alpha *= 1.0 - uOilFresh * smoothstep(0.35, 1.0, vV); // the band fades out below

      gl_FragColor = vec4(col * alpha, alpha);
      return;
    }

    vec3 n = normalize(vN);
    float facing = abs(dot(n, view));
    float edge = pow(1.0 - facing, 3.0);

    vec3 h = normalize(uKey + view);
    float spec = pow(max(dot(n, h), 0.0), 70.0);

    vec3 glass = mix(vec3(0.56, 0.6, 0.66), vec3(0.62, 0.65, 0.7), uWall); // a darker aluminium, still lighter than the block

    // A faint banding up the sleeve, as in a machined liner seen through glass
    float band = 0.5 + 0.5 * sin(vWorld.y * 0.55);
    float sheen = 0.04 * band;
    // shading round the bore: lit toward the key light, darker away from it, as a turned aluminium sleeve
    float lit = 0.55 + 0.45 * max(dot(n, normalize(uKey)), 0.0);

    vec3 col = glass * (0.22 + 0.78 * edge + sheen) * lit + vec3(1.0, 0.98, 0.95) * spec * 1.1;
    col += vec3(1.0, 0.45, 0.10) * uGlow * (0.25 + 0.75 * edge);

    float alpha = 0.11 + 0.5 * edge + 0.5 * spec + 0.22 * uGlow + sheen;
    alpha = clamp(alpha, 0.0, 0.88) * (1.0 - 0.5 * uWall);

    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

export const GLASS_VERTEX_SHADER = `
  precision highp float;

  attribute vec3 aUnit;
  uniform mat4 uViewProj;
  uniform vec2 uAxis;
  uniform float uRadius;
  uniform float uTop;
  uniform float uBottom;
  uniform float uSide;
  uniform mat3 uBank; // from the bank's own frame to the engine's
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec3 vLocal;
  varying float vV;

  void main() {
    vLocal = vec3(aUnit.x * uRadius, mix(uTop, uBottom, aUnit.y), aUnit.z * uRadius);
    vV = aUnit.y;
    vWorld = uBank * vec3(
      uAxis.x + aUnit.x * uRadius,
      mix(uTop, uBottom, aUnit.y),
      uAxis.y + aUnit.z * uRadius
    );
    vN = uBank * (vec3(aUnit.x, 0.0, aUnit.z) * uSide);
    gl_Position = uViewProj * vec4(vWorld, 1.0);
  }
`;

// Soft round sprites: fuel droplets and vapour, the spark, the first glow of
// the flame. Their size is given in world units and shrinks with distance.
// The fog: a see-through body filling the pipes to and from the turbocharger.
// Waves run along it and wind round it; their phase comes from the engine.
export const FOG_VERTEX_SHADER = `
  precision highp float;

  attribute vec3 aPos;
  attribute vec3 aDir;
  attribute vec4 aInfo; // distance along, angle round, heat, fade

  uniform mat4 uViewProj;

  varying vec3 vDir;
  varying vec3 vWorld;
  varying vec4 vInfo;

  void main() {
    gl_Position = uViewProj * vec4(aPos, 1.0);
    vDir = aDir;
    vWorld = aPos;
    vInfo = aInfo;
  }
`;

export const FOG_FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec3 vDir;
  varying vec3 vWorld;
  varying vec4 vInfo;

  uniform vec3 uEye;
  uniform vec3 uKey; // toward the key light
  uniform float uPhase;
  uniform float uDensity;
  uniform float uDrive;
  uniform float uGlow;
  uniform vec3 uBase;
  uniform vec3 uTone;
  uniform vec3 uAccent; // the colour the body passes through between its base and its tone
  uniform float uRich; // how much the accent and the finer pulse show
  uniform float uSmooth; // 1 for a body that flows on steadily (the pipes): a soft, even wave instead of a pulse

  void main() {
    vec3 v = normalize(uEye - vWorld);
    vec3 n = normalize(vDir);
    float ndv = dot(n, v);
    float facing = abs(ndv);

    // The far wall is seen from inside: its normal faces the eye
    if (ndv < 0.0) n = -n;

    // The movement is a gradient inside the solid. It rises slowly to a bright
    // head and then drops away, and it travels along the flow, head first, like a
    // loading bar that keeps on loading. x counts lengths from the start and moves
    // on with the engine's phase (a whole number of lengths a cycle, so it repeats
    // exactly). Nothing depends on the angle round the body.
    float x = vInfo.x / 140.0 - uPhase;
    float f = fract(x);
    float g = smoothstep(0.0, 0.92, f) * (1.0 - smoothstep(0.92, 1.0, f));

    // In the pipes the flow is smooth and continuous: a gentle, even swell instead of the pulse's bright head
    g = mix(g, 0.5 + 0.5 * sin(6.2831853 * x), uSmooth);
    float pulse = 1.0 - 0.7 * uSmooth;

    // Metal: a bright sky above, a dark band at the horizon, light bounced up from
    // the floor, a hot spot from the key light, and a bright edge
    vec3 r = reflect(-v, n);
    float up = -r.y;
    float env = 0.30 + 0.70 * smoothstep(-0.35, 0.85, up);
    env += 0.25 * smoothstep(0.55, 0.95, -up);

    float spec = pow(max(dot(r, normalize(uKey)), 0.0), 36.0);
    float rim = pow(1.0 - facing, 2.5);

    // A richer colour: from its base, through an accent, to its tone, along its length, rather than
    // straight from one to the other; and a little more saturated
    float t3 = vInfo.z;
    vec3 base = t3 < 0.5 ? mix(uBase, uAccent, t3 * 2.0) : mix(uAccent, uTone, (t3 - 0.5) * 2.0);
    float lum = dot(base, vec3(0.30, 0.59, 0.11));

    base = clamp(mix(vec3(lum), base, 1.0 + 0.3 * uRich), 0.0, 1.0);
    vec3 metal = base * (0.5 + 0.7 * env) + base * rim * 0.45 + vec3(1.0) * spec * 0.9;

    // The gradient's head is brighter, almost white at its tip
    metal += (base * pow(g, 3.0) * 0.8 + vec3(1.0, 0.95, 0.85) * pow(g, 10.0) * 0.25) * pulse;

    // The head takes a tint of the accent, and a second, finer pulse runs through the body (two to a length
    // of the first, so that it too repeats exactly)
    float g2 = smoothstep(0.0, 0.9, fract(vInfo.x / 70.0 - uPhase * 2.0));

    metal += uAccent * pow(g, 2.0) * 0.30 * uRich * pulse;
    metal += mix(base, uAccent, 0.6) * pow(g2, 5.0) * 0.24 * uRich * (0.4 + 0.6 * g) * pulse;
    metal *= 1.0 + uGlow;

    // The same density for both kinds, so both are equally see-through; densest
    // where the line of sight goes through the middle, soft at the edges
    float body = pow(facing, 0.8);
    float a = uDensity * body * vInfo.w * uDrive * mix(0.38 + 0.95 * g, 0.7 + 0.32 * g, uSmooth);

    gl_FragColor = vec4(metal * a, a);
  }
`;

// Thin ribbons that face the screen: the air's streaks. Each segment is a quad;
// the other end of the segment says which way it runs on the screen.
export const STREAK_VERTEX_SHADER = `
  precision highp float;

  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec2 aCorner; // x: 0 this segment's start, 1 its end; y: which side
  attribute vec4 aCol;
  attribute float aWidth; // world units

  uniform mat4 uViewProj;
  uniform vec2 uViewport; // pixels
  uniform float uPxPerUnit;

  varying vec4 vCol;
  varying float vSide;

  void main() {
    vec4 ca = uViewProj * vec4(aA, 1.0);
    vec4 cb = uViewProj * vec4(aB, 1.0);
    vec4 c = mix(ca, cb, aCorner.x);

    vec2 pa = ca.xy / ca.w * 0.5 * uViewport;
    vec2 pb = cb.xy / cb.w * 0.5 * uViewport;
    vec2 d = pb - pa;
    float len = length(d);
    d = len > 0.0001 ? d / len : vec2(1.0, 0.0);

    float px = max(aWidth * uPxPerUnit / max(c.w, 1.0), 1.3);
    vec2 offset = vec2(-d.y, d.x) * aCorner.y * px * 0.5;

    gl_Position = vec4(c.xy + offset / (0.5 * uViewport) * c.w, c.z, c.w);
    vCol = aCol;
    vSide = aCorner.y;
  }
`;

export const STREAK_FRAGMENT_SHADER = `
  precision mediump float;

  varying vec4 vCol;
  varying float vSide;

  void main() {
    float edge = 1.0 - smoothstep(0.3, 1.0, abs(vSide));
    float a = vCol.a * edge;

    gl_FragColor = vec4(vCol.rgb * a, a);
  }
`;

export const POINT_VERTEX_SHADER = `
  precision highp float;

  attribute vec3 aPos;
  attribute float aSize;
  attribute vec4 aCol;
  uniform mat4 uViewProj;
  uniform float uPxPerUnit;
  varying vec4 vCol;

  void main() {
    gl_Position = uViewProj * vec4(aPos, 1.0);
    gl_PointSize = clamp(aSize * uPxPerUnit / gl_Position.w, 1.0, 180.0);
    vCol = aCol;
  }
`;

export const POINT_FRAGMENT_SHADER = `
  precision mediump float;

  varying vec4 vCol;

  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float d = dot(c, c);
    if (d > 1.0) discard;

    float s = 1.0 - d;
    float a = vCol.a * s * s;

    gl_FragColor = vec4(vCol.rgb * a, a);
  }
`;
