// The orbiting camera, its views and the lights.

import { createContext, useContext } from "react";
import { cross3, dot3, normalize3 } from "../math/vec3";
import { FLYWHEEL_WORLD_X } from "../core/constants";
import type { FwVec3 } from "../mesh/builder";

/* =========================================================
   CAMERA

   A perspective camera orbiting the engine. It sits on a sphere round
   CAM_TARGET, turned any way at all (a quaternion); the views are given as a
   heading about the vertical axis (`yaw`) and an elevation (`pitch`). Dragging turns the engine, the wheel zooms, and a turntable can
   turn it by itself. The engine keeps running all the while.
   ========================================================= */

export const CAM_FOV = (24 * Math.PI) / 180;
const CAM_TARGET: FwVec3 = [200, -40, 0]; // the middle of the engine
export const CAM_BASE_DISTANCE = 3700;
const CAM_NEAR = 150;
const CAM_FAR = 9000;

// Heading is the direction the camera sits in, seen from above: 210 is the
// view from the timing-chain end with the chain nearest, 180 is a side view
type ViewPreset = { yaw: number; pitch: number; zoom?: number; focus?: FwVec3 };

const VIEW_PRESETS = {
  default: { yaw: 210, pitch: 24 },
  side: { yaw: 180, pitch: 3 },
  // the timing chains, close, from the chain end: both banks' drives and the crank's, centred
  front: { yaw: 270, pitch: 10, zoom: 2.4, focus: [-420, -170, 0] },
  // the flywheel, close, from its end
  rear: { yaw: 90, pitch: 8, zoom: 3, focus: [FLYWHEEL_WORLD_X, 0, 0] },
  // the starter motor, from below and outside, into its cut: the pinion at the ring gear, the lever, the armature, the brushes
  starter: { yaw: 150, pitch: -30, zoom: 4.6, focus: [FLYWHEEL_WORLD_X - 190, 120, -120] },
  top: { yaw: 180, pitch: 84 },
  below: { yaw: 210, pitch: -38 },
  bottom: { yaw: 180, pitch: -84 },
  // Close to the turbocharger, and to the intercooler
  // bank A's turbocharger, on the side of the engine half way along, with its headers coming down into it, from outside
  turbo: { yaw: 180, pitch: 6, zoom: 2.6, focus: [80, -20, -240] },
  // the two intercoolers, centred between them (their cores' middles at x -480, y 31, z ±326), squarely from the front
  intercooler: { yaw: 270, pitch: 4, zoom: 2.4, focus: [-480, 31, 0] },
} satisfies Record<string, ViewPreset>;

export type ViewName = keyof typeof VIEW_PRESETS;

// The views in the order the buttons show them, and a double click on the engine steps through them
export const VIEW_ORDER: ViewName[] = ["default", "side", "front", "rear", "top", "below", "bottom", "turbo", "intercooler", "starter"];

type CameraView = {
  eye: FwVec3;
  right: FwVec3; // screen right, in world coordinates
  down: FwVec3; // screen down
  back: FwVec3; // from the target toward the viewer
  distance: number;
  shift: number; // the picture moved sideways on the stage, as a share of half its width (+ to the right), zoom included
  shiftY: number; // and up or down, in the same measure (a share of half the stage's width, + up), zoom included
};

// How far one press of the stage's side buttons moves the engine, and how far it can go: in shares of half the stage's
// width at the plain view, and as much more as the view is magnified, so that a press moves the engine by the same share
// of its own size however close it is, and the whole of it can be brought into the middle. The up and down buttons move
// it by the same distance on the screen as the left and right ones
export const CAM_SHIFT_STEP = 0.04; // very fine steps, for fine adjustment: many presses to go far
const CAM_SHIFT_MAX = 1.5;

function cameraView(yawDeg: number, pitchDeg: number, zoom: number, target: FwVec3 = CAM_TARGET, shift = 0, shiftY = 0): CameraView {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const distance = CAM_BASE_DISTANCE / zoom;

  const back: FwVec3 = [
    Math.cos(pitch) * Math.sin(yaw),
    -Math.sin(pitch),
    Math.cos(pitch) * Math.cos(yaw),
  ];

  const eye: FwVec3 = [
    target[0] + back[0] * distance,
    target[1] + back[1] * distance,
    target[2] + back[2] * distance,
  ];

  // Screen down: the world's down (+Y), made perpendicular to the line of sight
  const k = back[1];
  const down = normalize3([-k * back[0], 1 - k * back[1], -k * back[2]]);
  const right = cross3(down, back);

  return { eye, right, down, back, distance, shift, shiftY };
}

