// Every material of the engine, in one place.

import { fwMat } from "./builder";

export const MAT_TURNED = fwMat([198, 207, 220], 205, 1);
export const MAT_FRICTION_A = fwMat([184, 192, 205], 180, 3);
export const MAT_FRICTION_B = fwMat([196, 190, 176], 175, 3); // faint heat tint
export const MAT_FRICTION_C = fwMat([176, 184, 204], 175, 3);
export const MAT_LAND = fwMat([170, 178, 192], 165, 1);
export const MAT_EDGE = fwMat([214, 222, 233], 200);
export const MAT_CAST = fwMat([132, 139, 152], 75, 2);
export const MAT_CAST_FACE = fwMat([156, 163, 177], 110, 2);
export const MAT_CAVITY = fwMat([70, 80, 96], 50, 2);
export const MAT_WALL = fwMat([112, 123, 140], 80, 2);
export const MAT_HUB = fwMat([150, 158, 173], 135, 2);
export const MAT_GEAR_BODY = fwMat([204, 22, 30], 205, 0, 0.95); // the ring gear's body: painted red
export const MAT_GEAR_ROOT = fwMat([72, 82, 98], 70);
export const MAT_TOOTH = fwMat([128, 142, 164], 125);
export const MAT_TOOTH_TIP = fwMat([208, 215, 226], 190);
export const MAT_TOOTH_END = fwMat([94, 106, 124], 85);
export const MAT_BOLT_HEAD = fwMat([212, 219, 229], 225);
export const MAT_BOLT_SIDE = fwMat([128, 138, 154], 120);
export const MAT_WASHER = fwMat([172, 180, 192], 195);
export const MAT_PIN = fwMat([226, 232, 240], 235);
export const MAT_BEARING = fwMat([210, 217, 228], 225, 1);
export const MAT_RACE = fwMat([46, 53, 66], 140);
export const MAT_HOLE = fwMat([8, 11, 18], 0);
export const MAT_THREAD = fwMat([44, 50, 62], 60);
export const MAT_SEAM = fwMat([16, 20, 28], 20);
export const MAT_TICK = fwMat([14, 18, 26], 0);
export const MAT_PAINT = fwMat([200, 20, 28], 215, 0, 1.0);

