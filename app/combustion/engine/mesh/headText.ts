// The lettering and the signature on the heads.

import { CT_X, FIRING_ORDER } from "../core/constants";
import type { FwVec3 } from "./builder";
import { HEAD } from "./head";
import { MAT_TXT_DARK, MAT_TXT_LIT, MAT_TXT_SIG_EDGE, MAT_TXT_TOP } from "./materials";
import type { MeshBuilder } from "./tubes";

// ---- THE NAME ON THE HEADS: AKUNDA V12, and the engine's firing order, stamped on the cover's top in raised dark
// metal: a bar for each stroke, its edges bevelled to catch the light, and a black outline round it for a shadow ----

type Pt2 = [number, number];

// The strokes of each glyph the covers are stamped with (the firing order: digits and dashes), in a box one high
// and `w` of the height wide: x from 0 to 1 of that width, y from 0 (the baseline) to 1
const GLYPHS: Record<string, { w: number; strokes: Pt2[][] }> = {
  " ": { w: 0.45, strokes: [] },
  "-": { w: 0.4, strokes: [[[0.05, 0.5], [0.95, 0.5]]] },
  "0": { w: 0.6, strokes: [[[0.5, 0], [0.12, 0.12], [0, 0.5], [0.12, 0.88], [0.5, 1], [0.88, 0.88], [1, 0.5], [0.88, 0.12], [0.5, 0]]] },
  "1": { w: 0.45, strokes: [[[0.05, 0.78], [0.55, 1], [0.55, 0]], [[0.1, 0], [1, 0]]] },
  "2": { w: 0.6, strokes: [[[0, 0.8], [0.15, 0.95], [0.5, 1], [0.85, 0.95], [1, 0.75], [0.9, 0.5], [0, 0], [1, 0]]] },
  "3": { w: 0.6, strokes: [[[0, 0.92], [0.5, 1], [0.9, 0.9], [1, 0.72], [0.8, 0.55], [0.4, 0.52]], [[0.8, 0.55], [1, 0.35], [0.9, 0.1], [0.5, 0], [0, 0.1]]] },
  "4": { w: 0.62, strokes: [[[0.75, 0], [0.75, 1], [0, 0.3], [1, 0.3]]] },
  "5": { w: 0.6, strokes: [[[1, 1], [0.1, 1], [0.05, 0.55], [0.5, 0.62], [0.9, 0.5], [1, 0.3], [0.9, 0.1], [0.5, 0], [0, 0.1]]] },
  "6": { w: 0.6, strokes: [[[0.9, 0.95], [0.5, 1], [0.15, 0.8], [0, 0.4], [0.1, 0.1], [0.5, 0], [0.9, 0.1], [1, 0.35], [0.85, 0.58], [0.5, 0.65], [0.1, 0.5]]] },
  "7": { w: 0.6, strokes: [[[0, 1], [1, 1], [0.35, 0]]] },
  "8": { w: 0.6, strokes: [[[0.5, 0.55], [0.12, 0.7], [0.1, 0.9], [0.5, 1], [0.9, 0.9], [0.88, 0.7], [0.5, 0.55]], [[0.5, 0.55], [0.05, 0.38], [0, 0.15], [0.5, 0], [1, 0.15], [0.95, 0.38], [0.5, 0.55]]] },
  "9": { w: 0.6, strokes: [[[0.1, 0.05], [0.5, 0], [0.85, 0.2], [1, 0.6], [0.9, 0.9], [0.5, 1], [0.1, 0.9], [0, 0.65], [0.15, 0.42], [0.5, 0.35], [0.9, 0.5]]] },
};

