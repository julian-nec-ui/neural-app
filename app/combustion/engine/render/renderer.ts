// The WebGL renderer: one canvas, one depth buffer, the whole engine.

import type { Bank } from "../core/constants";
import { BANKS, BORE_R, DRIVE_DX, CYLS, FLYWHEEL_WORLD_X, LINER_H, LINER_OUTER_R, LINER_WALL_H, ORIENT, TAU, bankPoint, composeTurn } from "../core/constants";
import { normalizeCycle } from "../core/numbers";
import { SCENE_OPTIONS } from "../core/options";
import { FOG_FLOATS, FOG_GROUPS } from "../fx/airflow/bodies";
import { FOG_STATE } from "../fx/airflow/update";
import { STREAKS, STREAK_FLOATS } from "../fx/airflow/streaks";
import { CYLINDER_FX, MIST, OIL, OIL_CLOCK, computeEffects } from "../fx/combustion";
import { GLOW } from "../fx/points";
import { FW_STRIDE } from "../mesh/builder";
import type { FwVec3 } from "../mesh/builder";
import { MODULES, modulePoint } from "../mesh/exhaust";
import { TURBO_AT, TURBO_ORIENT } from "../mesh/turbo";
import { icTurn } from "../mesh/intercooler";

import { ST_AT } from "../mesh/starter";
import { VT } from "../mesh/valvetrain";
import { CAM_FOV, LIGHT_FILL, LIGHT_KEY, LIGHT_KICK, viewProjection } from "./camera";
import type { CameraController } from "./camera";
import { blurSteps, createMotionBlur } from "./motionBlur";
import { BACKGROUND, BLOCK_RIM, STARTER_YOKE_OPACITY, CAM_NEAR_DEPTH, CASING_OPACITY, COOL_PIPE_OPACITY, DECK_OPACITY, HOT_CHARGE_OPACITY, EXHAUST_PALE, FLOOR_Y, FOG_DENSITY, FOG_PALETTE, HOT_PIPE_OPACITY, INTAKE_DUCT_OPACITY, OIL_BAND, PIPE_OPACITY, PIPE_RIM, RIM_CHARGE, RIM_EXHAUST, RIM_STEEL, SUMP_OPACITY, headOpacityAt, mix3, smooth01 } from "./look";
import { FLOOR_FRAGMENT_SHADER, FLOOR_VERTEX_SHADER, FOG_FRAGMENT_SHADER, FOG_VERTEX_SHADER, GLASS_FRAGMENT_SHADER, GLASS_VERTEX_SHADER, PART_FRAGMENT_SHADER, POINT_FRAGMENT_SHADER, POINT_VERTEX_SHADER, SCENE_VERTEX_SHADER, STREAK_FRAGMENT_SHADER, STREAK_VERTEX_SHADER, VOLUME_FRAGMENT_SHADER, VOLUME_VERTEX_SHADER } from "./shaders";
import { computeSceneCommands } from "../scene/commands";
import type { DrawCmd } from "../scene/commands";
import { HEAD_RANGE, SCENE_VERTICES, bankPart, partCenter } from "../scene/meshes";
import { PLENUM } from "../mesh/plumbing";
import { RPM_MAX, createFrame } from "../sim/clock";
import type { EngineFrame } from "../sim/clock";

const ENGINE_FRONT_X = -850; // the front of it all: the intercoolers' fans

/* =========================================================
   ENGINE 3D RENDERER

   One canvas, one depth buffer, for the whole engine: crankshaft, rods,
   pistons, the head, the valve train, the timing drive and the flywheel occlude
   each other by their real depth. Per frame: the floor, the opaque parts
   (a few uniforms each), then what is see-through, far to near: the charge and
   flame in every cylinder, the glass sleeves, the sprites.
   ========================================================= */

// The turns themselves, each at its place in ORIENT
const ORIENTATIONS: Float32Array[] = [];

ORIENTATIONS[ORIENT.NONE] = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
ORIENTATIONS[ORIENT.BANK_A] = BANKS[0].m;
ORIENTATIONS[ORIENT.BANK_B] = BANKS[1].m;
ORIENTATIONS[ORIENT.MODULE_A] = MODULES[0].r;
ORIENTATIONS[ORIENT.MODULE_B] = MODULES[1].r;
ORIENTATIONS[ORIENT.TURBO_A] = composeTurn(MODULES[0].r, TURBO_ORIENT);
ORIENTATIONS[ORIENT.TURBO_B] = composeTurn(MODULES[1].r, TURBO_ORIENT);
ORIENTATIONS[ORIENT.IC_NEG] = icTurn(-1);
ORIENTATIONS[ORIENT.IC_POS] = icTurn(1);
ORIENTATIONS[ORIENT.STARTER] = new Float32Array([-1, 0, 0, 0, 0.7071, -0.7071, 0, 0.7071, 0.7071]);
ORIENTATIONS[ORIENT.STARTER_AXIAL] = composeTurn(ORIENTATIONS[ORIENT.STARTER], [0, 0, 1, 1, 0, 0, 0, 1, 0]);
ORIENTATIONS[ORIENT.STARTER_FORK] = composeTurn(ORIENTATIONS[ORIENT.STARTER], [0, 1, 0, -1, 0, 0, 0, 0, 1]);

let exhaustHeat = 0; // the exhaust's heat for its colour, 0 to 1, from the rpm

export type EngineRenderer = {
  draw: (frame: EngineFrame, still?: boolean) => void;
  resize: () => void;
  // World point -> pixel in the canvas's CSS box (and whether it is in front)
  project: (x: number, y: number, z: number, margin?: number) => [number, number, boolean];
  // The stage's size in CSS pixels
  frame: () => [number, number];
  dispose: () => void;
};

// A unit cylinder: (cos, t, sin) with t from the top (0) to the bottom (1);
// first the sides, then the two caps
const CYL_SEGMENTS = 56;