export const MAT_CT_FORGED = fwMat([98, 106, 122], 150, 2, 1.95); // crank webs, counterweights, flanges
export const MAT_CT_FACE = fwMat([160, 168, 183], 195, 1, 1.9);
export const MAT_CT_FACE_PLAIN = fwMat([160, 168, 183], 195, 0, 1.9);
export const MAT_CT_JOURNAL = fwMat([122, 130, 146], 208, 5, 1.0);
export const MAT_CT_TEMPER = fwMat([78, 92, 146], 200, 5, 1.0); // heat-treat colour at the shoulders
export const MAT_CT_GROOVE = fwMat([22, 26, 36], 30, 0, 0.9);
export const MAT_CT_SHELL = fwMat([168, 118, 66], 170, 0, 1.0);
export const MAT_CT_OIL = fwMat([74, 50, 22], 170, 5, 1.0); // amber oil creeping out from under a shell
export const MAT_CT_ROD = fwMat([104, 112, 128], 105, 2, 0.95);
export const MAT_CT_ROD_FACE = fwMat([128, 136, 152], 140, 3, 0.95);
export const MAT_CT_ALU = fwMat([226, 230, 237], 195, 1, 0.5); // the piston's crown and lands: machined aluminium, fine turned rings
export const MAT_CT_ALU_CAST = fwMat([196, 201, 210], 135, 2, 0.38); // its inside and bosses: cast aluminium, a grain
export const MAT_CT_RELIEF = fwMat([150, 155, 166], 26, 2, 0.1); // the valve reliefs: a matte, blasted finish
export const MAT_CT_ANODIZED = fwMat([62, 68, 82], 225, 4, 0.3);
export const MAT_CT_SKIRT = fwMat([216, 222, 230], 200, 6, 0.65); // its skirt: aluminium, polished smooth, faint striations, lit and shaded
export const MAT_CT_PLATE = fwMat([178, 186, 200], 190, 0, 0.3);
export const MAT_CT_RING = fwMat([222, 228, 237], 240, 4, 0.85);
export const MAT_CT_RING_MOLY = fwMat([58, 64, 76], 140, 4, 0.8);
export const MAT_CT_RING_DARK = fwMat([60, 66, 79], 115, 4, 0.8);
export const MAT_CT_EXPANDER = fwMat([98, 110, 132], 175, 0, 0.9);
export const MAT_CT_PIN = fwMat([60, 66, 80], 222, 5, 0.9);
export const MAT_CT_PIN_END = fwMat([204, 211, 223], 228, 1, 0.7);
export const MAT_CT_CLIP = fwMat([198, 206, 218], 205, 0, 0.6);
export const MAT_CT_CAP = fwMat([104, 112, 128], 110, 2, 1.9);
export const MAT_CT_CAP_FACE = fwMat([142, 150, 166], 160, 0, 1.85);
export const MAT_CT_EDGE = fwMat([214, 222, 233], 200, 0, 0.85);
export const MAT_CT_NUT_HEAD = fwMat([212, 219, 229], 225, 0, 0.6);
export const MAT_CT_NUT_SIDE = fwMat([128, 138, 154], 120, 0, 0.6);
export const MAT_CT_HOLE = fwMat([8, 11, 18], 20, 0, 0.8);
export const MAT_CT_SEAM = fwMat([16, 20, 28], 20, 0, 0.5);

export const MAT_VT_VALVE_IN = fwMat([190, 198, 212], 215, 4, 1.95); // stems: chrome, soaked
export const MAT_VT_VALVE_EX = fwMat([150, 146, 154], 205, 4, 1.95);
export const MAT_VT_HEAD_IN = fwMat([104, 111, 126], 190, 4, 1.0); // heads: dark steel
export const MAT_VT_HEAD_EX = fwMat([70, 68, 76], 180, 4, 1.0);
export const MAT_VT_FACE = fwMat([128, 134, 148], 205, 0, 0.8);
export const MAT_VT_RETAINER = fwMat([78, 84, 98], 165, 4, 0.9);
export const MAT_VT_KEEPER = fwMat([134, 110, 60], 140, 0, 0.8);
export const MAT_VT_BUCKET = fwMat([70, 76, 90], 175, 4, 1.9);
export const MAT_VT_SPRING = fwMat([154, 164, 184], 205, 0, 1.95);
export const MAT_VT_GUIDE = fwMat([154, 112, 72], 145, 4, 0.6);
export const MAT_VT_SEAT = fwMat([98, 106, 122], 115, 0, 0.6);
export const MAT_VT_CAM = fwMat([96, 104, 120], 150, 5, 1.9);
export const MAT_VT_JOURNAL = fwMat([150, 158, 174], 215, 5, 1.95);
export const MAT_VT_LOBE = fwMat([170, 178, 192], 215, 0, 1.95);
export const MAT_VT_CAM_FACE = fwMat([176, 184, 198], 200, 1, 0.9);
export const MAT_VT_TOWER = fwMat([94, 102, 118], 105, 2, 0.5);
export const MAT_VT_TOWER_FACE = fwMat([154, 162, 176], 155, 0, 0.6);
export const MAT_VT_SPROCKET = fwMat([90, 96, 110], 150, 3, 0.7);
export const MAT_VT_TOOTH = fwMat([198, 206, 218], 220, 0, 0.9);
export const MAT_VT_TOOTH_TIP = fwMat([58, 62, 72], 235, 1, 0.85); // the sprockets' tooth tips: dark, heavy, glossy steel
export const MAT_VT_PLATE = fwMat([170, 178, 192], 215, 0, 1.95);
export const MAT_VT_ROLLER = fwMat([76, 82, 96], 195, 0, 1.95);
export const MAT_VT_PIN_HEAD = fwMat([196, 204, 216], 225, 0, 1.95);
export const MAT_VT_HOLE = fwMat([8, 11, 18], 20, 0, 0.8);