// View and projection in one matrix, column-major, for the shaders. The
// engine's frame has Y down, so the screen's up is -down.
export function viewProjection(view: CameraView, aspect: number): Float32Array {
  const f = 1 / Math.tan(CAM_FOV / 2);
  const { eye, right, down, back } = view;
  const n = CAM_NEAR;
  const fa = CAM_FAR;
  const A = (fa + n) / (n - fa);
  const B = (2 * fa * n) / (n - fa);

  const r0 = [right[0], right[1], right[2], -dot3(right, eye)];
  const r1 = [-down[0], -down[1], -down[2], dot3(down, eye)];
  const r2 = [back[0], back[1], back[2], -dot3(back, eye)];

  // the shifts move the whole picture on the stage, the way a lens is shifted: the view itself does not change. The
  // vertical one is measured in half the stage's width too, so that a step up is as long as a step sideways
  const rows = [
    r0.map((v, i) => (v * f) / aspect - view.shift * r2[i]),
    r1.map((v, i) => v * f - view.shiftY * aspect * r2[i]),
    r2.map((v, i) => v * A + (i === 3 ? B : 0)),
    r2.map((v) => -v),
  ];

  const out = new Float32Array(16);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[col * 4 + row] = rows[row][col];
    }
  }

  return out;
}

type CameraOptions = { auto: boolean; autoSpeed: number };

// The centred view (the C button). How much of the stage's height the engine takes along each of the world's axes, for one
// step of zoom (measured, square on: about 1560 long, 940 high, 1290 across, the intercoolers' fans included; and a little
// more close up, where the near parts stand larger); the middle it is centred on; and the share of the stage it is to fill
const CENTER_FILL = { span: [0.795 / 0.8, 0.48 / 0.8, 0.56 / 0.8] as FwVec3, near: 1.06, target: [50, -150, 0] as FwVec3, fill: 0.75 };

/* ---- the camera's turn, a quaternion [w, x, y, z]: it carries the camera's own axes (right, down, back) into the
   world's. Kept this way, not as two angles, so that the engine turns round any way at all, whole turns over the top,
   underneath, and round its own length like a barrel, with no stop and no pole where it would flip ---- */
type Quat = [number, number, number, number];

const qMul = (a: Quat, b: Quat): Quat => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];

const qNorm = (q: Quat): Quat => {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;

  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
};

// a turn of `deg` degrees about a unit axis
const qAxis = (axis: FwVec3, deg: number): Quat => {
  const h = (deg * Math.PI) / 360;
  const s = Math.sin(h);

  return [Math.cos(h), axis[0] * s, axis[1] * s, axis[2] * s];
};

const qRotate = (q: Quat, v: FwVec3): FwVec3 => {
  const [w, x, y, z] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);

  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
};