// The signature, as the grid of heights of its ink (0 to 15), row by row from the top: a run of zeros is ".", its length in base 36, ";"
const SIG = { nx: 519, ny: 133, g: 0.484, data: ".o1;121.e9;15befd4.e7;5cfffffd1.e4;4cffffffff2.e2;2afffffffffb.e2;5effffffffff4.e1;7ffffffcefff8.e0;18fffffb57fffb1.e0;9ffffe611bffc2.e0;9ffffc3.2;5ffd3.e0;7ffffb2.2;2dfe5.e0;4ffffb1.3;aff8.e0;1dfffc1.3;5efb1.e0;9ffff3.3;2cfc2.e0;4ffff7.4;7ed4.e0;1cfffc1.3;4cd6.e1;6ffff3.3;29d81.9k;1258aaa941.46;2efffa.4;7ca2.9h;249dfffffffffe5.45;affffb.3;4aa4.9f;26cfffffffffffffff5.43;4fffffd1.1;29b5.7i;122.1s;15befffffffffffffffffd1.41;1bfffffc1.1;6b81.7e;15adfffc4.1o;37dfffffffffffffffffffff6.41;7ffffff714992.7d;28effffffff6.1k;16cffffffffffffffedcdffffffa.40;3ffffffe33993.7c;17efffffffffff5.1h;39efffffffffffea7421.2;17fffffc.3z;1bffffff837a5.7b;16dfffffffffffffd1.1e;3afffffffffffd941.8;7fffffb.3z;5ffffffe45971.7a;4cffffffffffffffff7.1c;3affffffffffe931.a;1cfffff9.3y;2dffffff83661.7a;7ffffffffffdbefffffd1.19;29ffffffffffb51.d;6ffffff5.3y;8ffffffe4451.79;19ffffffffe82.2;5ffffff5.17;18effffffffe82.f;2efffffe1.3x;3effffffa541.79;2bfffffffc51.4;1efffffa.15;15dffffffffe81.h;affffff7.3y;afffffff962.79;4dffffffe61.7;cfffffd.13;15cffffffffd61.i;1efffffe1.3x;3fffffffe94.79;5effffffb3.9;9fffffe1.11;4cffffffffe81.k;1dfffff6.3y;afffffffc61.78;7ffffffe71.a;8ffffff1.z;3affffffffe82.n;8ffff8.3y;3effffffe82.77;19ffffffd4.c;7ffffff2.x;3affffffffd71.p;19ca6.3z;8fffffffa3.77;2cffffffc2.d;6ffffff3.v;4affffffffe61.t;1.40;2dffffffe6.77;4dffffffa1.e;7ffffff4.t;3afffffffffa3.4w;9fffffffa1.76;6effffff7.g;7ffffff5.r;29fffffffffc5.4x;4fffffffe4.76;8ffffffe5.h;7ffffff6.p;17effffffffc51.4y;bfffffff7.75;1affffffe4.i;7ffffff6.n;16dffffffffc61.4z;4fffffffc1.74;2cffffffc2.j;8ffffff6.l;15cffffffffd61.51;bffffffe3.74;4dffffff91.k;9ffffff7.j;15cffffffffd61.52;4fffffff8.38;2463.3s;6effffff7.m;bffffff6.i;3bffffffffc61.53;1bffffffd1.36;29eeea2.3q;7ffffffe5.n;dffffff5.g;27dfffffffd61.55;8fffffff5.36;3dffffc5.3o;19ffffffb3.n;1effffff4.e;29dfffffffc61.56;3effffffb.36;3efffffd6.3n;19ffffff81.o;3fffffff2.c;17efffffffd71.58;9fffffff3.35;3effffffd5.3m;19ffffff7.q;5ffffffe1.a;16cfffffffc62.59;2effffffb.35;3dfffffff7.3m;1affffff6.r;8ffffffb.a;5cfffffffb41.5b;8ffffffe3.34;2dffffffc3.3m;2cfffffe6.s;bffffff9.8;3afffffffd61.5c;3effffff8.34;2cffffffc2.3m;2cfffffe4.t;dffffff7.6;29effffffc51.5e;8ffffffc1.33;3dffffffd2.3m;2cfffffe4.t;1effffff4.4;18effffffe71.5f;2cffffff4.33;2dffffffb2.3m;3dfffffd4.u;2fffffff1.2;16dffffffe93.5h;7ffffff9.33;1cffffffb2.3m;3dfffffd3.v;5ffffffe214bfffffffa3.5i;3dfffffe2.32;1bffffffc2.3m;5efffffb2.w;8fffffff8cfffffffc83.5i;18efffff5.32;19ffffffc2.3m;6ffffffa1.x;bffffffffffffffb53ac4.5h;5cfffff8.33;8ffffffc2.3m;7ffffff71.y;dffffffffffffb51.1;2ffe5.5f;3dfffffa1.32;6ffffffd2.3m;7ffffff6.z;2fffffffffffd61.3;5ffff5.5d;2cfffffb1.32;4effffff5.3m;8fffffe6.10;4fffffffffd71.5;8ffffe2.5b;1afffffc2.32;3effffff7.3l;18fffffd4.10;1bfffffffc51.7;8fffff9.5b;7fffffd2.32;2dffffff9.3l;1afffffc2.z;16cfffffffb2.9;6fffffe1.58;15efffff4.32;1bffffffb1.3k;1bfffffa2.z;4bfffffffff5.a;4ffffff2.57;16dfffff8.33;affffffe3.3k;1affffe71.y;4bfffffffffff2.a;3ffffff5.57;5cfffffc1.32;7fffffff9.3k;1affffe5.y;29ffffffffffffd1.a;3ffffff8.56;38ffffff4.32;5fffffffc2.3j;1bffffe5.x;16cffffedfffffff9.b;2ffffffa.1h;4bc91.k;17cc82.2u;5bfffff8.32;3effffffe3.3j;1affffd4.w;15cfffffb55fffffff4.b;2ffffffc.1g;7ffff9.j;5dffffd5.2t;5effffc1.31;1cfffffff7.3j;19ffffc3.w;3bffffeb51.1;3fffffff2.b;1ffffffe1.1d;1affffff2.g;18ffffffff5.2r;28ffffe3.31;19fffffffa1.3i;1affffc3.v;28effffa41.3;6ffffffc.d;dffffff2.1c;2cfffffff4.f;1bfffffffffd1.15;159971.1f;3effff6.32;9fffffffc2.3i;1affffb2.u;17effffd61.5;affffff7.d;9ffffff4.1b;2dffffffff2.e;1cfffffffffff3.k;11.i;7effffc2.1e;9ffffb.29;242.q;7fffffffd3.3i;18ffffa2.t;15cffffe71.6;1effffff4.d;7ffffff7.1a;3dffffffffc.e;1bffffffffffff5.h;17dffb3.e;2bfffffffb1.1c;3fffff3.28;6efc1.o;3efffffff5.q;1331.l;112223221111.1r;19ffffc2.t;4cfffff92.8;2fffffff2.d;5ffffffb.19;3dfffffffff6.e;afffffffffffff7.g;5dfffffe3.c;4dfffffffff8.1b;1bffff8.28;2effe1.n;2cfffffff8.q;6dffd71.d;1368acdeefffffeeedca99876554311.1d;2bffffc3.s;39fffffb4.a;5ffffffd.e;2ffffffe1.17;2dfffffffffd1.d;8ffffffffffffff8.e;19ffffffffc1.a;7fffffffffffe2.y;148abb962.3;6ffffc1.w;12.1a;8fffc.n;1afffffffb1.p;3fffff8.c;39dffffffffffffffffffffffffffffeca731.18;2cffffc2.r;28effffc5.c;affffffa.e;1fffffff4.16;1cffffffffff6.d;6fffffffffffffff7.d;4dffffefffff4.9;8fffffffffffff5.m;137abbbb9537dfffffe4.3;2effff4.p;2784.3;4df7.18;1efff6.n;8fffffffe3.q;7fffff4.b;5efffffffffffffffffffffffffffffffffffd941.14;2cffffd3.q;17dffffc61.c;1effffff6.f;dffffff8.15;1affffffffffd1.c;5fffffffeefffffff5.c;7ffff932affff8.8;8ffffffffffffff6.j;26beffffffffffffffffff5.3;bffff8.l;14326cd94.2;2eff8.18;4ffff3.m;5ffffffff6.r;afffff3.a;1dfffffffffffffffffffffffffffffffffffffffd61.11;2cffffd3.p;16effffd61.e;4fffffff3.f;9ffffffc.15;8fffffffffff6.c;4effffffd7dfffffff3.b;8fffb3.3;8ffffa.7;7fffffffffffffff6.g;15befffda6447dfffffffffff4.2;4ffffd1.j;39efedda3.3;1bfff3.18;afffe1.l;2efffffffa1.r;bfffff5.a;3ffffffffffffffffffffffffffffffffffffffffffd4.z;2dffffd3.p;5cffffe82.g;8ffffffd1.f;7ffffffe1.13;7fffffffffffc1.b;2dffffffe43effffffe1.9;1affd5.5;affffb.6;5ffffffffffffffff6.e;28efffc841.2;14bfffffffffffd1.1;1cffff5.i;3aeffffd61.4;7fff7.18;1efffc.l;1bfffffffc2.s;9fffff8.a;4fffffffffffffffffffffffffffffffffffffffffffe5.x;2dffffc2.o;3afffff92.i;dffffffa.g;4fffffff5.12;5ffffffffffff4.b;1cffffffe4.1;5fffffffb.9;1affb2.5;1dffffb.5;3effffffc9ffffffff4.c;17effe93.5;29fffffffffffff5.2;7ffffa.h;18effffe82.5;3fffa.19;3ffff9.l;7fffffffe5.t;7fffffc.a;4ffffffffffffedba99aaa99acdeeefffffffffffffffe5.v;2dffffc2.n;18fffff93.j;2fffffff5.g;1effffffa.11;3efffffffffff9.b;1affffffe4.2;afffffff6.9;9ffa1.6;3fffff9.4;2dffffffa38fffffffe2.a;15cffe82.6;6efffffffffefffa.2;3ffffe3.f;15dfeaac82.6;2dffd1.19;6ffff5.k;4ffffffff9.u;6fffffe1.9;3ffffffffeb7421.b;1113458aceffffffffffd1.t;2dffffc2.n;5dffff93.l;7ffffffe1.h;affffffe1.z;3effffffffffff3.b;9fffffff5.2;3fffffffe2.8;8ff91.7;9fffff5.3;1bffffffb11dfffffffb.a;4dfff92.6;2afffffffffeffffb1.1;1dffff8.e;15cfea2122.7;2cfff4.1a;9ffff4.j;2dfffffffd2.u;6fffffe1.9;1dffffffa2.p;25cfffffffff4.s;2cffffb2.m;2affffb3.n;dffffffc.i;5fffffff3.y;1dffffdfffffffa.b;7fffffff8.3;9fffffffb.8;8ffa1.7;2efffff2.3;7ffffffc2.1;5ffffffff7.8;19fffc4.6;17efffffffffeffffa1.2;affffd2.d;3bfeb4.b;5efffb.1b;affff2.j;9ffffffff5.v;5ffffff1.a;7ffffff6.r;16effffffff5.r;2bffffc2.l;17efffd5.o;2fffffff9.i;2fffffff7.y;9ffffccffffffe3.a;5fffffffa1.2;1efffffff7.7;5ffb1.8;8fffffd.3;4ffffffd2.2;cffffffff4.7;4dfff81.6;3cfffffffffffffff81.2;6fffff8.c;17dec5.b;3afffff4.1b;bfffe1.i;6ffffffff9.w;3ffffff2.a;2efffff6.q;16dfffffffff4.q;1affffa2.l;4cfffe81.p;6fffffff5.j;cffffffb.x;7ffffc8effffff9.a;3effffffc1.3;5ffffffff3.6;4efc2.8;2efffff8.2;2efffffe4.2;3ffffffffe2.6;7fffd4.6;18fffffffffffffffc4.3;2effffd3.b;4cfd71.a;17efffffb.1c;cfffe1.h;3efffffffd2.w;2ffffff5.b;cfffff5.p;4cffffffffffd2.q;8ffff91.k;29ffff92.r;cffffffe2.j;afffffff1.v;6ffffc5bffffffe2.9;4effffffe3.3;1cfffffffd1.5;2dfd2.9;9ffffff3.1;1affffff6.3;9ffffffffc1.5;8fffa1.6;2bfffffffffffffffa1.3;1afffff7.a;29efb3.a;15cfffffff3.1b;1dfffe1.g;2dffffffff5.x;2ffffff7.b;5efffa1.n;4bffffffffffff5.q;8ffffa1.j;17efffb3.s;2fffffffc.k;5fffffff4.u;3efffd46fffffff6.9;4effffffe4.4;4ffffffff8.5;1bfe3.9;2efffffd1.1;7ffffff7.3;1effffffff7.5;8fff81.6;5effffffffffffffe6.5;bfffffd2.8;17dec61.9;16dffd9cfffb.1c;1effff2.g;affffffffc1.x;2ffffffa.c;37851.m;29fffffffffffff6.q;6ffffb1.j;4cfffa3.u;5fffffff8.k;3fffffff9.t;1cffff63dffffffc1.8;3efffffff5.5;affffffff3.5;9ff6.a;8ffffff916ffffffb1.3;6ffffffffe3.4;5fff7.7;7fffffffffffffffb3.5;4ffffff8.8;3bee92.9;15cfff934efff5.1c;2fffff2.f;6fffffffff4.y;2ffffffb.11;17dffffffffffffd4.q;4efffc2.i;17effc4.w;9fffffff4.k;1dffffffe1.s;9ffff928fffffff6.8;3dfffffff7.5;2ffffffffd1.4;4ff9.a;2effffff55efffffe3.3;1cffffffffc1.3;2effa.7;8ffffffffffffffe61.5;1bfffffe2.6;17dfc4.9;15cfffc4.2;7fffc1.1c;2fffff3.e;4effffffff9.z;2ffffffb.10;5cffffffffffffd72.q;3dfffd3.i;3bffc51.x;cfffffff2.l;8fffffff4.r;7ffffc24effffffc1.7;3dfffffffa.6;6ffffffff9.5;bfd1.a;9ffffffe8effffff6.4;5fffffffff7.4;bffe2.6;9ffffffffffffffb3.7;5ffffff9.6;3bfe81.8;16dfffe61.2;2efff6.1d;2fffff5.d;4effffffffc1.z;2ffffffc.y;2affffffffffffc61.r;2dfffd3.i;6efd61.y;2fffffffc.m;4fffffff9.q;5ffffe31bfffffff5.7;4efffffffc1.6;cffffffff4.4;1ef91.9;2effffffeeffffff9.5;cffffffffe3.3;5fff4.5;19fffffffffffffc4.8;1dfffffe3.4;17efd5.8;15dffff92.4;8fffe1.1d;3fffff7.c;2dffffffffe3.10;2ffffffd.w;17efffffffffffa4.t;2dfffe4.h;17ee81.10;6fffffff9.m;1effffffd1.o;3effff5.1;4fffffffd1.6;3efffffffd2.6;2ffffffffd1.4;1efc93.8;7ffffffffffffffc1.4;3fffffffffc1.3;bff9.5;1affffffffffffd51.9;7ffffff8.4;4cff92.7;15cffffb3.5;2efff8.1e;3fffff9.b;1bffffffffe5.11;2ffffffe1.u;2bfffffffffffa4.u;1cffff5.h;4adb4.12;afffffff6.n;afffffff2.n;1cffff8.1;1cfffffff7.6;4dfffffffc2.7;5ffffffff8.6;6c94.8;1dfffffffffffffe3.5;7fffffffff7.3;1fff3.4;1afffffffffffc61.a;2efffffe3.2;2afff71.6;16cffffa4.7;9fffe2.1e;3fffffa.b;9fffffffff5.12;3fffffff2.s;16effffffffffb4.w;affff6.f;149cb61.12;1efffffff2.n;6fffffff6.n;9ffffc1.1;6fffffffd1.5;5efffffffe3.8;affffffff4.i;5fffffffffffffe5.6;cffffffffe3.3;1fff61.2;3cffffffffffa41.c;affffff9128effe6.6;17dffffa3.8;3ffffa.1f;3fffffb.a;6fffffffff8.13;3fffffff4.r;2affffffffffd61.w;8ffff8.g;8ca61.14;2fffffffe1.n;2fffffffb.m;7ffffe3.1;1dfffffff5.4;18fffffffff5.8;1dfffffffd1.i;bfffffffffffff7.6;2fffffffffb.5;dfffdcdfffffffffc62.e;5fffffff87dfffd4.5;17dffffb4.a;bffff4.1f;3fffffc.9;4effffffffc2.13;2fffffff5.q;4dffffffffffa2.x;8ffff7.h;11.17;5fffffffc.o;1efffffff3.k;5fffff5.2;4fffffffc1.3;2bffffffffe5.9;3ffffffff9.i;3fffffffffffffa1.6;6fffffffff5.5;5fffffffffffff92.g;3efffffffeffffb2.4;18effffa3.b;5ffffc.1g;3fffffe1.7;2dffffffffd3.14;2fffffff7.o;17fffffffffff71.x;7ffff9.1r;afffffff9.p;8fffffff8.j;3effff8.3;bfffffff5.3;5effffffffe4.a;7ffffffff3.i;8ffffffffffffd2.7;cffffffffe2.6;5ceffffffffc4.h;1cffffffffffff81.3;17effffb4.c;1dffff5.1g;3fffffe2.7;9fffffffff5.15;2fffffff8.n;3bffffffffffd5.y;7ffffa1.1r;dfffffff6.p;4fffffffd.i;2dffffb1.2;2fffffffd1.1;19fffffffffd3.b;bfffffffc1.h;1dfffffffffffe3.7;2fffffffffb.9;1348effb41.i;9ffffffffffff6.3;17effffb4.e;6ffffc1.1g;3ffffff2.6;7fffffffff9.16;2fffffff8.m;6effffffffffb2.y;6ffffa1.1r;1efffffff4.p;1dfffffff3.g;1bffffd2.3;7fffffff913cfffffffffd2.b;1dfffffff9.i;4ffffffffffff6.8;7fffffffff6.d;132.k;5ffffffffffff6.2;27dffffc4.f;1dffff6.1h;3ffffff3.5;4fffffffffd2.16;2fffffff9.k;19fffffffffff91.y;4ffffa1.1s;4ffffffff2.q;9fffffff9.f;1affffd3.4;bfffffff97efffffffffd3.c;2efffffff6.i;8fffffffffff6.8;1dffffffffe1.z;1dfffffffffff7228effffc4.h;6ffffd1.1h;2ffffff5.4;1dfffffffff5.17;2fffffffa.j;3bfffffffffff81.y;3efffa1.1t;8fffffffe1.q;4fffffffe1.e;9ffffe3.4;1effffffffffffffffffb2.d;5ffffffff3.i;bffffffffff7.9;3fffffffff9.10;8fffffffffffa7afffffd61.h;1dffff7.1i;1efffff6.4;7fffffffff9.18;1effffffb.i;5efffffffffff7.z;2dfff91.1u;bfffffffe1.q;1ffffffff4.d;7fffff5.5;3ffffffffffffffffffa1.e;afffffffe1.i;cfffffffff8.a;6fffffffff7.z;2ffffffffffffefffffe71.j;5ffffe2.1j;dfffff9.3;4effffffffd2.18;2fffffffd1.f;19ffffffffffff7.z;1bfff81.1v;cfffffffc.s;cfffffffb.c;6fffff6.6;4fffffffffffffffff71.f;cfffffffe1.i;8ffffffff8.b;bfffffffff3.z;8ffffffffffffffffd72.k;1cffff8.1k;bfffffb.2;2dfffffffff5.19;2fffffffe1.e;2bffffffffffff6.10;8fffa1.1w;dfffffff9.s;6ffffffff3.a;4fffff8.7;5fffffffffffffffe4.h;cfffffffe1.i;2dffffff7.b;2fffffffffd1.y;1dffffffffffffffe71.m;6ffffe2.1k;9fffffd11afffffffff9.1a;2fffffffe2.d;2bffffffffffff6.10;4fffa1.1w;1efffffff8.s;2efffffffa.9;2dffff9.8;4ffffffffffffffc3.i;bfffffffd1.j;3cfffc4.c;5fffffffff9.z;5fffffffffffffe92.n;1dffffa.1l;9ffffff59fffffffffd2.1a;2ffffffff3.d;affffffffffffb41111111.s;1dffb1.1x;2ffffffff8.t;9ffffffff4.7;1bffff9.9;2effffffffffff91.j;7fffffffb.m;342.e;bfffffffff4.z;cfffffffcdfed72.p;6fffff5.1l;9ffffffdffffffffff5.1b;2ffffffff4.c;3fffffffffffffedeeeeeeeddcbba9999887543211.9;9ffc1.1y;3ffffffff7.t;3ffffffffb.7;9ffff91.a;affffffffffe6.l;2effffff6.12;2fffffffffc1.y;3fffffffc2111.r;1dffffd1.1l;6ffffffffffffffff9.1c;2ffffffff4.c;5fffffffffffffffffffffffffffffffffffffffeda4.6;5ffe2.1z;4ffffffff7.u;affffffff6.4;19ffff8.c;2effffffffc3.n;6effffb1.12;8fffffffff7.z;9fffffff5.v;6fffff7.1m;3fffffffffffffffd2.1c;3ffffffff4.c;5fffffffffffffffffffffffffffffffffffffffffff6.4;1cff4.20;6ffffffff7.u;3ffffffffe2.2;3dfffe7.e;3dfffffe71.p;3bdd92.12;1efffffffff4.y;1effffffc1.u;1cffffe2.1m;1dffffffffffffff6.1d;3ffffffff5.c;5fffffffffffffffffffffffffffffffffffffffffffe3.3;3ff7.21;9ffffffff8.v;affffffffc37fffd82.g;159ca51.t;1.15;5ffffffffff2.y;7fffffff5.v;5fffff9.1o;cfffffffffffffb1.1d;2ffffffff6.c;5ffffffffffffffffffffffffffffffffffffffffffff6.3;3ff2.20;1cffffffff6.v;3ffffffffffffe4.2p;7fffffffffc.y;1dffffffb1.v;bfffff3.1o;affffffffffffd3.1e;1efffffff7.c;4ffffffffffffffffffffffffffffffffffffffffffff7.3;1cd1.20;3effffffff3.w;8fffffffffffa.2q;afffffffff8.y;4fffffff5.v;5fffffb.1p;5ffffffffffff5.1g;cfffffff7.c;1dfffffffffffffffffffffffffffffffffffffffffff5.4;23.21;4efffffffa1.w;1cffffffffffc1.2p;7ffffffffe3.y;bffffffa.w;cfffff5.1p;3fffffffffff8.1h;bfffffff7.d;5efffffffffffffffffffffffeeeeeeeeffffffffffa1.27;19ffffffb2.y;3effffffffff7.2p;2cfffffff8.y;5fffffff4.v;3fffffd1.1p;1cfffffffffc1.1h;5ffffffe4.e;4dffffffffffffec9866543221111111223579cda51.29;3dffffb2.10;5ffffffffffd1.2p;3dfffff91.w;29fffffffa.w;afffff8.1r;4efffffffd3.1j;49eeb73.g;27cefffffeb741.o;1.2d;6bca62.12;8ffffffffff1.2q;39ccc5.x;5dfffffffe3.v;2ffffff3.1s;8ffffffc3.1m;11.m;2444321.38;1.15;1affffffffb.2t;111.x;1dffffffffa.w;7fffffc.1u;39ddd92.6x;1affffffd3.3t;4fffffffff5.v;1dfffff5.1w;121.71;6dfffe7.3u;6fffffffff5.v;5fffffe1.91;13763.3v;3effffffff6.v;cfffffb.d2;1cffffffff5.u;4ffffff5.d3;6fffffffc1.u;afffffe1.d3;1afffffe5.u;1efffff9.d5;19effc4.v;6ffffff3.d7;122.w;1dfffffd1.e6;5ffffff9.e6;1cffffff3.e6;7ffffffc.e6;2effffff6.e6;7fffffff3.e6;cfffffff4.e5;1efffffff7.e5;1dfffffff7.e6;9ffffffe2.e6;2cfffff5.e8;29eec5.eb;11.k5;" };