export const MAT_INJ_BODY = fwMat([178, 26, 32], 225, 4, 1.0); // metallic red anodised solenoid housing
export const MAT_INJ_STEEL = fwMat([192, 199, 212], 225, 4, 1.0);
export const MAT_INJ_SLEEVE = fwMat([158, 166, 180], 215, 4, 1.0);
export const MAT_INJ_RUBBER = fwMat([24, 24, 28], 90, 0, 0.5);
export const MAT_INJ_SEAL = fwMat([208, 203, 190], 75, 0, 0.5); // PTFE tip seal
export const MAT_INJ_PLASTIC = fwMat([22, 24, 30], 90, 2, 0.2);
export const MAT_INJ_BRASS = fwMat([198, 162, 84], 195, 0, 0.8);
export const MAT_INJ_LABEL = fwMat([214, 218, 226], 95, 0, 0.1);

export const MAT_PLUG_CERAMIC = fwMat([236, 238, 241], 232, 0, 0.35);
export const MAT_PLUG_BAND = fwMat([36, 66, 148], 205, 0, 0.3); // the printed band round the insulator
export const MAT_PLUG_SHELL = fwMat([166, 174, 188], 218, 4, 0.9); // zinc-nickel plated steel
export const MAT_PLUG_THREAD = fwMat([146, 154, 170], 205, 4, 1.0);
export const MAT_PLUG_ELECTRODE = fwMat([122, 130, 144], 215, 4, 0.8);
export const MAT_PLUG_IRIDIUM = fwMat([226, 230, 238], 240, 0, 0.2);

export const MAT_VT_PLATE_OUT = fwMat([186, 194, 208], 225, 0, 1.95);
export const MAT_VT_SHOE = fwMat([84, 124, 140], 150, 0, 0.5); // plastic guide: lighter, still glossy
export const MAT_VT_PAD = fwMat([164, 172, 186], 205, 4, 0.9); // steel pressure pad

export const MAT_DECK = fwMat([0, 41, 102], 150, 7, 0.55); // the head's casting: sand-cast, a deep metallic navy blue (#002966)
export const MAT_DECK_EDGE = fwMat([176, 184, 198], 175, 0, 0.5); // machined edge
export const MAT_DECK_RIM = fwMat([120, 128, 144], 150, 1, 0.8);