// the camera's turn from its own three axes, as seen in the world (right, down, back: a right-handed set)
function quatFromAxes(r: FwVec3, d: FwVec3, b: FwVec3): Quat {
  // the matrix whose columns are right, down and back
  const m00 = r[0], m01 = d[0], m02 = b[0];
  const m10 = r[1], m11 = d[1], m12 = b[1];
  const m20 = r[2], m21 = d[2], m22 = b[2];
  const tr = m00 + m11 + m22;
  let q: Quat;

  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;

    q = [s / 4, (m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;

    q = [(m21 - m12) / s, s / 4, (m01 + m10) / s, (m02 + m20) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;

    q = [(m02 - m20) / s, (m01 + m10) / s, s / 4, (m12 + m21) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;

    q = [(m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, s / 4];
  }

  return qNorm(q);
}

// the camera's turn for a heading and an elevation (the views are given so)
function quatFromYawPitch(yawDeg: number, pitchDeg: number): Quat {
  const { right, down, back } = cameraView(yawDeg, pitchDeg, 1);

  return quatFromAxes(right, down, back);
}

// the world's axis nearest a direction, among those not taken: its index and its sign
function nearestAxis(v: FwVec3, skip = -1): [number, number] {
  let best = -1;

  for (let i = 0; i < 3; i++) if (i !== skip && (best < 0 || Math.abs(v[i]) > Math.abs(v[best]))) best = i;

  return [best, v[best] < 0 ? -1 : 1];
}

const axisVec = (i: number, sign: number): FwVec3 => [i === 0 ? sign : 0, i === 1 ? sign : 0, i === 2 ? sign : 0];

// part of the way from a to b, the short way round
function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let c = b;

  if (d < 0) {
    d = -d;
    c = [-b[0], -b[1], -b[2], -b[3]];
  }

  if (d > 0.9995) return qNorm([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t, a[3] + (c[3] - a[3]) * t]);

  const th = Math.acos(d);
  const sa = Math.sin((1 - t) * th) / Math.sin(th);
  const sb = Math.sin(t * th) / Math.sin(th);

  return qNorm([a[0] * sa + c[0] * sb, a[1] * sa + c[1] * sb, a[2] * sa + c[2] * sb, a[3] * sa + c[3] * sb]);
}

const X_AXIS: FwVec3 = [1, 0, 0];
const Y_AXIS: FwVec3 = [0, 1, 0];
const Z_AXIS: FwVec3 = [0, 0, 1];

function cameraViewQ(q: Quat, zoom: number, target: FwVec3, shift: number, shiftY: number): CameraView {
  const distance = CAM_BASE_DISTANCE / zoom;
  const right = qRotate(q, X_AXIS);
  const down = qRotate(q, Y_AXIS);
  const back = qRotate(q, Z_AXIS);
  const eye: FwVec3 = [target[0] + back[0] * distance, target[1] + back[1] * distance, target[2] + back[2] * distance];

  return { eye, right, down, back, distance, shift, shiftY };
}

export function createCameraController(options: CameraOptions) {
  const now: { q: Quat; zoom: number; shift: number; shiftY: number; target: FwVec3 } = {
    q: quatFromYawPitch(VIEW_PRESETS.default.yaw, VIEW_PRESETS.default.pitch),
    zoom: 1,
    shift: 0,
    shiftY: 0,
    target: [CAM_TARGET[0], CAM_TARGET[1], CAM_TARGET[2]],
  };
  const goal = { ...now, target: [CAM_TARGET[0], CAM_TARGET[1], CAM_TARGET[2]] as FwVec3 };
  let auto = options.auto;
  let autoSpeed = options.autoSpeed; // degrees per second, either way
  let dragging = false;
  const listeners = new Set<() => void>();
  // The view last chosen, while the engine is still seen from it (a drag or the turntable leaves it: null); and who wants
  // to know when that changes
  let shown: ViewName | null = "default";
  const shownListeners = new Set<(name: ViewName | null) => void>();
  const show = (name: ViewName | null) => {
    if (name === shown) return;
    shown = name;
    for (const listener of shownListeners) listener(name);
  };

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // a turn about one of the camera's own axes (the screen's): the engine turns that way on the screen, however it lies
  const turnLocal = (axis: FwVec3, deg: number) => {
    goal.q = qNorm(qMul(goal.q, qAxis(axis, deg)));
  };

  return {
    get view(): CameraView {
      return cameraViewQ(now.q, now.zoom, now.target, now.shift * now.zoom, now.shiftY * now.zoom);
    },

    // Dragging: the engine follows the pointer, about the screen's upright for a drag across, about its level for a drag
    // up or down, whole turns either way with no stop
    orbit(dx: number, dy: number) {
      if (dx !== 0 || dy !== 0) show(null);
      if (dx !== 0) turnLocal(Y_AXIS, -dx * 0.35);
      if (dy !== 0) turnLocal(X_AXIS, dy * 0.3);
    },

    // And round the line of sight, like a barrel rolling (Shift and a drag across, or two fingers twisted): + is clockwise
    // on the screen
    roll(deg: number) {
      if (deg === 0) return;
      show(null);
      turnLocal(Z_AXIS, -deg);
    },

    zoomBy(factor: number) {
      goal.zoom = clamp(goal.zoom * factor, 0.55, 7);
    },

    setView(name: ViewName) {
      const preset: ViewPreset = VIEW_PRESETS[name];
      const focus = preset.focus ?? CAM_TARGET;

      // (the easing goes the short way round)
      goal.q = quatFromYawPitch(preset.yaw, preset.pitch);
      goal.zoom = preset.zoom ?? 1;
      goal.target = [focus[0], focus[1], focus[2]];
      show(name);
    },

    // The view after the one shown, in the buttons' order, round again after the last; from no view at all, the first.
    // Looking at one view stops the turntable
    nextView() {
      const i = shown ? VIEW_ORDER.indexOf(shown) : -1;

      auto = false;
      this.setView(VIEW_ORDER[(i + 1) % VIEW_ORDER.length]);
    },

    get shownView() {
      return shown;
    },

    onShownView(listener: (name: ViewName | null) => void) {
      shownListeners.add(listener);

      return () => {
        shownListeners.delete(listener);
      };
    },

    // The engine moved sideways on the stage, a step at a time (-1 to the left, +1 to the right), whatever it is doing
    nudge(direction: number) {
      goal.shift = clamp(goal.shift + direction * CAM_SHIFT_STEP, -CAM_SHIFT_MAX, CAM_SHIFT_MAX);
    },

    // And up or down, the same way (+1 up, -1 down)
    nudgeY(direction: number) {
      goal.shiftY = clamp(goal.shiftY + direction * CAM_SHIFT_STEP, -CAM_SHIFT_MAX, CAM_SHIFT_MAX);
    },

    // Back to the middle of the stage, gliding there (the joystick's double tap): the view itself is kept
    recenter() {
      goal.shift = 0;
      goal.shiftY = 0;
    },

    // The Center button: the engine squared up to the nearest of its six faces, from where it is seen now. The line of
    // sight goes onto the world's axis nearest it (front, back, either side, above, below), the screen's upright onto the
    // nearest axis square to that (so the engine stands up, or lies a quarter or a half turn round, whichever it nearly
    // did): no tilt, no roll left. Then in the middle of the stage, as close as leaves it filling three quarters of it,
    // its height or, on a narrow stage, its width (`aspect`: the stage's width over its height). The turntable stops
    center(aspect: number) {
      const back = qRotate(goal.q, Z_AXIS);
      const down = qRotate(goal.q, Y_AXIS);
      const [bi, bs] = nearestAxis(back);
      const [di, ds] = nearestAxis(down, bi);
      const b = axisVec(bi, bs);
      const d = axisVec(di, ds);
      const r: FwVec3 = [d[1] * b[2] - d[2] * b[1], d[2] * b[0] - d[0] * b[2], d[0] * b[1] - d[1] * b[0]];
      const ri = r[0] !== 0 ? 0 : r[1] !== 0 ? 1 : 2;
      const tall = CENTER_FILL.span[di] * CENTER_FILL.near;
      const wide = CENTER_FILL.span[ri] * CENTER_FILL.near;
      const zoom = Math.min(CENTER_FILL.fill / tall, (CENTER_FILL.fill * aspect) / wide);

      auto = false;
      goal.q = quatFromAxes(r, d, b);
      goal.zoom = clamp(zoom, 0.55, 7);
      goal.shift = 0;
      goal.shiftY = 0;
      goal.target = [CENTER_FILL.target[0], CENTER_FILL.target[1], CENTER_FILL.target[2]];
      show(null);
    },

    // Any view at all: from yaw and pitch (degrees), this close, at this point
    lookAt(focus: FwVec3, yaw: number, pitch: number, zoom: number) {
      goal.q = quatFromYawPitch(yaw, pitch);
      goal.zoom = clamp(zoom, 0.55, 7);
      goal.target = [focus[0], focus[1], focus[2]];
    },

    setAuto(value: boolean) {
      auto = value;
      if (value) show(null); // turning, it is seen from no view in particular
    },

    setAutoSpeed(value: number) {
      autoSpeed = value;
    },

    setDragging(value: boolean) {
      dragging = value;
    },

    // Called every frame: the camera eases toward where it was sent, and the
    // turntable turns (about the engine's own upright). Reports whether anything moved.
    update(dt: number): boolean {
      if (auto && !dragging) goal.q = qNorm(qMul(qAxis(Y_AXIS, autoSpeed * dt), goal.q));

      const k = 1 - Math.exp(-dt / 0.085);
      const before = now.q;

      now.q = qSlerp(now.q, goal.q, k);

      const dq = 1 - Math.abs(before[0] * now.q[0] + before[1] * now.q[1] + before[2] * now.q[2] + before[3] * now.q[3]);
      const dzoom = (goal.zoom - now.zoom) * k;
      const dshift = (goal.shift - now.shift) * k;
      const dshiftY = (goal.shiftY - now.shiftY) * k;

      now.zoom += dzoom;
      now.shift += dshift;
      now.shiftY += dshiftY;

      let moved = 0;

      for (let a = 0; a < 3; a++) {
        const d = (goal.target[a] - now.target[a]) * k;

        now.target[a] += d;
        moved += Math.abs(d);
      }

      return dq * 1e6 + Math.abs(dzoom) * 100 + Math.abs(dshift) * 100 + Math.abs(dshiftY) * 100 + moved > 1e-4;
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    notify() {
      for (const listener of listeners) listener();
    },
  };
}

export type CameraController = ReturnType<typeof createCameraController>;

export const CameraContext = createContext<CameraController | null>(null);

export function useCamera(): CameraController {
  const camera = useContext(CameraContext);

  if (!camera) {
    throw new Error("The engine view requires CameraContext.");
  }

  return camera;
}

// The lights stand still in the engine's frame, placed so that from the
// default view they come from where they always came from: the key from above
// and right, a fill from the left, a kicker from behind on the right
const DEFAULT_VIEW = cameraView(VIEW_PRESETS.default.yaw, VIEW_PRESETS.default.pitch, 1);

function fromScreenDirection(x: number, y: number, z: number): FwVec3 {
  const { right, down, back } = DEFAULT_VIEW;

  return normalize3([
    right[0] * x + down[0] * y + back[0] * z,
    right[1] * x + down[1] * y + back[1] * z,
    right[2] * x + down[2] * y + back[2] * z,
  ]);
}

export const LIGHT_KEY = fromScreenDirection(0.35, -0.75, 0.55);
export const LIGHT_FILL = fromScreenDirection(-0.75, -0.1, 0.55);
export const LIGHT_KICK = fromScreenDirection(0.85, -0.2, -0.35);
