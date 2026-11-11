// Round dials, as on a car's dashboard: a polished steel bezel, bevelled in two rings, round a dark, finely turned face
// under glass; a ring of segments over 270°, from 0 at the bottom left to the most at the bottom right, with fine ticks
// inside it, and a needle that glows, in the air filters' light metallic red. The ring lights up to the needle: a light,
// matte metallic green while the value is low, yellow from 70% of the most, a strong orange from 88%. The page sets the values many times a
// second, so a dial is moved by hand, not by React: `set` on the handle it puts in `api`.

import { useEffect, useRef } from "react";
import { AMBIENT_F, RPM_MAX, useEngineClock } from "../sim/clock";

export type GaugeHandle = { set: (value: number | null) => void }; // null: the dial is off, its needle at rest
type Api = { current: GaugeHandle | null };


type Zone = "blue" | "mint" | "green" | "gold" | "red" | "hot";

type GaugeProps = {
  api: Api; // where the dial puts its handle
  label: string;
  unit: string;
  max: number;
  ticks: number[]; // the values the face numbers
  tickText?: (v: number) => string;
  digits?: number; // the readout's decimals
  warn?: number; // where gold starts, a share of the most
  redline?: number; // where red starts, a share of the most
  min?: number; // the scale's start (0 unless given)
  zones?: Array<[number, Zone]>; // instead of warn and redline: each colour up to a value on the scale
  note?: string; // a word under the top of the scale: "× 1000"
  // the needle's and the readout's colour from the value (a thermometer's: blue cold, green at its best, yellow, red);
  // without it, the needle is the air filters' red and the readout white
  tint?: (v: number) => Tint;
};

type Tint = "cold" | "good" | "warm" | "hot";

// a tint's readout colour, and its needle's gradient (light along its top edge, its body, its dark edge) and glow
const TINTS: Record<Tint, { text: string; light: string; body: string; dark: string; glow: string; edge: string }> = {
  cold: { text: "#9fd4ff", light: "#d8eeff", body: "#4aa8ee", dark: "#1c5f9e", glow: "#3d9cf0", edge: "#123f6b" },
  good: { text: "#5fe08a", light: "#d4f7de", body: "#2fbf5c", dark: "#14753a", glow: "#2ad866", edge: "#0b4a24" },
  warm: { text: "#ffd84a", light: "#fff4b8", body: "#f2c01c", dark: "#a07c06", glow: "#ffd020", edge: "#6b5204" },
  hot: { text: "#ff5a4e", light: "#ffb3a8", body: "#ff3b2a", dark: "#b3141c", glow: "#ff3b2a", edge: "#7a0d12" },
};

const SWEEP = 270; // degrees, from 0 to the most
const START = 135; // where 0 is: the bottom left, clockwise from the right
const SEGMENTS = 36;
const R = 41; // the ring of segments' outer radius, in the dial's 100 × 100
const DIM = "0.13"; // an unlit segment's opacity

// rounded, so that the server's page and the browser's write the very same numbers (else React finds them different)
const round = (v: number) => Math.round(v * 1000) / 1000;

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;

  return [round(50 + r * Math.cos(a)), round(50 + r * Math.sin(a))];
};