export const MAT_IRON = fwMat([62, 56, 54], 80, 2, 0.2); // cast iron: the exhaust side
export const MAT_EXH_GUNMETAL = fwMat([70, 74, 82], 190, 1, 0.62); // the turbines' arc and the pipe down from it: one dark grey metal, polished
export const MAT_TURBO_GRAIN = fwMat([122, 128, 138], 120, 2, 0.35); // both turbo housings: cast grey metal, a fine matte grain
export const MAT_IRON_HOT = fwMat([98, 66, 54], 95, 2, 0.2); // the turbine housing, darkened by heat
export const MAT_ALU_CAST = fwMat([158, 166, 180], 120, 2, 0.4); // intake and compressor castings
export const MAT_ALU_TURNED = fwMat([198, 206, 218], 200, 1, 0.5);
export const MAT_PIPE_BLACK = fwMat([30, 34, 44], 175, 0, 0.35); // anodised charge piping
export const MAT_COUPLER = fwMat([142, 148, 158], 205, 1, 0.6); // the couplers on the charge pipes: grey metal sleeves, polished
export const MAT_STEEL_BRIGHT = fwMat([198, 204, 214], 205, 1, 0.5); // stainless
export const MAT_WHEEL_ALU = fwMat([208, 214, 224], 215, 1, 0.5);
export const MAT_WHEEL_HOT = fwMat([112, 98, 100], 190, 0, 0.3);
export const MAT_FIN_BACK = fwMat([12, 14, 20], 20, 0, 0.1);
export const MAT_CASE_GREY = fwMat([88, 96, 110], 110, 0, 0.3);
// The filter's wrapper: rings of two colours round it, of one width, in turn: a pink-red (#ff0066), matte with the
// plenum's sandpaper grit, and a bright blue (#1a75ff), with the heads' sand-cast grain; each with its crests, where the
// light catches, and its folds, deeper
export const MAT_FILTER_WRAP = fwMat([255, 26, 26], 70, 9, 0); // the filters: the intake manifold's own red (#ff1a1a), matte sandpaper
export const MAT_FILTER_WRAP_HI = fwMat([255, 82, 82], 80, 9, 0);
export const MAT_FILTER_WRAP_DEEP = fwMat([172, 17, 17], 60, 9, 0);
export const MAT_FILTER_WRAP_B = MAT_FILTER_WRAP;
export const MAT_FILTER_WRAP_B_HI = MAT_FILTER_WRAP_HI;
export const MAT_FILTER_WRAP_B_DEEP = MAT_FILTER_WRAP_DEEP;
export const MAT_FILTER_NET = fwMat([100, 105, 112], 210, 0, 0.8); // the net over the folds: fine woven threads of a mid grey metal
export const MAT_FILTER_WIRE = fwMat([92, 100, 112], 200, 0, 0.7); // the wire cage over the folds: dark steel, polished
export const MAT_FILTER_CAP = fwMat([38, 42, 50], 195, 1, 0.5); // the cap: black anodised, turned
export const MAT_FLANGE_BLACK = fwMat([26, 28, 34], 70, 0, 0.2); // the flange plate: matt black, so that its top does not glare
export const MAT_HDR_GOLD = fwMat([206, 160, 92], 200, 1, 0.5); // heat-coloured stainless, nearest the head
export const MAT_HDR_BRONZE = fwMat([152, 112, 66], 185, 1, 0.5);
export const MAT_HDR_BLUE = fwMat([98, 110, 152], 195, 1, 0.5); // the blue of the hottest part
export const MAT_HDR_PURPLE = fwMat([122, 98, 164], 195, 1, 0.5); // the purple between the gold and the blue, beside a weld
export const MAT_WELD = fwMat([196, 182, 146], 215, 1, 0.55); // weld metal: a silvery straw colour

export const MAT_IC_TUBE = fwMat([156, 164, 178], 150, 1, 0.5); // the flat tubes: satin aluminium
export const MAT_IC_FIN = fwMat([236, 240, 247], 190, 0, 0.65); // a fin's folds: bright
export const MAT_IC_FIN_DEEP = fwMat([96, 104, 120], 80, 0, 0.3); // the louvres, and the folds' valleys
export const MAT_IC_PLATE = fwMat([184, 192, 206], 178, 1, 0.55); // the plates: machined aluminium
export const MAT_IC_TANK = fwMat([172, 180, 194], 150, 2, 0.5); // the tanks: satin cast aluminium
export const MAT_IC_RUBBER = fwMat([22, 24, 30], 70, 0, 0.2); // the mounts' rubber