// The signature's size, a share of its grid's: small enough that all of it, every stroke whole, nothing cut, fits in the
// band under the spark plugs' wells and the plates and above the edge of the cover's flat top, between the two plates
const SIG_SCALE = 0.69;

// The signature's heights, decoded once
let SIG_LEVELS: Uint8Array | null = null;

function signatureLevels(): Uint8Array {
  if (SIG_LEVELS) return SIG_LEVELS;

  const out = new Uint8Array(SIG.nx * SIG.ny);
  let n = 0;
  let k = 0;

  while (k < SIG.data.length) {
    const c = SIG.data[k];

    if (c === ".") {
      const e = SIG.data.indexOf(";", k);

      n += parseInt(SIG.data.slice(k + 1, e), 36);
      k = e + 1;
    } else {
      out[n++] = parseInt(c, 16);
      k++;
    }
  }

  SIG_LEVELS = out;

  return out;
}

// The signature, raised from the cover. Every point of its grid is lifted by its height, so that the strokes have the rounded edges
// and the thin hairlines of the pen; each small facet is shaded by the way it faces the light, as the letters' bevels were, and a
// shadow is thrown to the lower right. `su` is the way the reading runs along x, as it is for the lines of lettering.
function stampSignature(b: MeshBuilder, xc: number, zBase: number, su: number) {
  const lvThin = signatureLevels();
  const lv = new Uint8Array(lvThin.length); // the strokes, a little thicker, so that the writing reads better

  for (let j = 0; j < SIG.ny; j++) {
    for (let i = 0; i < SIG.nx; i++) {
      let m = lvThin[j * SIG.nx + i];

      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          const jj = j + dj;

          if ((di === 0 && dj === 0) || ii < 0 || jj < 0 || ii >= SIG.nx || jj >= SIG.ny) continue;

          m = Math.max(m, lvThin[jj * SIG.nx + ii] * (di === 0 || dj === 0 ? 0.95 : 0.8));
        }
      }

      lv[j * SIG.nx + i] = Math.round(m);
    }
  }

  // one more step of thickness, for all of the writing
  const lvB = lv.slice();

  for (let j = 0; j < SIG.ny; j++) {
    for (let i = 0; i < SIG.nx; i++) {
      let m = lvB[j * SIG.nx + i];

      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          const jj = j + dj;

          if ((di === 0 && dj === 0) || ii < 0 || jj < 0 || ii >= SIG.nx || jj >= SIG.ny) continue;

          m = Math.max(m, lvB[jj * SIG.nx + ii] * (di === 0 || dj === 0 ? 0.95 : 0.8));
        }
      }

      lv[j * SIG.nx + i] = Math.round(m);
    }
  }

  // "V12" is told from the name by the widest empty run in the right part of the writing: it is cut deeper, so that it is obvious
  // (its strokes are all of one width, the V's: the grid itself is made so)
  let vStart = SIG.nx;
  let run = 0;

  for (let i = Math.floor(SIG.nx * 0.55); i < SIG.nx; i++) {
    let ink = false;

    for (let j = 0; j < SIG.ny && !ink; j++) ink = lvThin[j * SIG.nx + i] > 0;

    if (!ink) {
      run++;
    } else {
      if (run >= 12) {
        vStart = i;
        break;
      }

      run = 0;
    }
  }

  const { nx, ny } = SIG;
  const g = SIG.g * SIG_SCALE;
  const relief = -4.6; // negative: the strokes are cut into the cover, deep
  const INK_EDGE = 5; // of the ink's 15 levels, where a stroke's edge is
  // the ink under a plug boot's ring is left out
  const blocked = new Uint8Array(nx * ny);

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = xc + su * (i - nx / 2) * g;
      const z = zBase - (ny - 1 - j) * g;

      for (const bx of CT_X) {
        if (Math.hypot(x - bx, z) < 16.5) {
          blocked[j * nx + i] = 1;
          break;
        }
      }
    }
  }

  // cut sharp: a cell is either inked, to the groove's full depth, or not at all, so that the floor is flat and black right
  // to the strokes' ends and the walls are one clean step, with no shallow streaks inside the strokes
  // nothing is cut past the edge of the cover's flat top, where it starts to curve down (head.ts, COVER_HALF's zFlat): the tail of
  // the "a" that ran over it is left off
  const zFlatEnd = 54 - 0.6;
  const hAt = (i: number, j: number) =>
    i < 0 || j < 0 || i >= nx || j >= ny || blocked[j * nx + i] || lv[j * nx + i] < INK_EDGE || zBase - (ny - 1 - j) * g > zFlatEnd
      ? 0
      : relief * (i >= vStart - 2 ? 1.25 : 1);

  const P = (i: number, j: number, h: number): FwVec3 => [xc + su * (i - nx / 2) * g, HEAD.yTop - h, zBase - (ny - 1 - j) * g];
  const LU = -0.55; // the light comes from the upper left of the writing
  const LV = 0.83;

  const occ = (h: number) => 1 - 0.45 * (h / relief); // the floor of a groove is the darker toward its walls
  const deepest = relief * 1.25;

  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const h00 = hAt(i, j);
      const h10 = hAt(i + 1, j);
      const h01 = hAt(i, j + 1);
      const h11 = hAt(i + 1, j + 1);

      if (h00 + h10 + h01 + h11 === 0) continue;

      // how fast the cell rises, toward the right and toward the top of the writing, and which way it faces
      const slopeU = (h10 + h11 - h00 - h01) / (2 * g);
      const slopeV = -(h01 + h11 - h00 - h10) / (2 * g);
      const steep = Math.hypot(slopeU, slopeV);
      // as the firing order's: the floor of the groove is black, wherever it is deep (the name and V12 alike), and its walls
      // white, the brighter where they face the light
      const depth = Math.min(h00, h10, h01, h11) / (i >= vStart - 2 ? deepest : relief);
      // the name and V12 are black throughout, their walls too, right to the strokes' tips: only a dark steel edge where a
      // wall catches the light
      const mat = depth > 0.85 || steep < 0.12 ? MAT_TXT_TOP : slopeU * LU + slopeV * LV < 0 ? MAT_TXT_SIG_EDGE : MAT_TXT_TOP;
      const p00 = P(i, j, h00);
      const p10 = P(i + 1, j, h10);
      const p01 = P(i, j + 1, h01);
      const p11 = P(i + 1, j + 1, h11);

      if (Math.abs(h00 - h11) <= Math.abs(h10 - h01)) {
        b.flatTri(p00, p10, p11, [0, -1, 0], mat, occ(h00), occ(h10), occ(h11));
        b.flatTri(p00, p11, p01, [0, -1, 0], mat, occ(h00), occ(h11), occ(h01));
      } else {
        b.flatTri(p00, p10, p01, [0, -1, 0], mat, occ(h00), occ(h10), occ(h01));
        b.flatTri(p10, p11, p01, [0, -1, 0], mat, occ(h10), occ(h11), occ(h01));
      }
    }
  }
}