// A segment of the ring: an arc of a thick band, from a to b degrees
const band = (a: number, b: number, r0: number, r1: number) => {
  const [x0, y0] = polar(a, r1);
  const [x1, y1] = polar(b, r1);
  const [x2, y2] = polar(b, r0);
  const [x3, y3] = polar(a, r0);

  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
};

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export function Gauge({ api, label, unit, max, ticks, tickText = (v) => `${v}`, digits = 0, warn = 0.7, redline = 0.88, note, min = 0, zones, tint }: GaugeProps) {
  const span = max - min;
  // the gradients' ids, from the dial's label: the same on the server and in the browser, and different for each dial
  const id = `gauge-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const segs = useRef<Array<SVGPathElement | null>>([]);
  const needle = useRef<SVGGElement | null>(null);
  const needleShadow = useRef<SVGGElement | null>(null);
  const readout = useRef<SVGTextElement | null>(null);
  const lit = useRef(-1);
  const tinted = useRef<Tint | "none" | null>(null);
  const stops = useRef<Array<SVGStopElement | null>>([]);
  const needleGlow = useRef<SVGPathElement | null>(null);
  const needleEdges = useRef<Array<SVGElement | null>>([]);

  useEffect(() => {
    api.current = {
      set(raw: number | null) {
        // off (null): the needle down at the scale's start, nothing read, nothing lit; a value that is not a number reads 0
        const off = raw === null;
        const value = off ? min : Number.isFinite(raw) ? raw : 0;
        const share = Math.max(0, Math.min(1, (value - min) / span));
        const n = Math.round(share * SEGMENTS);

        const turn = `rotate(${(START + share * SWEEP).toFixed(2)} 50 50)`;

        if (needle.current) needle.current.setAttribute("transform", turn);
        if (needleShadow.current) needleShadow.current.setAttribute("transform", turn);
        if (readout.current) readout.current.textContent = off ? "—" : value.toFixed(digits);

        // the needle's and the readout's colour, from the value, when the dial is tinted (off: as it rests, untinted)
        const t: Tint | "none" = tint && !off ? tint(value) : "none";

        if (t !== tinted.current) {
          tinted.current = t;
          const c = TINTS[t === "none" ? "hot" : t];

          readout.current?.setAttribute("fill", t === "none" ? "#ffffff" : c.text);
          [c.light, c.body, c.dark].forEach((col, k) => stops.current[k]?.setAttribute("stop-color", col));
          needleGlow.current?.setAttribute("fill", c.glow);
          needleEdges.current.forEach((el) => el?.setAttribute("stroke", c.edge));
        }

        if (n !== lit.current) {
          lit.current = n;
          segs.current.forEach((el, i) => el?.setAttribute("opacity", i < n ? "1" : DIM));
        }
      },
    };

    return () => {
      api.current = null;
    };
  }, [api, max, min, span, digits, tint]);

  const zone = (i: number) => {
    const s = (i + 0.5) / SEGMENTS;

    if (zones) return (zones.find(([to]) => s <= (to - min) / span) ?? zones[zones.length - 1])[1];

    return s >= redline ? "red" : s >= warn ? "gold" : "green";
  };

  const step = SWEEP / SEGMENTS;
  const minor = Array.from({ length: SEGMENTS * 2 + 1 }, (_, i) => START + (i * step) / 2); // a tick every half segment
  const g = (name: string) => `url(#${id}-${name})`;

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      aria-label={label}
      role="img"
    >
      <defs>
        {/* the bezel's outer ring: polished steel, bright at the top left, dark at the bottom right */}
        <linearGradient id={`${id}-steel`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#f4f7f9" />
          <stop offset="0.22" stopColor="#b9c4cc" />
          <stop offset="0.48" stopColor="#5b6770" />
          <stop offset="0.62" stopColor="#a8b5be" />
          <stop offset="0.85" stopColor="#3a434b" />
          <stop offset="1" stopColor="#1c2228" />
        </linearGradient>
        {/* its inner ring, turned the other way: the bevel */}
        <linearGradient id={`${id}-bevel`} x1="0.85" y1="1" x2="0.15" y2="0">
          <stop offset="0" stopColor="#e7edf1" />
          <stop offset="0.45" stopColor="#6d7a84" />
          <stop offset="1" stopColor="#20262c" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#1f2730" />
          <stop offset="0.7" stopColor="#0c1116" />
          <stop offset="1" stopColor="#040608" />
        </radialGradient>
        {/* the glass: a soft sheen over the top half */}
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* the zones: a light, matte metallic green; yellow near the top; at the most a strong orange, clear of the
            needle's (and the air filters') red */}
        {/* and for a thermometer: cold blue, a light mint while it warms, a true red when too hot */}
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b8e2ff" />
          <stop offset="0.5" stopColor="#4aa8ee" />
          <stop offset="1" stopColor="#1c5f9e" />
        </linearGradient>
        <linearGradient id={`${id}-mint`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2f8e8" />
          <stop offset="0.5" stopColor="#b2e6c2" />
          <stop offset="1" stopColor="#6fae86" />
        </linearGradient>
        <linearGradient id={`${id}-hot`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a9a" />
          <stop offset="0.5" stopColor="#e3262e" />
          <stop offset="1" stopColor="#8a0a12" />
        </linearGradient>
        <linearGradient id={`${id}-green`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c6e8cf" />
          <stop offset="0.5" stopColor="#86c29a" />
          <stop offset="1" stopColor="#4f8a63" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6b8" />
          <stop offset="0.5" stopColor="#f2d23c" />
          <stop offset="1" stopColor="#a8860f" />
        </linearGradient>
        <linearGradient id={`${id}-red`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd0a0" />
          <stop offset="0.5" stopColor="#ff8a1c" />
          <stop offset="1" stopColor="#b85200" />
        </linearGradient>
        {/* the needle: the light metallic red of the air filters, bright along its top edge */}
        <linearGradient id={`${id}-needle`} x1="0" y1="0" x2="0" y2="1">
          <stop ref={(el) => { stops.current[0] = el; }} offset="0" stopColor="#ffb3a8" />
          <stop ref={(el) => { stops.current[1] = el; }} offset="0.45" stopColor="#ff4e3a" />
          <stop ref={(el) => { stops.current[2] = el; }} offset="1" stopColor="#b3141c" />
        </linearGradient>
        <radialGradient id={`${id}-hub`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#a8b5be" />
          <stop offset="1" stopColor="#2a3138" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* its shadow on the panel; the bezel: polished steel with a crisp dark edge and a highlight along its top, then its
          bevel turned the other way, a bright lip, and the face sunk in it with a shadow along its edge */}
      <circle cx="50" cy="52.5" r="49.5" fill="#000" opacity="0.65" />
      <circle cx="50" cy="50" r="49.5" fill={g("steel")} stroke="#0a0d10" strokeWidth="0.8" />
      <path d="M14 30 A40.5 40.5 0 0 1 86 30" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" transform="translate(0 -4) scale(1 1)" />
      {/* the bezel's turning marks: fine rings, alternately bright and dark, and its knurled outer edge */}
      {Array.from({ length: 7 }, (_, i) => 46.3 + i * 0.45).map((r, i) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={i % 2 ? "#000" : "#fff"} strokeOpacity={i % 2 ? 0.18 : 0.22} strokeWidth="0.22" />
      ))}
      {Array.from({ length: 96 }, (_, i) => {
        const [x0, y0] = polar(i * 3.75, 48.9);
        const [x1, y1] = polar(i * 3.75, 49.6);

        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#0a0d10" strokeOpacity="0.55" strokeWidth="0.45" />;
      })}
      <circle cx="50" cy="50" r="46" fill={g("bevel")} />
      <circle cx="50" cy="50" r="44.4" fill="none" stroke="#f1f5f9" strokeOpacity="0.7" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="44" fill={g("face")} />
      <circle cx="50" cy="50" r="43.2" fill="none" stroke="#000" strokeOpacity="0.75" strokeWidth="1.6" />
      {/* the face's fine turning */}
      {[10, 14, 18, 22, 26, 30, 34].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="0.4" />
      ))}
      {/* the scale's outline, just outside the segments */}
      <path d={`M${polar(START, R + 1.2).join(" ")} A${R + 1.2} ${R + 1.2} 0 1 1 ${polar(START + SWEEP, R + 1.2).join(" ")}`} fill="none" stroke="#a8b5be" strokeOpacity="0.55" strokeWidth="0.5" />

      {/* the ring of segments */}
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <path
          key={i}
          ref={(el) => {
            segs.current[i] = el;
          }}
          d={band(START + i * step + 0.7, START + (i + 1) * step - 0.7, R - 4.5, R)}
          fill={g(zone(i))}
          opacity={DIM}
        />
      ))}

      {/* the ticks inside it: fine ones at each segment, long ones at the numbers */}
      {minor.map((deg, i) => {
        const [x0, y0] = polar(deg, R - 6);
        const [x1, y1] = polar(deg, R - 8);

        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#d5dde3" strokeOpacity={i % 2 ? 0.45 : 0.8} strokeWidth={i % 2 ? 0.4 : 0.6} />;
      })}
      {ticks.map((v) => {
        const deg = START + ((v - min) / span) * SWEEP;
        const [x0, y0] = polar(deg, R - 6);
        const [x1, y1] = polar(deg, R - 10.5);
        const [tx, ty] = polar(deg, R - 19.5);

        return (
          <g key={v}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#ffffff" strokeWidth="1.6" strokeLinecap="butt" />
            <text x={tx} y={ty} fill="#f1f5f9" fontSize="8.6" fontWeight="700" textAnchor="middle" dominantBaseline="central" fontFamily={FONT}>
              {tickText(v)}
            </text>
          </g>
        );
      })}

      {note && (
        <text x="50" y="36" fill="#9aa7b1" fontSize="5" fontWeight="600" textAnchor="middle" fontFamily={FONT}>
          {note}
        </text>
      )}
      <text x="50" y="64.5" fill="#a8b5be" fontSize="6.5" fontWeight="700" letterSpacing="1.4" textAnchor="middle" fontFamily={FONT}>
        {label}
      </text>
      <text
        ref={readout}
        x="50"
        y="78"
        fill="#ffffff"
        fontSize="12.5"
        fontWeight="700"
        textAnchor="middle"
        fontFamily={FONT}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {(0).toFixed(digits)}
      </text>
      <text x="50" y="86" fill="#9aa7b1" fontSize="5.5" fontWeight="600" textAnchor="middle" fontFamily={FONT}>
        {unit}
      </text>

      {/* the needle, pointing right before it is turned: a straight, square blade from behind the hub, then bevelled to a
          sharp point at the numbers; a red glow under it, and its steel hub */}
      {/* its shadow on the face, a little down and to the right whichever way it points */}
      <g transform="translate(0.9 1.6)" opacity="0.55">
        <g ref={needleShadow} transform={`rotate(${START} 50 50)`}>
          <path d="M43 48.6 L76 48.6 L86 50 L76 51.4 L43 51.4 Z" fill="#000" filter={`url(#${id}-glow)`} />
        </g>
      </g>
      <g ref={needle} transform={`rotate(${START} 50 50)`}>
        {/* the counterweight behind the hub */}
        <circle ref={(el) => { needleEdges.current[0] = el; }} cx="41.5" cy="50" r="2.6" fill={g("needle")} stroke="#7a0d12" strokeWidth="0.3" />
        <path ref={needleGlow} d="M43 48.3 L76 48.3 L86 50 L76 51.7 L43 51.7 Z" fill="#ff3b2a" filter={`url(#${id}-glow)`} opacity="0.6" />
        <path ref={(el) => { needleEdges.current[1] = el; }} d="M43 48.6 L76 48.6 L86 50 L76 51.4 L43 51.4 Z" fill={g("needle")} stroke="#7a0d12" strokeWidth="0.3" />
        <path d="M44 48.9 L76 48.9 L84 50 L44 50 Z" fill="#ffe1dc" opacity="0.45" />
      </g>
      <circle cx="50.4" cy="51" r="6" fill="#000" opacity="0.5" />
      <circle cx="50" cy="50" r="5.8" fill={g("hub")} stroke="#0b0e11" strokeWidth="0.7" />
      <circle cx="50" cy="50" r="3.4" fill="none" stroke="#1c2228" strokeOpacity="0.6" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="1.5" fill="#1c2228" />

      {/* the glass over it all */}
      <path d="M10 46 A40 40 0 0 1 90 46 Q50 34 10 46 Z" fill={g("glass")} />
      <path d="M19 26 A38 38 0 0 1 44 12" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// The three dials, side by side: the engine's temperature, its speed in the middle, the boost. They read the engine's