export const MAT_HEAD_CAST = fwMat([33, 37, 43], 150, 7, 0.55); // sand-cast, a dark metallic slate grey (#21252b)
// the perforated plates on the cover: a mid grey metal, and their rivets a little darker
export const MAT_PERF_PLATE = fwMat([122, 127, 134], 120, 0, 0);
export const MAT_PERF_RIVET_HEAD = fwMat([88, 92, 99], 110, 0, 0);
export const MAT_PERF_RIVET_SIDE = fwMat([70, 74, 80], 90, 0, 0);
export const MAT_HEAD_CAST_DEEP = fwMat([21, 23, 27], 110, 7, 0.4); // in the recesses: the same colour, deeper
export const MAT_HEAD_MACHINED = fwMat([208, 214, 226], 208, 1, 0.55); // machined faces: bright aluminium
export const MAT_HEAD_BRASS = fwMat([190, 156, 92], 190, 0, 0.7); // core plugs
export const MAT_HEAD_BOOT = fwMat([20, 22, 28], 70, 2, 0.25); // rubber
export const MAT_PLUG_CAP = fwMat([8, 41, 67], 52, 0, 0); // the spark plugs' caps on the cover: matte, a very dark blue (#082943)

export const MAT_TXT_TOP = fwMat([1, 1, 2], 8, 0, 0.5); // the floor of the engraving: matt black
export const MAT_TXT_TOP_LIGHT = fwMat([1, 1, 2], 8, 0, 0.5); // the floor of the figures' engraving: the same matt black
export const MAT_TXT_LIT = fwMat([255, 255, 255], 200, 0, 0.5); // a wall of the engraving that faces the light: white
export const MAT_TXT_SIG_EDGE = fwMat([46, 50, 58], 160, 0, 0.6); // the signature's walls toward the light: dark steel, nearly black
export const MAT_TXT_DARK = fwMat([226, 230, 238], 170, 0, 0.5); // a wall in its own shade: white too, a little greyer
export const MAT_TXT_THREAD = fwMat([255, 58, 50], 15, 0, 0.5); // a matt red stripe along the middle of each stroke
export const MAT_TXT_SHADOW = fwMat([3, 3, 5], 20, 0, 0); // the shadow

export const MAT_ST_COPPER = fwMat([204, 96, 56], 200, 1, 0.5); // copper, a warm, reddish
export const MAT_ST_COPPER_DEEP = fwMat([150, 58, 34], 190, 1, 0.5); // a turn of it in its own shade, deeper and redder
export const MAT_ST_COMM = fwMat([218, 146, 90], 220, 1, 0.4);
export const MAT_ST_MAGNET = fwMat([58, 62, 72], 120, 2, 0.4);
export const MAT_ST_CUT = fwMat([228, 232, 240], 238, 1, 0.5); // the faces where the housings are cut: bright, freshly sawn metal
export const MAT_ST_YOKE = fwMat([20, 22, 28], 130, 0, 0.5); // the yoke's outside: black
export const MAT_ST_YOKE_IN = fwMat([94, 98, 110], 140, 1, 0.5);
export const MAT_ST_BRUSH = fwMat([14, 14, 16], 60, 0, 0.5);
export const MAT_ST_CABLE = fwMat([198, 22, 26], 95, 0, 0.4);
export const MAT_ST_PINION = fwMat([152, 158, 172], 205, 1, 0.5);
export const MAT_ST_SOL = fwMat([26, 28, 34], 120, 0, 0.5); // the solenoid's case
export const MAT_ST_MICA = fwMat([52, 44, 38], 60, 0, 0.5);
export const MAT_ST_LAM = fwMat([118, 124, 136], 150, 3, 0.5);

export const MAT_ST_BRONZE = fwMat([176, 122, 58], 150, 1, 0.4);
export const MAT_ST_PLASTIC = fwMat([196, 24, 28], 70, 0, 0.5);
export const MAT_ST_BLACKPL = fwMat([18, 18, 22], 60, 0, 0.5);
export const MAT_ST_RUBBER = fwMat([22, 22, 25], 40, 0, 0.5);
export const MAT_ST_VARNISH = fwMat([170, 88, 32], 120, 1, 0.4);
export const MAT_ST_BRAID = fwMat([214, 142, 86], 200, 3, 0.4);
export const MAT_ST_TOOTH = fwMat([188, 194, 206], 230, 1, 0.5);
export const MAT_ST_ENAMEL = fwMat([186, 72, 42], 220, 0, 0.5); // enamelled copper wire: deep and glossy
export const MAT_ST_TRACK = fwMat([146, 92, 60], 120, 2, 0.3); // the commutator's bars where the brushes run: darkened, burnished
export const MAT_ST_CARBON = fwMat([44, 44, 48], 85, 2, 0.35); // the brushes' carbon
export const MAT_ST_PHENOLIC = fwMat([96, 58, 32], 95, 1, 0.45); // the brush plate: brown, laminated
export const MAT_ST_HOLDER = fwMat([206, 182, 128], 205, 1, 0.5); // the brush holders: stamped brass
export const MAT_ST_PAPER = fwMat([222, 204, 160], 45, 3, 0.2); // the insulating paper that lines the armature's slots