// A line of text cut into the cover as one continuous groove: its strokes (each glyph's strokes, laid side by side) are rasterised into
// a grid of depths, so that where they meet they run into each other with no wall between; the groove's floor is black,
// its walls bright toward the light and in shade away from it, its edge a short bevel
function carveText(b: MeshBuilder, text: string, xc: number, zBase: number, height: number, stroke: number, track: number, su: number, calli: number) {
  const glyphs = [...text].map((ch) => GLYPHS[ch] ?? GLYPHS[" "]);
  const widths = glyphs.map((g) => g.w * height);
  const total = widths.reduce((a, w) => a + w, 0) + track * (glyphs.length - 1);
  const segs: Array<[number, number, number, number, number]> = []; // u0 v0 u1 v1 half-width
  let u = -total / 2;

  glyphs.forEach((g, k) => {
    const gw = widths[k];

    for (const line of g.strokes) {
      for (let i = 0; i + 1 < line.length; i++) {
        const a: Pt2 = [u + line[i][0] * gw, line[i][1] * height];
        const c: Pt2 = [u + line[i + 1][0] * gw, line[i + 1][1] * height];
        const dv = Math.abs(c[1] - a[1]) / (Math.hypot(c[0] - a[0], c[1] - a[1]) || 1);

        segs.push([a[0], a[1], c[0], c[1], (stroke * (1 - calli * 0.42 + calli * 0.5 * dv)) / 2]);
      }
    }

    u += gw + track;
  });

  const relief = -4.4; // negative: cut into the cover
  const bevel = 1.6; // the groove's edge, from the face down to the floor
  const g = 0.55; // the grid's step
  const pad = stroke;
  const u0 = -total / 2 - pad;
  const v0 = -pad;
  const nx = Math.ceil((total + 2 * pad) / g) + 1;
  const ny = Math.ceil((height + 2 * pad) / g) + 1;
  const H = new Float32Array(nx * ny);

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const pu = u0 + i * g;
      const pv = v0 + j * g;
      let inside = -Infinity; // how far inside the nearest stroke the point is

      for (const [au, av, cu, cv, hw] of segs) {
        const du = cu - au;
        const dv = cv - av;
        const l2 = du * du + dv * dv || 1;
        const t = Math.max(0, Math.min(1, ((pu - au) * du + (pv - av) * dv) / l2));
        const d = Math.hypot(pu - au - du * t, pv - av - dv * t);

        inside = Math.max(inside, hw - d);
      }

      const k = Math.max(0, Math.min(1, inside / bevel));

      H[j * nx + i] = relief * k * k * (3 - 2 * k);
    }
  }

  const P = (i: number, j: number): FwVec3 => [xc + su * (u0 + i * g), HEAD.yTop - H[j * nx + i], zBase - (v0 + j * g)];
  const LU = -0.55;
  const LV = 0.83;

  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const h00 = H[j * nx + i];
      const h10 = H[j * nx + i + 1];
      const h01 = H[(j + 1) * nx + i];
      const h11 = H[(j + 1) * nx + i + 1];

      if (h00 + h10 + h01 + h11 === 0) continue;

      const slopeU = (h10 + h11 - h00 - h01) / (2 * g);
      const slopeV = (h01 + h11 - h00 - h10) / (2 * g);
      const deep = Math.min(h00, h10, h01, h11) / relief;
      const mat = deep > 0.9 ? MAT_TXT_TOP : slopeU * LU + slopeV * LV < 0 ? MAT_TXT_LIT : MAT_TXT_DARK;
      const occ = (h: number) => 1 - 0.4 * (h / relief);

      b.flatTri(P(i, j), P(i + 1, j), P(i + 1, j + 1), [0, -1, 0], mat, occ(h00), occ(h10), occ(h11));
      b.flatTri(P(i, j), P(i + 1, j + 1), P(i, j + 1), [0, -1, 0], mat, occ(h00), occ(h11), occ(h01));
    }
  }
}

// What is stamped on a bank's head: the name and the engine, and the order in which the engine's twelve cylinders fire
export function buildHeadText(b: MeshBuilder, bi: number) {
  const su = bi === 0 ? -1 : 1; // each reads left to right as seen from beside its own bank
  const xc = (HEAD.x0 + HEAD.x1) / 2;
  const stamp = FIRING_ORDER.map((f) => f.no).join("-");

  // the title, as it was written by hand, in the middle of the head
  stampSignature(b, xc, 51.4, su); // its foot: the signature centred in that band, under the plugs, over the cover's edge

  carveText(b, stamp, xc, -28, 26, 6.2, 7, su, 0.5); // engraved, deep, its strokes one continuous groove
}
