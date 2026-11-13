// The orbiting camera, its views and the lights.

import { createContext, useContext } from "react";
import { cross3, dot3, normalize3 } from "../math/vec3";
import { FLYWHEEL_WORLD_X } from "../core/constants";
import type { FwVec3 } from "../mesh/builder";

/* =========================================================
   CAMERA

   A perspective camera orbiting the engine. It sits on a sphere round
   CAM_TARGET: `yaw` is its heading about the vertical axis, `pitch` its
   elevation. Dragging turns the engine, the wheel zooms, and a turntable can
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

export function createCameraController(options: CameraOptions) {
  const now: { yaw: number; pitch: number; zoom: number; shift: number; shiftY: number; target: FwVec3 } = {
    yaw: VIEW_PRESETS.default.yaw,
    pitch: VIEW_PRESETS.default.pitch,
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

  return {
    get view(): CameraView {
      return cameraView(now.yaw, now.pitch, now.zoom, now.target, now.shift * now.zoom, now.shiftY * now.zoom);
    },

    // Dragging: the engine follows the pointer
    orbit(dx: number, dy: number) {
      if (dx !== 0 || dy !== 0) show(null);
      goal.yaw -= dx * 0.35;
      goal.pitch = clamp(goal.pitch + dy * 0.3, -86, 86);
    },

    zoomBy(factor: number) {
      goal.zoom = clamp(goal.zoom * factor, 0.55, 7);
    },

    setView(name: ViewName) {
      const preset: ViewPreset = VIEW_PRESETS[name];
      // The short way round
      const turn = ((((preset.yaw - goal.yaw) % 360) + 540) % 360) - 180;
      const focus = preset.focus ?? CAM_TARGET;

      goal.yaw += turn;
      goal.pitch = preset.pitch;
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

    // Any view at all: from yaw and pitch (degrees), this close, at this point
    lookAt(focus: FwVec3, yaw: number, pitch: number, zoom: number) {
      goal.yaw = yaw;
      goal.pitch = clamp(pitch, -86, 86);
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
    // turntable turns. Reports whether anything moved.
    update(dt: number): boolean {
      if (auto && !dragging) goal.yaw += autoSpeed * dt;

      const k = 1 - Math.exp(-dt / 0.085);
      const dyaw = (goal.yaw - now.yaw) * k;
      const dpitch = (goal.pitch - now.pitch) * k;
      const dzoom = (goal.zoom - now.zoom) * k;
      const dshift = (goal.shift - now.shift) * k;
      const dshiftY = (goal.shiftY - now.shiftY) * k;

      now.yaw += dyaw;
      now.pitch += dpitch;
      now.zoom += dzoom;
      now.shift += dshift;
      now.shiftY += dshiftY;

      let moved = 0;

      for (let a = 0; a < 3; a++) {
        const d = (goal.target[a] - now.target[a]) * k;

        now.target[a] += d;
        moved += Math.abs(d);
      }

      // Keep the angles small
      if (now.yaw > 720 || now.yaw < -720) {
        const shift = Math.sign(now.yaw) * 360;

        now.yaw -= shift;
        goal.yaw -= shift;
      }

      return Math.abs(dyaw) + Math.abs(dpitch) + Math.abs(dzoom) * 100 + Math.abs(dshift) * 100 + Math.abs(dshiftY) * 100 + moved > 1e-4;
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