export const MAT_FAN_SHROUD = fwMat([24, 25, 30], 95, 2, 0.3); // the fans' shrouds: black, satin, moulded
export const MAT_FAN_BLADE = fwMat([62, 68, 80], 215, 1, 0.55); // their blades: dark graphite, with a metallic sheen
export const MAT_FAN_EDGE = fwMat([150, 160, 178], 230, 1, 0.5); // the blades' leading edges and the hub's cap
export const MAT_FAN_MOTOR = fwMat([34, 36, 42], 150, 1, 0.45); // the motor's can

// The engine block: its cast skin, its ribs, its machined faces, its core plugs
export const MAT_BLOCK = fwMat([101, 95, 109], 120, 7, 0.55); // sand-cast, a cool grey metal with violet in it (#655f6d)
// the embossed pattern on the block's walls: polished stainless, as in the photograph it copies
export const MAT_BLOCK_EMBOSS = fwMat([255, 255, 255], 0, 0, 0); // its light is painted on, per point (shapes.ts, quiltPanel)
export const MAT_BLOCK_RIB = fwMat([191, 188, 194], 215, 0, 0.8); // the ribs: a light satin metal (#bfbcc2), catching the light
export const MAT_BLOCK_MACH = fwMat([170, 166, 176], 225, 2, 0.75); // machined faces: the lip under the decks, the mounts' pads
export const MAT_CORE_PLUG = fwMat([196, 160, 92], 230, 0, 0.8); // the core plugs: pressed brass cups

// The timing covers: carbon-weave metal, bright fins, a machined rim
export const MAT_COVER = fwMat([66, 68, 78], 215, 8, 0.55); // dark metal, a carbon weave in it
export const MAT_COVER_FIN = fwMat([170, 178, 192], 205, 1, 0.55); // the fins: bright turned aluminium, as the air intake's
export const MAT_COVER_RIM = fwMat([168, 174, 186], 210, 1, 0.55); // the machined rim

// The dry sump: anodised aluminium, its fins, its cast covers
export const MAT_SUMP_ALU = fwMat([70, 76, 86], 175, 1, 0.5); // dark anodised aluminium, turned
export const MAT_SUMP_FIN = fwMat([118, 126, 138], 205, 1, 0.55); // the fins' edges catch the light
export const MAT_SUMP_CAST = fwMat([62, 68, 78], 120, 2, 0.4); // cast covers

// the three bars on each plate: a bright red, a bright blue and a bright yellow, each with its light and its shade
export const PLATE_BARS = [
  { top: fwMat([236, 16, 22], 215, 0, 0.4), lit: fwMat([255, 132, 120], 235, 0, 0.4), dark: fwMat([112, 4, 10], 170, 0, 0.4) },
  { top: fwMat([255, 206, 8], 215, 0, 0.4), lit: fwMat([255, 240, 142], 235, 0, 0.4), dark: fwMat([150, 108, 0], 170, 0, 0.4) },
  { top: fwMat([18, 72, 236], 215, 0, 0.4), lit: fwMat([130, 178, 255], 235, 0, 0.4), dark: fwMat([6, 26, 120], 170, 0, 0.4) },
];

