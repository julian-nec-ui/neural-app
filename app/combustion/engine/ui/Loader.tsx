// What the stage shows while the engine is being built, at the page's first load or a refresh: two pistons in a V,
// drawn in detailed machined metal (finned barrels, bolted heads with plugs and valves, ringed pistons, I-beam rods, a geared crank), going up and down inside their bores in turn over a turning crank, each bore working its four strokes: the
// charge burns over the piston at the top, the exhaust thins away, the fresh air comes in, all inside the bore, and under them "Loading" with its three dots
// coming one by one, 250 ms apart, then starting again. Building the engine keeps the page's script busy for seconds, so
// everything here moves by CSS alone, with transforms and opacity, which the browser animates even while the script
// works. When the engine is drawn the whole fades out.

const CSS = `
@keyframes ak-stroke { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(20px); } }
@keyframes ak-spin { to { transform: rotate(360deg); } }
@keyframes ak-dot2 { 0%, 24.9% { opacity: 0; } 25%, 100% { opacity: 1; } }
@keyframes ak-dot3 { 0%, 49.9% { opacity: 0; } 50%, 100% { opacity: 1; } }
.ak-piston { animation: ak-stroke 0.5s ease-in-out infinite; will-change: transform; }
.ak-crank { animation: ak-spin 0.5s linear infinite; will-change: transform; }
@keyframes ak-burn { 0% { opacity: 0; transform: scale(0.6); } 3% { opacity: 1; transform: scale(1.1); }
  14% { opacity: 0.55; transform: scale(1); } 22%, 100% { opacity: 0; transform: scale(0.9); } }
@keyframes ak-exhaust { 0%, 22% { opacity: 0; transform: translateY(18px) scaleY(1.4); } 30% { opacity: 0.75; }
  50% { opacity: 0; transform: translateY(0) scaleY(0.7); } 100% { opacity: 0; } }
@keyframes ak-intake { 0%, 52% { opacity: 0; transform: translateY(0); } 58% { opacity: 0.8; }
  78% { opacity: 0; transform: translateY(20px); } 100% { opacity: 0; transform: translateY(20px); } }
.ak-burn { animation: ak-burn 1s ease-out infinite; will-change: transform, opacity; }
.ak-exhaust { animation: ak-exhaust 1s ease-out infinite; will-change: transform, opacity; }
.ak-intake { animation: ak-intake 1s ease-in infinite; will-change: transform, opacity; }
@keyframes ak-sweep { from { transform: translateX(-100%); } to { transform: translateX(460%); } }
.ak-sweep { animation: ak-sweep 0.3s linear infinite; will-change: transform; }
.ak-dot2 { animation: ak-dot2 1s step-end infinite; will-change: opacity; }
.ak-dot3 { animation: ak-dot3 1s step-end infinite; will-change: opacity; }
`;

// the letters' and the dots' shading, white to grey from top to bottom: a glint above, a shade below
const SHADE = "linear-gradient(180deg, #ffffff 0%, #f2f6f8 40%, #c3ccd2 70%, #8e989f 100%)";
const DOT = {
  display: "inline-block",
  width: "0.24em",
  height: "0.24em",
  marginLeft: "0.2em",
  borderRadius: "0.05em",
  background: SHADE,
  boxShadow: "0 1px 0 rgba(255, 255, 255, 0.25) inset",
};

// The metals, as SVG gradients (each Bank and the crank carry their own ids, so that two banks never share one)
const STEEL_STOPS: Array<[number, string]> = [[0, "#3b444c"], [0.18, "#8a97a1"], [0.38, "#eef3f6"], [0.52, "#b9c4cc"], [0.78, "#5d6a74"], [1, "#2a3138"]];
const ALU_STOPS: Array<[number, string]> = [[0, "#4a545c"], [0.22, "#aab6bf"], [0.42, "#f6f9fb"], [0.6, "#c9d2d8"], [0.85, "#717d86"], [1, "#39424a"]];

function Stops({ stops }: { stops: Array<[number, string]> }) {
  return (
    <>
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </>
  );
}

// a hex bolt head seen from above, at (x, y), r across its flats' circle
function Bolt({ x, y, r, id }: { x: number; y: number; r: number; id: string }) {
  const pts = Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;

    return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.25} fill="#1a2026" />
      <polygon points={pts} fill={`url(#${id})`} stroke="#151a1f" strokeWidth="0.35" />
      <circle cx={x} cy={y} r={r * 0.38} fill="#2a3138" />
    </g>
  );
}