const UNIT_CYLINDER = (() => {
  const v: number[] = [];

  for (let k = 0; k < CYL_SEGMENTS; k++) {
    const a = (k / CYL_SEGMENTS) * TAU;
    const b = ((k + 1) / CYL_SEGMENTS) * TAU;
    const ax = Math.cos(a);
    const az = Math.sin(a);
    const bx = Math.cos(b);
    const bz = Math.sin(b);

    v.push(ax, 0, az, bx, 0, bz, bx, 1, bz);
    v.push(ax, 0, az, bx, 1, bz, ax, 1, az);
  }

  const sides = v.length / 3;

  for (const t of [0, 1]) {
    for (let k = 0; k < CYL_SEGMENTS; k++) {
      const a = (k / CYL_SEGMENTS) * TAU;
      const b = ((k + 1) / CYL_SEGMENTS) * TAU;

      v.push(0, t, 0, Math.cos(a), t, Math.sin(a), Math.cos(b), t, Math.sin(b));
    }
  }

  return { data: new Float32Array(v), sides, total: v.length / 3 };
})();

export function createEngineRenderer(
  canvas: HTMLCanvasElement,
  camera: CameraController
): EngineRenderer {
  const options = {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  };

  // WebGL 2 when there is one (needed for the motion blur), else WebGL 1
  const context2 = canvas.getContext("webgl2", options) as WebGL2RenderingContext | null;
  const context = (context2 ??
    canvas.getContext("webgl", options)) as WebGLRenderingContext | null;

  if (!context) {
    throw new Error("WebGL is unavailable.");
  }

  const gl = context;

  const programs: WebGLProgram[] = [];
  const buffers: WebGLBuffer[] = [];

  const releaseResources = () => {
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const program of programs) gl.deleteProgram(program);

    buffers.length = 0;
    programs.length = 0;
  };

  try {
    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);

      if (!shader) {
        throw new Error("Could not create a shader.");
      }

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) || "Shader compile failure.";

        gl.deleteShader(shader);
        throw new Error(log);
      }

      return shader;
    };

    const link = (vertex: string, fragment: string): WebGLProgram => {
      const program = gl.createProgram();

      if (!program) {
        throw new Error("Could not create a program.");
      }

      programs.push(program);

      const vs = compile(gl.VERTEX_SHADER, vertex);
      const fs = compile(gl.FRAGMENT_SHADER, fragment);

      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.detachShader(program, vs);
      gl.detachShader(program, fs);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Program link failure.");
      }

      return program;
    };

    const makeBuffer = (data: Float32Array | number, usage: number): WebGLBuffer => {
      const buffer = gl.createBuffer();

      if (!buffer) {
        throw new Error("Could not create a buffer.");
      }

      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      if (typeof data === "number") gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      else gl.bufferData(gl.ARRAY_BUFFER, data, usage);

      return buffer;
    };

    const sceneProgram = link(SCENE_VERTEX_SHADER, PART_FRAGMENT_SHADER);
    const floorProgram = link(FLOOR_VERTEX_SHADER, FLOOR_FRAGMENT_SHADER);
    const volumeProgram = link(VOLUME_VERTEX_SHADER, VOLUME_FRAGMENT_SHADER);
    const glassProgram = link(GLASS_VERTEX_SHADER, GLASS_FRAGMENT_SHADER);
    const pointProgram = link(POINT_VERTEX_SHADER, POINT_FRAGMENT_SHADER);
    const streakProgram = link(STREAK_VERTEX_SHADER, STREAK_FRAGMENT_SHADER);
    const fogProgram = link(FOG_VERTEX_SHADER, FOG_FRAGMENT_SHADER);

    const uniformCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

    const uniform = (program: WebGLProgram, name: string) => {
      let cache = uniformCache.get(program);

      if (!cache) {
        cache = new Map();
        uniformCache.set(program, cache);
      }

      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));

      return cache.get(name) ?? null;
    };

    const attrib = (program: WebGLProgram, name: string) => {
      const location = gl.getAttribLocation(program, name);

      if (location < 0) {
        throw new Error(`Missing attribute: ${name}`);
      }

      return location;
    };

    const MAX_ATTRIBS = 8;
    type AttribSpec = { location: number; size: number; stride: number; offset: number };

    // Switch on exactly these vertex arrays, and no others
    const bindAttribs = (specs: AttribSpec[]) => {
      for (let i = 0; i < MAX_ATTRIBS; i++) gl.disableVertexAttribArray(i);

      for (const s of specs) {
        gl.enableVertexAttribArray(s.location);
        gl.vertexAttribPointer(s.location, s.size, gl.FLOAT, false, s.stride, s.offset);
      }
    };

    // ---- buffers ----
    const sceneBuffer = makeBuffer(SCENE_VERTICES, gl.STATIC_DRAW);
    const sceneStride = FW_STRIDE * Float32Array.BYTES_PER_ELEMENT;
    const sceneAttribs: AttribSpec[] = [
      ["aPosition", 3, 0],
      ["aNormal", 3, 3],
      ["aColor", 3, 6],
      ["aShine", 1, 9],
      ["aOcc", 1, 10],
      ["aPattern", 1, 11],
      ["aWet", 1, 12],
    ].map(([name, size, offset]) => ({
      location: attrib(sceneProgram, name as string),
      size: size as number,
      stride: sceneStride,
      offset: (offset as number) * Float32Array.BYTES_PER_ELEMENT,
    }));

    const half = 4000;
    const floorBuffer = makeBuffer(
      new Float32Array([
        -half, FLOOR_Y, -half, half, FLOOR_Y, -half,
        -half, FLOOR_Y, half, half, FLOOR_Y, half,
      ]),
      gl.STATIC_DRAW
    );
    const floorAttribs: AttribSpec[] = [
      { location: attrib(floorProgram, "aPos"), size: 3, stride: 0, offset: 0 },
    ];

    const cylinderBuffer = makeBuffer(UNIT_CYLINDER.data, gl.STATIC_DRAW);
    const volumeAttribs: AttribSpec[] = [
      { location: attrib(volumeProgram, "aUnit"), size: 3, stride: 0, offset: 0 },
    ];
    const glassAttribs: AttribSpec[] = [
      { location: attrib(glassProgram, "aUnit"), size: 3, stride: 0, offset: 0 },
    ];

    const mistBuffer = makeBuffer(MIST.max * 8 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    const oilBuffer = makeBuffer(OIL.max * 8 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    const glowBuffer = makeBuffer(GLOW.max * 8 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    const pointStride = 8 * Float32Array.BYTES_PER_ELEMENT;
    const pointAttribs: AttribSpec[] = [
      { location: attrib(pointProgram, "aPos"), size: 3, stride: pointStride, offset: 0 },
      { location: attrib(pointProgram, "aSize"), size: 1, stride: pointStride, offset: 3 * Float32Array.BYTES_PER_ELEMENT },
      { location: attrib(pointProgram, "aCol"), size: 4, stride: pointStride, offset: 4 * Float32Array.BYTES_PER_ELEMENT },
    ];

    const fogStride = FOG_FLOATS * Float32Array.BYTES_PER_ELEMENT;
    const fogBuffers = FOG_GROUPS.map((g) => makeBuffer(g.mesh.data, gl.STATIC_DRAW));
    const fogAttribs: AttribSpec[] = [
      ["aPos", 3, 0],
      ["aDir", 3, 3],
      ["aInfo", 4, 6],
    ].map(([name, size, offset]) => ({
      location: attrib(fogProgram, name as string),
      size: size as number,
      stride: fogStride,
      offset: (offset as number) * Float32Array.BYTES_PER_ELEMENT,
    }));

    const streakBuffer = makeBuffer(STREAKS.max * 6 * STREAK_FLOATS * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    const streakStride = STREAK_FLOATS * Float32Array.BYTES_PER_ELEMENT;
    const streakAttribs: AttribSpec[] = [
      ["aA", 3, 0],
      ["aB", 3, 3],
      ["aCorner", 2, 6],
      ["aCol", 4, 8],
      ["aWidth", 1, 12],
    ].map(([name, size, offset]) => ({
      location: attrib(streakProgram, name as string),
      size: size as number,
      stride: streakStride,
      offset: (offset as number) * Float32Array.BYTES_PER_ELEMENT,
    }));

    const blur = context2 ? createMotionBlur(context2, [BACKGROUND[0], BACKGROUND[1], BACKGROUND[2]]) : null;

    let disposed = false;
    let lastFrame: EngineFrame | null = null;
    let cssWidth = canvas.clientWidth || 1000;
    let cssHeight = canvas.clientHeight || 640;

    let viewProj = viewProjection(camera.view, 1.5);
    let eye: FwVec3 = camera.view.eye;
    const headOpacity = (bank: Bank) => (SCENE_OPTIONS.seeThrough ? headOpacityAt(eye, bank) : 1);
    let focus = camera.view.distance;

    let lastDraw = 0;
    let frameInterval = 16.7;
    let blurCap = 12; // sub-frames allowed; adapts to how fast frames arrive
    let blurHeld = 1; // the sub-frames in use, held a while before they come down
    let blurDrop = 0;
    let renderScale = 1; // share of the screen's resolution; adapts as well
    let scaleCooldown = 0;
    let fastFrames = 0;

    // Far to near: what is see-through is drawn in that order
    const order = CYLS.map((_, i) => i);
    const distanceOf = CYLS.map(() => 0);

    // The floor fades out as the camera goes down through it, to look at the
    // engine from underneath
    const drawFloor = () => {
      const t = Math.min(1, Math.max(0, (eye[1] - (FLOOR_Y - 60)) / 230));
      const fade = 1 - t * t * (3 - 2 * t);

      if (fade < 0.01) return;

      gl.enable(gl.BLEND);
      gl.depthMask(false);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(floorProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, floorBuffer);
      bindAttribs(floorAttribs);

      gl.uniformMatrix4fv(uniform(floorProgram, "uViewProj"), false, viewProj);
      gl.uniform3f(uniform(floorProgram, "uEye"), eye[0], eye[1], eye[2]);
      gl.uniform3f(uniform(floorProgram, "uBackground"), BACKGROUND[0], BACKGROUND[1], BACKGROUND[2]);
      gl.uniform4f(
        uniform(floorProgram, "uFootprint"),
        (ENGINE_FRONT_X + FLYWHEEL_WORLD_X + 40) / 2,
        (FLYWHEEL_WORLD_X + 40 - ENGINE_FRONT_X) / 2 + 30,
        420,
        FLOOR_Y
      );

      gl.uniform1f(uniform(floorProgram, "uFade"), fade);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.depthMask(true);
      gl.disable(gl.BLEND);
    };

    // The scene program's per-frame uniforms, and how opaque what follows is
    const prepareParts = (opacity: number, rim = 0, tint: FwVec3 = RIM_STEEL) => {
      gl.useProgram(sceneProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffer);
      bindAttribs(sceneAttribs);

      gl.uniformMatrix4fv(uniform(sceneProgram, "uViewProj"), false, viewProj);
      gl.uniform3f(uniform(sceneProgram, "uEye"), eye[0], eye[1], eye[2]);
      gl.uniform1f(uniform(sceneProgram, "uFocus"), focus);
      gl.uniform3f(uniform(sceneProgram, "uKey"), LIGHT_KEY[0], LIGHT_KEY[1], LIGHT_KEY[2]);
      gl.uniform3f(uniform(sceneProgram, "uFill"), LIGHT_FILL[0], LIGHT_FILL[1], LIGHT_FILL[2]);
      gl.uniform3f(uniform(sceneProgram, "uKick"), LIGHT_KICK[0], LIGHT_KICK[1], LIGHT_KICK[2]);
      gl.uniform1f(uniform(sceneProgram, "uOpacity"), opacity);
      gl.uniform1f(uniform(sceneProgram, "uRim"), rim);
      gl.uniform3f(uniform(sceneProgram, "uRimTint"), tint[0], tint[1], tint[2]);
      // the exhaust's and the charge's contours are wider, and lit more strongly
      gl.uniform1f(uniform(sceneProgram, "uRimWide"), tint === RIM_EXHAUST || tint === RIM_CHARGE ? 1 : 0);
      gl.uniform1f(uniform(sceneProgram, "uFrontOnly"), 0);
    };

    // The see-through castings: each head's deck and shell, in its bank's place
    // `phase`: "back", the see-through castings drawn as glass all through (the heads, the decks, the starter's yoke), or
    // "front", the pipes and casings drawn as one clean skin each, hiding one another as solid pieces would
    const drawGhosts = (phase: "back" | "front") => {
      // A see-through part in the engine's own frame, at `o`, with the turn `orient`
      const ghostNow = (range: [number, number], see: number, orient: number, o: FwVec3, rim = 0, tint: FwVec3 = RIM_STEEL, front = false) => {
        // with the see-through switch off, every part is drawn solid: a plain engine
        const opacity = SCENE_OPTIONS.seeThrough ? see : 1;

        prepareParts(opacity, rim, tint);
        gl.uniform2f(uniform(sceneProgram, "uSpin"), 1, 0);
        gl.uniform3f(uniform(sceneProgram, "uOffset"), o[0], o[1], o[2]);
        gl.uniform1f(uniform(sceneProgram, "uScaleY"), 1);
        gl.uniformMatrix3fv(uniform(sceneProgram, "uOrient"), false, ORIENTATIONS[orient]);
        // a see-through pipe or casing shows only its skin toward the eye: one clean layer of glass, its far wall and its
        // inside left out, so that it reads as one whole piece however the engine is turned
        gl.uniform1f(uniform(sceneProgram, "uFrontOnly"), front && opacity < 0.995 ? 1 : 0);

        // a see-through part made solid (the head seen from above) writes its depth, as a solid part does, so that its own
        // inner faces and what is under it are hidden by its outer skin
        const solid = opacity >= 0.995;

        if (solid) gl.depthMask(true);

        gl.drawArrays(gl.TRIANGLES, range[0], range[1]);

        if (solid) gl.depthMask(false);
      };

      // The see-through parts are gathered first, and drawn far to near from the eye (each by its middle), so that a part
      // behind another is never laid over it
      const queue: Array<{ d: number; draw: () => void; front: boolean }> = [];
      const ghost = (range: [number, number], see: number, orient: number, o: FwVec3, rim = 0, tint: FwVec3 = RIM_STEEL, front = false) => {
        const c = partCenter(range);
        const M = ORIENTATIONS[orient];
        const w: FwVec3 = [
          M[0] * c[0] + M[3] * c[1] + M[6] * c[2] + o[0],
          M[1] * c[0] + M[4] * c[1] + M[7] * c[2] + o[1],
          M[2] * c[0] + M[5] * c[1] + M[8] * c[2] + o[2],
        ];

        const layered = front && SCENE_OPTIONS.seeThrough && see < 0.995;

        queue.push({ d: Math.hypot(w[0] - eye[0], w[1] - eye[1], w[2] - eye[2]), front: layered, draw: () => ghostNow(range, see, orient, o, rim, tint, front) });
      };

      // A see-through part of a bank, built in the bank's own frame
      const ghostInBank = (bank: Bank, range: [number, number], opacity: number, rim = 0, tint: FwVec3 = RIM_STEEL, front = false) =>
        ghost(range, opacity, bank.orient, [bank.dx, 0, 0], rim, tint, front);

      // the block's walls, first: dark grey, sand-cast, see-through, behind what is drawn over them
      // the block's walls: only on the plain, solid engine; see-through, they are left out, so that the workings show bare
      if (!SCENE_OPTIONS.seeThrough) ghost(HEAD_RANGE.block, 1, 0, [0, 0, 0], BLOCK_RIM);
      // the starter's housings' upper half: on the plain, solid engine, the starter whole and closed; see-through, it is cut
      if (!SCENE_OPTIONS.seeThrough) ghost(HEAD_RANGE.starterShell, 1, ORIENT.STARTER, ST_AT);
      // and its yoke, all round: see-through on the cut starter, so that the windings all round the stator show
      ghost(HEAD_RANGE.starterYoke, STARTER_YOKE_OPACITY, ORIENT.STARTER, ST_AT, 0.25);

      for (const bank of BANKS) {
        ghostInBank(bank, HEAD_RANGE.intakePipes, PIPE_OPACITY, PIPE_RIM, RIM_CHARGE, true);
        // (the stubs out of the exhaust ports go with the headers: solid engine only)
        if (!SCENE_OPTIONS.seeThrough) ghostInBank(bank, HEAD_RANGE.exhaustStubs, HOT_PIPE_OPACITY, PIPE_RIM, RIM_CHARGE, true);
        ghostInBank(bank, bankPart(bank, "deckSlab"), DECK_OPACITY);
        ghostInBank(bank, bankPart(bank, "headShell"), headOpacity(bank), 0.22);
        // the timing cover over its drive: only on the plain, solid engine; see-through, the drive shows bare
        if (!SCENE_OPTIONS.seeThrough) ghost(HEAD_RANGE.timingCover, 1, bank.orient, [DRIVE_DX, 0, 0], 0.3); // where both banks' drives stand
        // the fittings on the cover's top (plug caps, oil filler cap, the plates): only on the plain, solid engine; see-through,
        // they are left off, so that the workings show from above
        if (!SCENE_OPTIONS.seeThrough) ghostInBank(bank, bankPart(bank, "headTop"), 1);
        // the engraved lettering, last, and not see-through: it is cut through the shell, so that the shell does not veil it
        // (when the head is solid, seen from above, the lettering is cut into its top: drawn over it, not hidden by it)
        const headSolid = headOpacity(bank) >= 0.995;

        // pulled a little toward the eye in depth, so that it shows on the head's face, but stays hidden behind anything
        // else in front of the head, from any side
        if (headSolid) {
          // just deep enough to bring the engraving's floor (a few units under the cover's face) in front of the face:
          // a depth step of a few units at the head's distance from the eye
          const hc = bankPoint(bank, 235 + bank.dx, -440, 0);
          const dist = Math.max(200, Math.hypot(eye[0] - hc[0], eye[1] - hc[1], eye[2] - hc[2]));

          gl.enable(gl.POLYGON_OFFSET_FILL);
          gl.polygonOffset(0, -((CAM_NEAR_DEPTH * 7) / (dist * dist)) * 16777216);
        }

        // (the signature and the firing order: on the solid engine only, taken away on the see-through one)
        if (!SCENE_OPTIONS.seeThrough && phase === "back") ghostNow(bankPart(bank, "headText"), 1, bank.orient, [bank.dx, 0, 0]);

        if (headSolid) gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      // the signature cut into the plenum's lid, on the solid engine (the plenum is taken away on the see-through one):
      // pulled toward the eye as the heads' lettering is, so that its floor shows on the lid's face
      if (!SCENE_OPTIONS.seeThrough && phase === "back") {
        const lc: FwVec3 = [(PLENUM.xf + PLENUM.xr) / 2, PLENUM.yLid - 60, 0];
        const dist = Math.max(200, Math.hypot(eye[0] - lc[0], eye[1] - lc[1], eye[2] - lc[2]));

        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(0, -((CAM_NEAR_DEPTH * 7) / (dist * dist)) * 16777216);
        ghostNow(HEAD_RANGE.lidText, 1, 0, [0, 0, 0]);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      // The turbocharger module (one, in the V) and the runners, in the engine's own frame
      for (const m of MODULES) {
        ghost(HEAD_RANGE.turboIntakePipe, INTAKE_DUCT_OPACITY, m.orientModule, modulePoint(m, [0, 0, 0]), PIPE_RIM, RIM_CHARGE, true);
        // (the exhaust's collector under the turbine: with the headers, solid engine only)
        if (!SCENE_OPTIONS.seeThrough) ghost(HEAD_RANGE.collector, HOT_PIPE_OPACITY, m.orientModule, modulePoint(m, [0, 0, 0]), PIPE_RIM, RIM_CHARGE, true);
        ghost(HEAD_RANGE.turboCasing, CASING_OPACITY, m.orientTurbo, modulePoint(m, TURBO_AT), 0, RIM_STEEL, true);
      }

      // the exhaust's runners, from the ports to the collectors: grey metal, as the intake's are
      // (each bank's front three and rear three apart: drawn far to near bank by bank, group by group)
      // (the exhaust's headers: on the solid engine only, taken away on the see-through one)
      if (!SCENE_OPTIONS.seeThrough) for (const r of [HEAD_RANGE.exhaustLogs, HEAD_RANGE.exhaustLogsR, HEAD_RANGE.exhaustLogsB, HEAD_RANGE.exhaustLogsBR]) ghost(r, HOT_PIPE_OPACITY, 0, [0, 0, 0], PIPE_RIM, RIM_CHARGE, true);
      // the collectors and the pipes on from them into the turbines: grey metal, as the intake's pipes are
      if (!SCENE_OPTIONS.seeThrough) for (const r of [HEAD_RANGE.turboFeed, HEAD_RANGE.turboFeedB]) ghost(r, HOT_PIPE_OPACITY, 0, [0, 0, 0], PIPE_RIM, RIM_CHARGE, true);
      // (the silencers and their tails are solid now: drawn with the parts)

      // the charge pipes, in the engine's own frame
      for (const r of [HEAD_RANGE.chargePipes, HEAD_RANGE.chargePipesB]) ghost(r, HOT_CHARGE_OPACITY, 0, [0, 0, 0], PIPE_RIM, RIM_CHARGE, true); // as the cooled pipes: polished aluminium, see-through
      // the dry sump's tanks, pumps and lines: dark metal, the oil seen moving in them
      for (const r of [HEAD_RANGE.drySumpShell, HEAD_RANGE.drySumpShellB]) ghost(r, SUMP_OPACITY, 0, [0, 0, 0], PIPE_RIM, RIM_CHARGE, true);
      // the cooled charge's, more metal than glass
      for (const r of [HEAD_RANGE.coolPipes, HEAD_RANGE.coolPipesB]) ghost(r, COOL_PIPE_OPACITY, 0, [0, 0, 0], PIPE_RIM, RIM_CHARGE, true);

      queue.sort((a, b) => b.d - a.d);

      if (phase === "back") {
        for (const q of queue) if (!q.front) q.draw();

        return;
      }

      // The pipes and casings, far to near, each in two strokes: first its skin toward the eye into the depth only, then
      // its colour where that skin is the nearest. So a pipe hides the part of another pipe that is behind it, and the
      // part of itself that is behind (where a pipe crosses over itself or its neighbours in its group), as solid pipes
      // do; and it stays see-through to all that was drawn before it: the engine, the gas and the oil moving inside
      for (const q of queue) {
        if (!q.front) continue;

        // (the depth stroke is pushed a hair back, so that the colour stroke, the same skin, always passes over it: on
        // some graphics cards the two strokes' depths differ in their last bits, and the skin would flicker)
        gl.colorMask(false, false, false, false);
        gl.depthMask(true);
        gl.depthFunc(gl.LESS);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1, 4);
        q.draw();
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.colorMask(true, true, true, true);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);
        q.draw();
      }

      gl.depthFunc(gl.LESS);
    };

    const drawParts = (cmds: DrawCmd[]) => {
      prepareParts(1);

      const spinUniform = uniform(sceneProgram, "uSpin");
      const offsetUniform = uniform(sceneProgram, "uOffset");
      const scaleUniform = uniform(sceneProgram, "uScaleY");
      const orientUniform = uniform(sceneProgram, "uOrient");
      let orient = 0;

      gl.uniformMatrix3fv(orientUniform, false, ORIENTATIONS[0]);

      for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];

        if (cmd.orient !== orient) {
          orient = cmd.orient;
          gl.uniformMatrix3fv(orientUniform, false, ORIENTATIONS[orient]);
        }

        gl.uniform2f(spinUniform, cmd.spin[0], cmd.spin[1]);
        gl.uniform3f(offsetUniform, cmd.offset[0], cmd.offset[1], cmd.offset[2]);
        gl.uniform1f(scaleUniform, cmd.scaleY);
        gl.drawArrays(gl.TRIANGLES, cmd.range[0], cmd.range[1]);
      }
    };

    const sortCylinders = () => {
      for (let i = 0; i < CYLS.length; i++) {
        const cy = CYLS[i];
        const w = bankPoint(cy.bank, cy.x, VT.ySeat + LINER_H / 2, 0);

        distanceOf[i] = Math.hypot(eye[0] - w[0], eye[1] - w[1], eye[2] - w[2]);
        order[i] = i;
      }

      order.sort((a, b) => distanceOf[b] - distanceOf[a]);
    };

    const drawCharge = () => {
      gl.useProgram(volumeProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer);
      bindAttribs(volumeAttribs);

      gl.uniformMatrix4fv(uniform(volumeProgram, "uViewProj"), false, viewProj);
      gl.uniform3f(uniform(volumeProgram, "uEye"), eye[0], eye[1], eye[2]);
      gl.uniform1f(uniform(volumeProgram, "uRadius"), BORE_R - 0.6);

      for (const i of order) {
        const fx = CYLINDER_FX[i];

        if (fx.bottom - fx.top < 0.5 || (fx.density < 0.005 && fx.flameR <= 0)) continue;

        gl.uniformMatrix3fv(uniform(volumeProgram, "uBank"), false, CYLS[i].bank.m);
        gl.uniformMatrix3fv(uniform(volumeProgram, "uBankInv"), false, CYLS[i].bank.mInv);
        gl.uniform2f(uniform(volumeProgram, "uAxis"), CYLS[i].x, 0);
        gl.uniform1f(uniform(volumeProgram, "uTop"), fx.top);
        gl.uniform1f(uniform(volumeProgram, "uBottom"), fx.bottom);
        gl.uniform3f(uniform(volumeProgram, "uGasColor"), fx.gas[0], fx.gas[1], fx.gas[2]);
        gl.uniform1f(uniform(volumeProgram, "uGasSigma"), 0.0048 * fx.density);
        gl.uniform3f(uniform(volumeProgram, "uFlameC"), fx.flameC[0], fx.flameC[1], fx.flameC[2]);
        gl.uniform1f(uniform(volumeProgram, "uFlameR"), fx.flameR);
        gl.uniform1f(uniform(volumeProgram, "uFlameK"), fx.flameK);

        gl.drawArrays(gl.TRIANGLES, 0, UNIT_CYLINDER.total);
      }
    };

    const drawGlass = () => {
      gl.useProgram(glassProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer);
      bindAttribs(glassAttribs);

      gl.uniformMatrix4fv(uniform(glassProgram, "uViewProj"), false, viewProj);
      gl.uniform3f(uniform(glassProgram, "uEye"), eye[0], eye[1], eye[2]);
      gl.uniform3f(uniform(glassProgram, "uKey"), LIGHT_KEY[0], LIGHT_KEY[1], LIGHT_KEY[2]);
      gl.uniform1f(uniform(glassProgram, "uTop"), VT.ySeat);
      gl.uniform1f(uniform(glassProgram, "uOilTime"), OIL_CLOCK.t);

      for (const i of order) {
        gl.uniformMatrix3fv(uniform(glassProgram, "uBank"), false, CYLS[i].bank.m);
        gl.uniform2f(uniform(glassProgram, "uAxis"), CYLS[i].x, 0);
        gl.uniform1f(uniform(glassProgram, "uGlow"), CYLINDER_FX[i].glow);

        // The bore: a glass tube of the piston's own size, its far side seen through its near side
        gl.uniform1f(uniform(glassProgram, "uBottom"), VT.ySeat + LINER_H);
        gl.uniform1f(uniform(glassProgram, "uWall"), 0);
        gl.uniform1f(uniform(glassProgram, "uRadius"), BORE_R);
        gl.uniform1f(uniform(glassProgram, "uSide"), -1);
        gl.drawArrays(gl.TRIANGLES, 0, UNIT_CYLINDER.sides);
        gl.uniform1f(uniform(glassProgram, "uSide"), 1);
        gl.drawArrays(gl.TRIANGLES, 0, UNIT_CYLINDER.sides);

        // The liner's wall round it: faint, a cool grey, stopping short of the bore's foot
        gl.uniform1f(uniform(glassProgram, "uBottom"), VT.ySeat + LINER_WALL_H);
        gl.uniform1f(uniform(glassProgram, "uWall"), 1);
        gl.uniform1f(uniform(glassProgram, "uRadius"), LINER_OUTER_R);
        gl.drawArrays(gl.TRIANGLES, 0, UNIT_CYLINDER.sides);

        // The oil on the bore's wall: the rings scrape it all off, so that above the piston the wall is clean; only just
        // under the skirt is there a short wet band, thrown up from the crank, with the bead the oil ring scrapes down at
        // its top, fading out below and running down in drips.
        const wrist = CYLINDER_FX[i].bottom + 40;

        gl.uniform1f(uniform(glassProgram, "uWall"), 0);
        gl.uniform1f(uniform(glassProgram, "uOil"), 1);
        gl.uniform1f(uniform(glassProgram, "uRadius"), BORE_R - 0.4);

        for (const [top, bottom, fresh] of [[wrist + 25, Math.min(wrist + 25 + OIL_BAND, VT.ySeat + LINER_H), 1]]) {
          if (bottom - top < 1) continue;

          gl.uniform1f(uniform(glassProgram, "uTop"), top);
          gl.uniform1f(uniform(glassProgram, "uBottom"), bottom);
          gl.uniform1f(uniform(glassProgram, "uOilFresh"), fresh);
          gl.drawArrays(gl.TRIANGLES, 0, UNIT_CYLINDER.sides);
        }

        gl.uniform1f(uniform(glassProgram, "uOil"), 0);
        gl.uniform1f(uniform(glassProgram, "uTop"), VT.ySeat);
      }
    };

    // The air: solid see-through bodies, sky-blue metal for the air going in,
    // light-orange metal for the gas going out. The same density for both.
    const drawFog = () => {
      if (!FOG_STATE.on) return;

      gl.useProgram(fogProgram);
      gl.uniformMatrix4fv(uniform(fogProgram, "uViewProj"), false, viewProj);
      gl.uniform3f(uniform(fogProgram, "uEye"), eye[0], eye[1], eye[2]);
      gl.uniform3f(uniform(fogProgram, "uKey"), LIGHT_KEY[0], LIGHT_KEY[1], LIGHT_KEY[2]);
      gl.uniform1f(uniform(fogProgram, "uDensity"), FOG_DENSITY);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const phaseU = uniform(fogProgram, "uPhase");
      const driveU = uniform(fogProgram, "uDrive");
      const baseU = uniform(fogProgram, "uBase");
      const toneU = uniform(fogProgram, "uTone");
      const glowU = uniform(fogProgram, "uGlow");
      const accentU = uniform(fogProgram, "uAccent");
      const richU = uniform(fogProgram, "uRich");
      const smoothU = uniform(fogProgram, "uSmooth");

      for (let i = 0; i < FOG_GROUPS.length; i++) {
        const g = FOG_GROUPS[i];
        const pal = FOG_PALETTE[g.kind];
        // the exhaust's gas past the collectors (kind 4) goes from a pale, smoky colour to its orange with the speed
        const heat = g.kind === 4 ? exhaustHeat : 1;
        const base = mix3(EXHAUST_PALE, pal.base, heat);
        const tone = mix3(EXHAUST_PALE, pal.tone, heat);
        const accent = mix3(EXHAUST_PALE, pal.accent, heat);

        gl.bindBuffer(gl.ARRAY_BUFFER, fogBuffers[i]);
        bindAttribs(fogAttribs);
        gl.uniform1f(phaseU, g.phase);
        gl.uniform1f(driveU, g.drive * (pal.alpha ?? 1));
        gl.uniform1f(glowU, pal.glow);
        gl.uniform3f(accentU, accent[0], accent[1], accent[2]);
        gl.uniform1f(richU, pal.rich);
        // the pipes' air and gas flow on smoothly; only the ports' and the jets', driven by the valves, pulse
        gl.uniform1f(smoothU, g.cyl < 0 ? 1 : 0);
        gl.uniform3f(baseU, base[0], base[1], base[2]);
        gl.uniform3f(toneU, tone[0], tone[1], tone[2]);
        gl.drawArrays(gl.TRIANGLES, 0, g.mesh.count);
      }
    };

    const drawSprites = () => {
      drawFog();

      // The air: thin streaks
      if (STREAKS.n > 0) {
        gl.useProgram(streakProgram);
        gl.uniformMatrix4fv(uniform(streakProgram, "uViewProj"), false, viewProj);
        gl.uniform2f(uniform(streakProgram, "uViewport"), canvas.width, canvas.height);
        gl.uniform1f(uniform(streakProgram, "uPxPerUnit"), (canvas.height * 0.5) / Math.tan(CAM_FOV / 2));
        gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, STREAKS.data.subarray(0, STREAKS.n * 6 * STREAK_FLOATS));
        bindAttribs(streakAttribs);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, STREAKS.n * 6);
      }

      gl.useProgram(pointProgram);

      gl.uniformMatrix4fv(uniform(pointProgram, "uViewProj"), false, viewProj);
      gl.uniform1f(
        uniform(pointProgram, "uPxPerUnit"),
        (canvas.height * 0.5) / Math.tan(CAM_FOV / 2)
      );

      // Fuel mist: it dims what is behind it
      if (MIST.n > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mistBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, MIST.data.subarray(0, MIST.n * 8));
        bindAttribs(pointAttribs);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.POINTS, 0, MIST.n);
      }

      // Oil: drops thrown off the crank and dripping from the bores' feet
      if (OIL.n > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, oilBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, OIL.data.subarray(0, OIL.n * 8));
        bindAttribs(pointAttribs);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.POINTS, 0, OIL.n);
      }

      // Spark and first glow: they add light
      if (GLOW.n > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, glowBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, GLOW.data.subarray(0, GLOW.n * 8));
        bindAttribs(pointAttribs);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.drawArrays(gl.POINTS, 0, GLOW.n);
      }
    };

    const drawScene = (frame: EngineFrame) => {
      const cmds = computeSceneCommands(frame);

      computeEffects(frame);
      sortCylinders();

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);

      drawFloor();
      drawParts(cmds);

      // See-through things, far to near, over the opaque scene: they are hidden
      // by what is in front of them, but do not hide what is behind
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      // The deck's ghost casting is above the chambers: seen from above, the
      // chambers are behind it (drawn first), seen from below, in front of it
      const fromAbove = eye[1] < VT.ySeat - 11;

      if (fromAbove) {
        drawCharge();
        drawGlass();
        drawGhosts("back");
      } else {
        drawGhosts("back");
        drawCharge();
        drawGlass();
      }

      // the gas, the mist and the oil, before the pipes they move in: seen through them
      drawSprites();
      drawGhosts("front");

      gl.depthMask(true);
      gl.disable(gl.BLEND);
    };

    // `still` redraws a frame without any motion (after a resize or a camera move)
    const draw = (frame: EngineFrame, still = false) => {
      if (disposed || gl.isContextLost()) return;

      lastFrame = frame;
      // how hot the exhaust past the collectors shows: pale below 2000 rpm, turning orange as the speed rises above it
      exhaustHeat = smooth01(((frame.rpm ?? 0) - 2000) / (RPM_MAX - 2000));

      // If frames arrive late, spend fewer sub-frames, so the blur never costs
      // the smoothness it is there to give
      const now = performance.now();

      if (lastDraw > 0 && !still && now - lastDraw < 250) {
        frameInterval += (now - lastDraw - frameInterval) * 0.1;

        if (frameInterval > 26) blurCap = Math.max(2, blurCap - 0.25);
        else if (frameInterval < 19) blurCap = Math.min(12, blurCap + 0.1);

        // A slow machine gets a lower resolution rather than a stuttering
        // picture; it climbs back when there is time to spare
        scaleCooldown = Math.max(0, scaleCooldown - 1);
        fastFrames = frameInterval < 18 ? fastFrames + 1 : 0;

        if (scaleCooldown === 0) {
          if (frameInterval > 24 && renderScale > 0.5) {
            renderScale = Math.max(0.5, renderScale - 0.1);
            scaleCooldown = 90;
            resize();
          } else if (fastFrames > 240 && renderScale < 1) {
            renderScale = Math.min(1, renderScale + 0.05);
            scaleCooldown = 90;
            fastFrames = 0;
            resize();
          }
        }
      }

      lastDraw = now;

      const view = camera.view;

      eye = view.eye;
      focus = view.distance;
      viewProj = viewProjection(view, canvas.width / Math.max(1, canvas.height));

      // The turbo's wheels turn much faster than the crank: they set the blur
      // when they are the faster of the two
      const turboDeg = (frame.turboStep * 180) / Math.PI;
      // and so do the fans, so that fast they show as a blur, not as blades standing still (the wagon-wheel effect)
      const fanDeg = (frame.fanStep * 180) / Math.PI;
      const want = blur && !still ? blurSteps(Math.max(frame.step * 720, turboDeg * 0.5, fanDeg), blurCap) : 1;
      // (the sub-frames go up at once, but come down only after a while: near a threshold, as the engine picks up or
      // slows, they would otherwise switch back and forth every frame, and the picture with them)
      if (want >= blurHeld || still) {
        blurHeld = want;
        blurDrop = 0;
      } else if (++blurDrop > 20) {
        blurHeld = want;
        blurDrop = 0;
      }

      const steps = blur && !still ? Math.min(blurHeld, Math.floor(blurCap)) : 1;

      if (steps <= 1) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(BACKGROUND[0], BACKGROUND[1], BACKGROUND[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawScene(frame);

        return;
      }

      // Sub-frames spread over the time this frame covers
      blur!.render(
        steps,
        canvas.width,
        canvas.height,
        () => gl.enable(gl.DEPTH_TEST),
        (sub) => {
          const phase = normalizeCycle(frame.t - frame.step * (1 - (sub + 0.5) / steps));

          const subFrame = createFrame(phase);

          subFrame.turboSpeed = frame.turboSpeed;
          subFrame.turboAngle = frame.turboAngle - frame.turboStep * (1 - (sub + 0.5) / steps);
          subFrame.gasT = normalizeCycle(frame.gasT - (frame.gasStep ?? 0) * (1 - (sub + 0.5) / steps)); // the gas keeps its own place, and its own pace
          subFrame.fanAngle = frame.fanAngle - frame.fanStep * (1 - (sub + 0.5) / steps);
          drawScene(subFrame);
        }
      );
    };

    const resize = () => {
      if (disposed || gl.isContextLost()) return;

      // Layout is read only on initialization/resizing.
      const bounds = canvas.getBoundingClientRect();

      cssWidth = bounds.width || cssWidth;
      cssHeight = bounds.height || cssHeight;

      // One canvas pixel per screen pixel (while the machine keeps up): no
      // resampling, so thin moving parts such as the chain cannot shimmer
      const pixelRatio =
        Math.min(2, Math.max(1, window.devicePixelRatio || 1)) * renderScale;

      const width = Math.max(1, Math.round(cssWidth * pixelRatio));
      const height = Math.max(1, Math.round(cssHeight * pixelRatio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      if (lastFrame) draw(lastFrame, true);
    };

    // Where a point of the scene falls on the stage, in CSS pixels, and whether it is in the frame:
    // in front of the camera and at least `margin` pixels inside the stage's edges
    const project = (x: number, y: number, z: number, margin = 0): [number, number, boolean] => {
      const m = viewProj;
      const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
      const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
      const cw = m[3] * x + m[7] * y + m[11] * z + m[15];

      if (cw <= 0) return [0, 0, false];

      const px = (cx / cw * 0.5 + 0.5) * cssWidth;
      const py = (1 - (cy / cw * 0.5 + 0.5)) * cssHeight;

      return [px, py, px >= margin && px <= cssWidth - margin && py >= margin && py <= cssHeight - margin];
    };

    return {
      draw,
      resize,
      project,
      frame: (): [number, number] => [cssWidth, cssHeight],
      dispose: () => {
        if (disposed) return;
        disposed = true;
        blur?.dispose();
        releaseResources();
      },
    };
  } catch (error) {
    releaseResources();
    throw error;
  }
}