// The starter's induction motor: the speed sensor magnet's poles, the sensor board,
// its parts, and the three phase leads
export const MAT_ST_SENSOR_MAG = fwMat([38, 40, 46], 110, 0, 0.35);
export const MAT_ST_SENSOR_MAG2 = fwMat([96, 100, 110], 150, 0, 0.5);
export const MAT_ST_PCB = fwMat([22, 104, 58], 175, 0, 0.15);
export const MAT_ST_TRACE = fwMat([204, 164, 72], 215, 0, 0.8);
export const MAT_ST_IC = fwMat([24, 24, 28], 130, 0, 0.2);
export const MAT_ST_SMD = fwMat([186, 156, 112], 120, 0, 0.2);
export const MAT_ST_LEAD_U = fwMat([232, 192, 32], 140, 0, 0.15);
export const MAT_ST_LEAD_V = fwMat([44, 172, 74], 140, 0, 0.15);
export const MAT_ST_LEAD_W = fwMat([44, 112, 212], 140, 0, 0.15);

// The intake plenum (plenum.ts): a bright red (#ff1a1a), matte, with the fine grit of sandpaper (pattern 9), and a
// darker red for its bands, flanges and underside
export const MAT_PLENUM_RED = fwMat([255, 26, 26], 70, 9, 0); // #ff1a1a, matte, a fine sandpaper grit
export const MAT_PLENUM_RED_DEEP = fwMat([172, 17, 17], 60, 9, 0);

// The intake manifold (plenum.ts): machined from billet and blasted a fine matte grey, with the fine grit of very fine
// sandpaper (pattern 9); a darker grey for its grooves and undersides
export const MAT_MANIFOLD_GREY = fwMat([158, 162, 168], 85, 9, 0);
export const MAT_MANIFOLD_GREY_DEEP = fwMat([108, 112, 118], 70, 9, 0);

// The clamp flange where the Y from the turbochargers' side is bolted to the throttle (plenum.ts): black, metallic, with
// the fine grit of sandpaper (pattern 9); a deeper black for its edges and grooves
export const MAT_CLAMP_BLACK = fwMat([30, 31, 34], 175, 9, 0.45);
export const MAT_CLAMP_BLACK_DEEP = fwMat([14, 14, 16], 140, 9, 0.3);

// The fins along the intake plenum's lid (plenum.ts): a bright metallic grey, machined, a brighter crest
export const MAT_FIN_GREY = fwMat([102, 106, 112], 175, 9, 0.35); // a darker grey, a fine sandpaper finish
export const MAT_FIN_GREY_CREST = fwMat([140, 144, 150], 200, 9, 0.45);
export const MAT_FIN_GREY_ROOT = fwMat([68, 71, 76], 150, 9, 0.3);

// The exhaust headers' heat shield: embossed aluminium foil wrapped on in patches, its dimples in rows that turn this
// way and that (pattern 10), the seams between the patches burnt brown
export const MAT_HEAT_SHIELD = fwMat([226, 228, 232], 205, 10, 0);
// and their flanges: plate stainless, cut and machined, a dull grey
export const MAT_HDR_FLANGE = fwMat([146, 144, 142], 150, 3, 0.25);
// The starter's drive (the bendix): its clutch's shell, its collar and its hub, one solid colour, the block's ribs' light
// satin grey (#bfbcc2), matte, with a fine sandy grit
export const MAT_BENDIX = fwMat([191, 188, 194], 70, 9, 0);
export const MAT_BENDIX_DEEP = fwMat([150, 147, 153], 60, 9, 0);
// The starter solenoid's fins: the same grit, a lighter, brighter metal
export const MAT_FIN_LIGHT = fwMat([150, 155, 163], 205, 9, 0.6);
export const MAT_FIN_LIGHT_CREST = fwMat([200, 205, 212], 230, 9, 0.75);
export const MAT_FIN_LIGHT_ROOT = fwMat([108, 112, 120], 175, 9, 0.45);