// One bank: a cylinder, leaning by `lean` degrees about the crank, with its piston and rod in it and its gases: the piston
// goes from the top (its crown just under the head) to the bottom, 20 lower, never out of the bore. The cylinder is a
// finned barrel, machined steel walls round a dark bore, its head bolted on at the top with its cam cover, two valves and
// the spark plug; the piston is forged aluminium, its crown, three ring grooves with their rings (the oil ring slotted),
// its pin boss and skirt; the rod a steel I-beam with its big end, cap and two bolts. The gases' cycle is two of the
// piston's strokes up and down (four strokes): burning at the top, the exhaust thinning away over the piston on the way
// back up, the fresh air following it down; they all stay in the bore. `delay` puts the bank half a turn behind the other
function Bank({ lean, delay, id }: { lean: number; delay: string; id: string }) {
  const g = (n: string) => `url(#${id}-${n})`;
  const fins = Array.from({ length: 12 }, (_, k) => 20 + k * 7);

  return (
    <div style={{ position: "absolute", left: "50%", bottom: 6, width: 0, height: 0, transform: `rotate(${lean}deg)` }}>
      {/* the cylinder: barrel, fins, bore and head; the bore's inside is left dark and clear, so that the gases show */}
      <svg
        viewBox="0 0 74 122"
        width="74"
        height="122"
        aria-hidden="true"
        style={{ position: "absolute", left: -37, bottom: 44, overflow: "visible", filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.7))" }}
      >
        <defs>
          <linearGradient id={`${id}-steel`} x1="0" x2="1" y1="0" y2="0"><Stops stops={STEEL_STOPS} /></linearGradient>
          <linearGradient id={`${id}-alu`} x1="0" x2="1" y1="0" y2="0"><Stops stops={ALU_STOPS} /></linearGradient>
          <linearGradient id={`${id}-head`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#dfe6eb" /><stop offset="0.45" stopColor="#8f9ca6" /><stop offset="1" stopColor="#3a434b" />
          </linearGradient>
          <linearGradient id={`${id}-bore`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#0b0f13" stopOpacity="0.95" /><stop offset="0.25" stopColor="#1d262e" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#33404a" stopOpacity="0.35" /><stop offset="0.75" stopColor="#1d262e" stopOpacity="0.55" />
            <stop offset="1" stopColor="#0b0f13" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={`${id}-cer`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#9aa3aa" /><stop offset="0.4" stopColor="#ffffff" /><stop offset="1" stopColor="#b8c0c6" />
          </linearGradient>
        </defs>

        {/* the barrel's cooling fins, each a thin blade standing out of its sides, lit along its top edge */}
        {fins.map((y) => (
          <g key={y}>
            {[0, 64].map((x) => (
              <g key={x}>
                <rect x={x} y={y} width="10" height="3.4" rx="1.2" fill={g("steel")} />
                <rect x={x + 0.5} y={y} width="9" height="0.7" rx="0.35" fill="#f4f7f9" opacity="0.6" />
                <rect x={x + 0.5} y={y + 2.8} width="9" height="0.6" fill="#0d1216" opacity="0.7" />
              </g>
            ))}
          </g>
        ))}

        {/* the barrel's walls, machined, and the bore inside them */}
        <rect x="8" y="16" width="6" height="106" fill={g("steel")} />
        <rect x="60" y="16" width="6" height="106" fill={g("steel")} />
        <rect x="12" y="16" width="50" height="106" fill={g("bore")} />
        <rect x="12" y="16" width="1.2" height="106" fill="#e9eef2" opacity="0.5" />
        <rect x="60.8" y="16" width="1.2" height="106" fill="#e9eef2" opacity="0.25" />
        {/* the honing's cross-hatch, faint, on the bore's wall */}
        {Array.from({ length: 9 }, (_, k) => (
          <path key={k} d={`M12 ${30 + k * 10} l50 -10 M12 ${20 + k * 10} l50 10`} stroke="#9fb0bd" strokeWidth="0.25" opacity="0.18" />
        ))}

        {/* the head gasket and the head's flange, bolted down at both ends */}
        <rect x="2" y="14" width="70" height="2.2" fill="#b0482c" />
        <rect x="0" y="6" width="74" height="8.4" rx="1.6" fill={g("head")} stroke="#20272d" strokeWidth="0.5" />
        <Bolt x={5.5} y={10.2} r={2.4} id={`${id}-steel`} />
        <Bolt x={68.5} y={10.2} r={2.4} id={`${id}-steel`} />
        {/* the cam cover over it, ribbed, and the two valves' springs seen through its slots */}
        <rect x="9" y="-3" width="56" height="10" rx="3" fill={g("alu")} stroke="#20272d" strokeWidth="0.5" />
        {[15, 21, 27, 47, 53, 59].map((x) => (
          <rect key={x} x={x} y="-1.6" width="2.2" height="7.2" rx="1" fill="#2a3138" opacity="0.75" />
        ))}
        {[22, 52].map((x) => (
          <g key={x}>
            <rect x={x - 3} y="7" width="6" height="7.5" fill="#1a2026" />
            <path d={`M${x - 2.6} 8 h5.2 M${x - 2.6} 9.6 h5.2 M${x - 2.6} 11.2 h5.2 M${x - 2.6} 12.8 h5.2`} stroke="#c9d2d8" strokeWidth="0.7" />
          </g>
        ))}
        {/* the spark plug, in the middle: its hex, its white ceramic and its terminal */}
        <rect x="33.6" y="-6" width="6.8" height="4" fill={g("steel")} stroke="#151a1f" strokeWidth="0.3" />
        <rect x="34.6" y="-14" width="4.8" height="8.4" rx="1.6" fill={g("cer")} />
        {[-12.5, -10.5, -8.5].map((y) => (
          <rect key={y} x="34.4" y={y} width="5.2" height="0.6" fill="#8d969d" />
        ))}
        <rect x="35.8" y="-17.4" width="2.4" height="3.6" rx="0.8" fill={g("steel")} />
      </svg>

      {/* the gases over the piston, inside the bore: the flame at the top, the exhaust, the fresh air */}
      <div
        className="ak-burn"
        style={{
          position: "absolute",
          left: -22,
          bottom: 135,
          width: 44,
          height: 14,
          borderRadius: "40%",
          background: "radial-gradient(ellipse at 50% 60%, #fff3c4 0%, #ffb347 35%, #ff5a1f 65%, rgba(255, 60, 20, 0) 100%)",
          boxShadow: "0 0 14px rgba(255, 120, 40, 0.8)",
          animationDelay: delay,
        }}
      />
      <div
        className="ak-exhaust"
        style={{
          position: "absolute",
          left: -22,
          bottom: 120,
          width: 44,
          height: 24,
          borderRadius: "40%",
          background: "radial-gradient(ellipse, rgba(203, 213, 225, 0.85), rgba(148, 163, 184, 0))",
          animationDelay: delay,
        }}
      />
      <div
        className="ak-intake"
        style={{
          position: "absolute",
          left: -17,
          bottom: 133,
          width: 34,
          height: 12,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(102, 204, 255, 0.9), rgba(87, 175, 219, 0))",
          animationDelay: delay,
        }}
      />

      {/* the piston and its rod, moving together */}
      <div className="ak-piston" style={{ position: "absolute", left: -24, bottom: 46, width: 48, height: 98, animationDelay: delay }}>
        <svg viewBox="0 0 48 98" width="48" height="98" aria-hidden="true" style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.65))" }}>
          <defs>
            <linearGradient id={`${id}-palu`} x1="0" x2="1" y1="0" y2="0"><Stops stops={ALU_STOPS} /></linearGradient>
            <linearGradient id={`${id}-pst`} x1="0" x2="1" y1="0" y2="0"><Stops stops={STEEL_STOPS} /></linearGradient>
            <linearGradient id={`${id}-crown`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fbfdfe" /><stop offset="1" stopColor="#9aa6af" />
            </linearGradient>
            <radialGradient id={`${id}-eye`} cx="0.4" cy="0.35" r="0.7">
              <stop offset="0" stopColor="#f2f6f8" /><stop offset="0.5" stopColor="#8d99a2" /><stop offset="1" stopColor="#2c343b" />
            </radialGradient>
          </defs>

          {/* the rod: an I-beam from the pin down to the big end, its flanges bright, its web dark */}
          <path d="M19.6 22 L28.4 22 L30.6 74 L17.4 74 Z" fill={`url(#${id}-pst)`} stroke="#151a1f" strokeWidth="0.4" />
          <path d="M22 25 L26 25 L27 71 L21 71 Z" fill="#232b32" />
          <path d="M22.6 26 L23.4 26 L22.4 70 L21.6 70 Z" fill="#7f8b94" opacity="0.6" />
          {/* the big end, its cap split across, and the cap's two bolts */}
          <circle cx="24" cy="82" r="11" fill={`url(#${id}-eye)`} stroke="#151a1f" strokeWidth="0.5" />
          <circle cx="24" cy="82" r="6.2" fill="#14191e" stroke="#c9a24a" strokeWidth="1.3" />
          <line x1="12.6" y1="82" x2="35.4" y2="82" stroke="#151a1f" strokeWidth="0.8" />
          <rect x="11.4" y="80" width="3.4" height="9" rx="0.6" fill={`url(#${id}-pst)`} stroke="#151a1f" strokeWidth="0.3" />
          <rect x="33.2" y="80" width="3.4" height="9" rx="0.6" fill={`url(#${id}-pst)`} stroke="#151a1f" strokeWidth="0.3" />

          {/* the piston: skirt, ring lands and crown, forged aluminium */}
          <path d="M4.6 14 L43.4 14 L42.6 29 Q24 31.5 5.4 29 Z" fill={`url(#${id}-palu)`} stroke="#20272d" strokeWidth="0.5" />
          <rect x="4" y="2.4" width="40" height="12.4" fill={`url(#${id}-palu)`} stroke="#20272d" strokeWidth="0.5" />
          <path d="M4 3.2 Q24 -0.8 44 3.2 L44 4.2 L4 4.2 Z" fill={`url(#${id}-crown)`} stroke="#20272d" strokeWidth="0.4" />
          {/* the valve reliefs in the crown, two shallow pockets */}
          <ellipse cx="15" cy="2.6" rx="5.4" ry="0.9" fill="#6f7b84" opacity="0.7" />
          <ellipse cx="33" cy="2.6" rx="5.4" ry="0.9" fill="#6f7b84" opacity="0.7" />
          {/* the three ring grooves and their rings: two compression rings, steel, and the oil ring, slotted */}
          {[6, 9].map((y) => (
            <g key={y}>
              <rect x="4" y={y} width="40" height="1.7" fill="#161b20" />
              <rect x="3.6" y={y + 0.35} width="40.8" height="1" fill={`url(#${id}-pst)`} />
            </g>
          ))}
          <rect x="4" y="12" width="40" height="2.2" fill="#161b20" />
          {Array.from({ length: 9 }, (_, k) => (
            <rect key={k} x={6.4 + k * 4.2} y="12.4" width="2.4" height="1.4" fill="#aab6bf" />
          ))}
          {/* the pin boss, and the wrist pin through it, its end bright */}
          <ellipse cx="24" cy="21" rx="7.2" ry="6.4" fill="#5d6a74" opacity="0.55" />
          <circle cx="24" cy="21" r="4.6" fill={`url(#${id}-eye)`} stroke="#151a1f" strokeWidth="0.5" />
          <circle cx="24" cy="21" r="2" fill="#20272d" />
          <circle cx="24" cy="21" r="5.6" fill="none" stroke="#151a1f" strokeWidth="0.5" strokeDasharray="1.2 1.2" opacity="0.7" />
          {/* a glint down the skirt */}
          <rect x="14" y="15" width="2" height="13" fill="#ffffff" opacity="0.28" />
        </svg>
      </div>
    </div>
  );
}

// The crank's wheel: a gear of 30 teeth, its rim, a machined groove, six lightening holes, the hub with its six bolts,
// and the red line from the middle to the rim that shows it turning
const GEAR_TEETH = 30;
const GEAR = (() => {
  const pts: string[] = [];

  for (let k = 0; k < GEAR_TEETH; k++) {
    const a = (k / GEAR_TEETH) * Math.PI * 2;
    const w = Math.PI / GEAR_TEETH;

    for (const [da, r] of [[-w * 0.62, 17.2], [-w * 0.36, 19.4], [w * 0.36, 19.4], [w * 0.62, 17.2]] as Array<[number, number]>) {
      pts.push(`${(20 + r * Math.sin(a + da)).toFixed(2)},${(20 - r * Math.cos(a + da)).toFixed(2)}`);
    }
  }

  return pts.join(" ");
})();

export function Loader({ hidden }: { hidden: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={hidden}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        background: "#000",
        opacity: hidden ? 0 : 1,
        visibility: hidden ? "hidden" : "visible",
        transition: "opacity 0.5s ease, visibility 0s linear 0.5s",
        pointerEvents: hidden ? "none" : "auto",
        zIndex: 5,
      }}
    >
      <style>{CSS}</style>

      {/* the V: two banks at 90° to each other over the crank, apart */}
      <div style={{ position: "relative", width: 340, height: 200 }}>
        <Bank lean={-45} delay="0s" id="ak-l" />
        <Bank lean={45} delay="-0.25s" id="ak-r" />
        {/* the crank: a toothed wheel, turning about its very centre, shaded the same all round (so that it looks round as it
            turns), with a red line from its middle to its rim */}
        <div
          className="ak-crank"
          style={{
            position: "absolute",
            left: "50%",
            bottom: 13, // up under the bores, just clear of them
            width: 56,
            height: 56,
            marginLeft: -28,
            filter: "drop-shadow(0 0 6px rgba(102, 204, 255, 0.25))",
          }}
        >
          <svg viewBox="0 0 40 40" width="56" height="56" aria-hidden="true" style={{ display: "block" }}>
            <defs>
              <radialGradient id="ak-gear" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0.5" stopColor="#f2f6f8" />
                <stop offset="0.8" stopColor="#a8b5be" />
                <stop offset="1" stopColor="#4d5962" />
              </radialGradient>
              <radialGradient id="ak-web" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#c9d2d8" />
                <stop offset="0.7" stopColor="#6f7b84" />
                <stop offset="1" stopColor="#39424a" />
              </radialGradient>
            </defs>
            <polygon points={GEAR} fill="url(#ak-gear)" stroke="#1c2228" strokeWidth="0.45" strokeLinejoin="round" />
            <circle cx="20" cy="20" r="16.2" fill="url(#ak-web)" stroke="#1c2228" strokeWidth="0.5" />
            <circle cx="20" cy="20" r="14.6" fill="none" stroke="#e6ebef" strokeWidth="0.35" opacity="0.6" />
            <circle cx="20" cy="20" r="13.6" fill="none" stroke="#1c2228" strokeWidth="0.5" />
            {Array.from({ length: 6 }, (_, k) => {
              const a = (k / 6) * Math.PI * 2 + Math.PI / 6;

              return <circle key={k} cx={20 + 9.6 * Math.cos(a)} cy={20 + 9.6 * Math.sin(a)} r="2.5" fill="#12171b" stroke="#a8b5be" strokeWidth="0.45" />;
            })}
            <circle cx="20" cy="20" r="6.4" fill="#2a3138" stroke="#c9d2d8" strokeWidth="0.7" />
            {Array.from({ length: 6 }, (_, k) => {
              const a = (k / 6) * Math.PI * 2;

              return <circle key={k} cx={20 + 4.4 * Math.cos(a)} cy={20 + 4.4 * Math.sin(a)} r="0.9" fill="#d5dde2" stroke="#12171b" strokeWidth="0.25" />;
            })}
            {/* a red line from the middle out to the rim, to show it turning */}
            <line x1="20" y1="17" x2="20" y2="2.6" stroke="#ff4a32" strokeWidth="1.9" strokeLinecap="round" />
            <circle cx="20" cy="20" r="2.2" fill="#e6ebef" stroke="#12171b" strokeWidth="0.4" />
          </svg>
        </div>
      </div>

      {/* "LOADING" and its three dots (small squares, their corners rounded), big, in a blue gradient from left to right,
          #66d6ff at one end to #3ab3df at the other, with a vertical stripe of metallic grey running across it all the
          time. The letters are drawn white to grey from their top to their
          bottom (a glint above, a shade below: a little relief) on black, and the colours laid over them multiply in: the
          stripe moves by a transform, which the browser animates even while the engine is being built */}
      <div
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "baseline",
          isolation: "isolate",
          background: "#000",
          padding: "2px 4px",
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          lineHeight: 1.1,
        }}
      >
        <span
          style={{
            color: "transparent",
            backgroundImage: SHADE,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Loading
        </span>
        <span style={DOT} />
        <span className="ak-dot2" style={DOT} />
        <span className="ak-dot3" style={DOT} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", mixBlendMode: "multiply", pointerEvents: "none" }}>
          {/* the blue, its two colours at the two ends */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #66d6ff 0%, #3ab3df 100%)" }} />
          {/* and a vertical stripe of metallic grey running across it, soft at its edges so that it blends into the blue */}
          <div
            className="ak-sweep"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "22%",
              background:
                "linear-gradient(90deg, rgba(200, 210, 218, 0) 0%, rgba(176, 188, 198, 0.85) 30%, #eef2f5 50%, rgba(176, 188, 198, 0.85) 70%, rgba(200, 210, 218, 0) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