// clock themselves, every frame it publishes: the tachometer and the boost at once (the speed asked for, and the boost it
// calls for); the thermometer slowly, as the engine warms and cools. In °F from 110 to 290, its working heat of 200 at the
// top of the dial, in the middle: blue while cold, a light mint as it warms, green about 200 (to 240), yellow from 240, red
// from 280; its needle and its reading turn the same colours (green at its working heat). The boost and the temperature
// are illustrative. `size` is each one's width; `room`, the height the line they stand on gives them: bigger than that,
// they reach out over and under it, and the line keeps its height
const TEMP_MIN_F = 110; // the thermometer's scale starts here
const TEMP_MAX_F = 290; // and ends here: 200, its working heat, in the middle
const tempTint = (v: number): Tint => (v < 175 ? "cold" : v < 240 ? "good" : v < 280 ? "warm" : "hot");

export function Dials({ size, room }: { size: string; room?: string }) {
  const clock = useEngineClock();
  const temp = useRef<GaugeHandle | null>(null);
  const rpm = useRef<GaugeHandle | null>(null);
  const boost = useRef<GaugeHandle | null>(null);

  useEffect(() => {
    // the thermometer works only while the engine runs (from the starter on): then it shows the engine's temperature;
    // stopped, its needle sinks to the scale's start and it goes off. Its needle swings there and back smoothly, every frame
    let on = false;
    let wanted = TEMP_MIN_F;
    let shown = TEMP_MIN_F;
    let last = 0;
    let raf = 0;

    const unsubscribe = clock.subscribe((frame) => {
      rpm.current?.set(frame.dialRpm ?? frame.rpm);
      boost.current?.set(1.4 * Math.pow(frame.turboDial ?? 0, 1.6));
      on = frame.engineOn ?? false;
      wanted = on ? (frame.tempF ?? AMBIENT_F) : TEMP_MIN_F;
    });

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;

      last = now;
      shown += (wanted - shown) * (1 - Math.exp(-dt / 0.6));
      temp.current?.set(!on && shown < TEMP_MIN_F + 0.5 ? null : shown);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
    };
  }, [clock]);

  const box = { width: size, aspectRatio: "1", flex: "none" as const };

  return (
    <div
      role="group"
      aria-label="Dials"
      style={{ display: "flex", alignItems: "center", gap: 10, height: room, overflow: "visible", position: "relative", zIndex: 1 }}
    >
      <div style={box}>
        <Gauge
          api={temp}
          label="TEMP"
          unit="°F"
          min={TEMP_MIN_F}
          max={TEMP_MAX_F}
          ticks={[120, 160, 200, 240, 280]}
          tint={tempTint}
          zones={[
            [150, "blue"],
            [175, "mint"],
            [240, "green"],
            [280, "gold"],
            [TEMP_MAX_F, "hot"],
          ]}
        />
      </div>
      <div style={box}>
        <Gauge api={rpm} label="RPM" unit="rpm" note="× 1000" max={RPM_MAX} ticks={[0, 1000, 2000, 3000, 4000, 5000, 6000]} tickText={(v) => `${v / 1000}`} />
      </div>
      <div style={box}>
        <Gauge api={boost} label="BOOST" unit="bar" max={1.6} ticks={[0, 0.4, 0.8, 1.2, 1.6]} digits={2} />
      </div>
    </div>
  );
}
