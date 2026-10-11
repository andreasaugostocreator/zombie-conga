/**
 * All 42 levels, hand-edited. Fields:
 *  id, name, region (0-6), seed (map generator seed; region 0 level 1 uses the hand-made map),
 *  obj: { type: 'survive' | 'rescue' | 'escort' | 'defend' | 'boss', time (s), count, boss },
 *  night: dark level with limited vision,
 *  z: zombies { start, max, grow (extra per 20 s), mix { type: weight } },
 *  survivors: how many wait for rescue at once,
 *  stars: [2nd star: { line: n } survivors in the line at the end,
 *          3rd star: { nobite } | { nohit } | { time: s } | { kills: n } | { line: n }],
 *  cans: reward for clearing.
 */
const W = (o) => o;
export const LEVELS = [
  // ── 1 SUBURBS ─────────────────────────────────────────────────────────────
  W({ id: '1-1', name: 'MAPLE STREET', region: 0, seed: 1, map: 'suburbs-test', obj: { type: 'survive', time: 75 }, z: { start: 6, max: 16, grow: 3, mix: { walker: 1 } }, survivors: 5, stars: [{ line: 3 }, { nobite: true }], cans: 15 }),
  W({ id: '1-2', name: 'BAKE SALE', region: 0, seed: 2, obj: { type: 'rescue', count: 4 }, z: { start: 8, max: 20, grow: 3, mix: { walker: 1 } }, survivors: 5, stars: [{ line: 4 }, { time: 150 }], cans: 18 }),
  W({ id: '1-3', name: 'PICKET FENCES', region: 0, seed: 3, obj: { type: 'survive', time: 95 }, z: { start: 10, max: 26, grow: 4, mix: { walker: 0.8, runner: 0.2 } }, survivors: 5, stars: [{ line: 4 }, { kills: 70 }], cans: 20 }),
  W({ id: '1-4', name: 'SCHOOL RUN', region: 0, seed: 4, obj: { type: 'escort' }, z: { start: 10, max: 28, grow: 4, mix: { walker: 0.75, runner: 0.25 } }, survivors: 5, stars: [{ line: 4 }, { nobite: true }], cans: 22 }),
  W({ id: '1-5', name: 'CUL-DE-SAC', region: 0, seed: 5, obj: { type: 'defend', time: 110 }, z: { start: 12, max: 32, grow: 5, mix: { walker: 0.7, runner: 0.2, brute: 0.1 } }, survivors: 5, stars: [{ line: 5 }, { nohit: true }], cans: 25 }),
  W({ id: '1-6', name: 'RETURN TO SENDER', region: 0, seed: 6, obj: { type: 'boss', boss: 'mailman' }, z: { start: 8, max: 24, grow: 3, mix: { walker: 0.7, runner: 0.3 } }, survivors: 5, stars: [{ line: 5 }, { time: 180 }], cans: 40 }),
  // ── 2 SHOPPING MALL ───────────────────────────────────────────────────────
  W({ id: '2-1', name: 'GRAND OPENING', region: 1, seed: 11, obj: { type: 'survive', time: 110 }, z: { start: 12, max: 34, grow: 5, mix: { walker: 0.6, runner: 0.25, bloater: 0.15 } }, survivors: 5, stars: [{ line: 5 }, { kills: 90 }], cans: 30 }),
  W({ id: '2-2', name: 'CLEARANCE SALE', region: 1, seed: 12, obj: { type: 'rescue', count: 6 }, z: { start: 14, max: 36, grow: 5, mix: { walker: 0.6, runner: 0.25, bloater: 0.15 } }, survivors: 6, stars: [{ line: 6 }, { time: 170 }], cans: 32 }),
  W({ id: '2-3', name: 'FOOD COURT', region: 1, seed: 13, obj: { type: 'survive', time: 120 }, z: { start: 14, max: 40, grow: 6, mix: { walker: 0.5, runner: 0.2, bloater: 0.15, crawler: 0.15 } }, survivors: 5, stars: [{ line: 6 }, { nobite: true }], cans: 34 }),
  W({ id: '2-4', name: 'DELIVERY VAN', region: 1, seed: 14, obj: { type: 'escort' }, z: { start: 14, max: 40, grow: 6, mix: { walker: 0.5, runner: 0.25, bloater: 0.1, crawler: 0.15 } }, survivors: 5, stars: [{ line: 5 }, { nohit: true }], cans: 36 }),
  W({ id: '2-5', name: 'SECURITY OFFICE', region: 1, seed: 15, obj: { type: 'defend', time: 130 }, z: { start: 16, max: 44, grow: 6, mix: { walker: 0.5, runner: 0.2, bloater: 0.1, crawler: 0.1, brute: 0.1 } }, survivors: 6, stars: [{ line: 7 }, { kills: 130 }], cans: 38 }),
  W({ id: '2-6', name: 'MALL SANTA', region: 1, seed: 16, obj: { type: 'boss', boss: 'santa' }, z: { start: 10, max: 30, grow: 4, mix: { walker: 0.5, runner: 0.3, bloater: 0.2 } }, survivors: 6, stars: [{ line: 7 }, { time: 200 }], cans: 60 }),
  // ── 3 HOSPITAL (nights begin) ─────────────────────────────────────────────
  W({ id: '3-1', name: 'NIGHT SHIFT', region: 2, seed: 21, night: true, obj: { type: 'survive', time: 120 }, z: { start: 14, max: 44, grow: 6, mix: { walker: 0.5, runner: 0.2, crawler: 0.15, spitter: 0.15 } }, survivors: 6, stars: [{ line: 6 }, { nobite: true }], cans: 42 }),
  W({ id: '3-2', name: 'TRIAGE', region: 2, seed: 22, obj: { type: 'rescue', count: 7 }, z: { start: 16, max: 46, grow: 6, mix: { walker: 0.45, runner: 0.25, bloater: 0.1, spitter: 0.2 } }, survivors: 7, stars: [{ line: 7 }, { time: 190 }], cans: 44 }),
  W({ id: '3-3', name: 'CODE RED', region: 2, seed: 23, night: true, obj: { type: 'survive', time: 130 }, z: { start: 16, max: 50, grow: 7, mix: { walker: 0.45, runner: 0.2, crawler: 0.1, spitter: 0.1, screamer: 0.15 } }, survivors: 6, stars: [{ line: 7 }, { kills: 160 }], cans: 46 }),
  W({ id: '3-4', name: 'AMBULANCE', region: 2, seed: 24, night: true, obj: { type: 'escort' }, z: { start: 16, max: 50, grow: 7, mix: { walker: 0.5, runner: 0.25, spitter: 0.15, brute: 0.1 } }, survivors: 6, stars: [{ line: 6 }, { nobite: true }], cans: 48 }),
  W({ id: '3-5', name: 'QUARANTINE', region: 2, seed: 25, night: true, obj: { type: 'defend', time: 140 }, z: { start: 18, max: 54, grow: 7, mix: { walker: 0.4, runner: 0.2, bloater: 0.1, spitter: 0.1, screamer: 0.1, brute: 0.1 } }, survivors: 7, stars: [{ line: 8 }, { nohit: true }], cans: 50 }),
  W({ id: '3-6', name: 'PATIENT ZERO', region: 2, seed: 26, night: true, obj: { type: 'boss', boss: 'pz' }, z: { start: 12, max: 36, grow: 5, mix: { walker: 0.5, runner: 0.3, crawler: 0.2 } }, survivors: 7, stars: [{ line: 8 }, { time: 220 }], cans: 80 }),
  // ── 4 DOWNTOWN ────────────────────────────────────────────────────────────
  W({ id: '4-1', name: 'RUSH HOUR', region: 3, seed: 31, obj: { type: 'survive', time: 130 }, z: { start: 18, max: 56, grow: 7, mix: { walker: 0.4, runner: 0.3, riot: 0.15, bloater: 0.15 } }, survivors: 7, stars: [{ line: 8 }, { kills: 180 }], cans: 55 }),
  W({ id: '4-2', name: 'OFFICE PARTY', region: 3, seed: 32, obj: { type: 'rescue', count: 8 }, z: { start: 18, max: 58, grow: 7, mix: { walker: 0.4, runner: 0.3, riot: 0.15, spitter: 0.15 } }, survivors: 8, stars: [{ line: 8 }, { time: 200 }], cans: 57 }),
  W({ id: '4-3', name: 'GRIDLOCK', region: 3, seed: 33, obj: { type: 'survive', time: 140 }, z: { start: 20, max: 62, grow: 8, mix: { walker: 0.35, runner: 0.25, riot: 0.15, screamer: 0.1, brute: 0.15 } }, survivors: 7, stars: [{ line: 9 }, { nobite: true }], cans: 59 }),
  W({ id: '4-4', name: 'CITY BUS', region: 3, seed: 34, obj: { type: 'escort' }, z: { start: 20, max: 62, grow: 8, mix: { walker: 0.4, runner: 0.3, riot: 0.15, bloater: 0.15 } }, survivors: 7, stars: [{ line: 8 }, { nohit: true }], cans: 61 }),
  W({ id: '4-5', name: 'RADIO TOWER', region: 3, seed: 35, obj: { type: 'defend', time: 150 }, z: { start: 22, max: 66, grow: 8, mix: { walker: 0.35, runner: 0.25, riot: 0.15, spitter: 0.1, brute: 0.15 } }, survivors: 8, stars: [{ line: 9 }, { kills: 220 }], cans: 63 }),
  W({ id: '4-6', name: 'THE TANK', region: 3, seed: 36, obj: { type: 'boss', boss: 'tank' }, z: { start: 14, max: 40, grow: 5, mix: { walker: 0.4, runner: 0.3, riot: 0.3 } }, survivors: 8, stars: [{ line: 9 }, { time: 240 }], cans: 100 }),
  // ── 5 HARBOR ──────────────────────────────────────────────────────────────
  W({ id: '5-1', name: 'LOW TIDE', region: 4, seed: 41, obj: { type: 'survive', time: 140 }, z: { start: 20, max: 64, grow: 8, mix: { walker: 0.35, runner: 0.25, dog: 0.2, fish: 0.2 } }, survivors: 8, stars: [{ line: 9 }, { kills: 220 }], cans: 70 }),
  W({ id: '5-2', name: 'LOST CREW', region: 4, seed: 42, obj: { type: 'rescue', count: 8 }, z: { start: 20, max: 66, grow: 8, mix: { walker: 0.3, runner: 0.3, dog: 0.2, fish: 0.2 } }, survivors: 8, stars: [{ line: 9 }, { time: 210 }], cans: 72 }),
  W({ id: '5-3', name: 'FOG BANK', region: 4, seed: 43, night: true, obj: { type: 'survive', time: 150 }, z: { start: 22, max: 68, grow: 9, mix: { walker: 0.3, runner: 0.2, dog: 0.2, fish: 0.15, crawler: 0.15 } }, survivors: 8, stars: [{ line: 10 }, { nobite: true }], cans: 74 }),
  W({ id: '5-4', name: 'CARGO RUN', region: 4, seed: 44, obj: { type: 'escort' }, z: { start: 22, max: 70, grow: 9, mix: { walker: 0.3, runner: 0.25, dog: 0.2, brute: 0.1, fish: 0.15 } }, survivors: 8, stars: [{ line: 9 }, { nohit: true }], cans: 76 }),
  W({ id: '5-5', name: 'LIGHTHOUSE', region: 4, seed: 45, night: true, obj: { type: 'defend', time: 160 }, z: { start: 24, max: 74, grow: 9, mix: { walker: 0.3, runner: 0.2, dog: 0.15, fish: 0.15, screamer: 0.1, brute: 0.1 } }, survivors: 9, stars: [{ line: 10 }, { kills: 260 }], cans: 78 }),
  W({ id: '5-6', name: 'THE CAPTAIN', region: 4, seed: 46, obj: { type: 'boss', boss: 'captain' }, z: { start: 16, max: 44, grow: 6, mix: { walker: 0.4, fish: 0.4, dog: 0.2 } }, survivors: 9, stars: [{ line: 10 }, { time: 260 }], cans: 120 }),
  // ── 6 MILITARY BASE ───────────────────────────────────────────────────────
  W({ id: '6-1', name: 'BOOT CAMP', region: 5, seed: 51, obj: { type: 'survive', time: 150 }, z: { start: 24, max: 76, grow: 9, mix: { walker: 0.3, runner: 0.25, riot: 0.15, brute: 0.1, dog: 0.2 } }, survivors: 9, stars: [{ line: 10 }, { kills: 260 }], cans: 85 }),
  W({ id: '6-2', name: 'MISSING IN ACTION', region: 5, seed: 52, obj: { type: 'rescue', count: 9 }, z: { start: 24, max: 78, grow: 9, mix: { walker: 0.3, runner: 0.25, riot: 0.15, spitter: 0.15, dog: 0.15 } }, survivors: 9, stars: [{ line: 10 }, { time: 230 }], cans: 87 }),
  W({ id: '6-3', name: 'MINEFIELD', region: 5, seed: 53, night: true, obj: { type: 'survive', time: 160 }, z: { start: 26, max: 80, grow: 10, mix: { walker: 0.3, runner: 0.25, crawler: 0.15, bloater: 0.15, riot: 0.15 } }, survivors: 9, stars: [{ line: 11 }, { nobite: true }], cans: 89 }),
  W({ id: '6-4', name: 'CONVOY', region: 5, seed: 54, obj: { type: 'escort' }, z: { start: 26, max: 82, grow: 10, mix: { walker: 0.25, runner: 0.25, riot: 0.2, brute: 0.15, dog: 0.15 } }, survivors: 9, stars: [{ line: 10 }, { nohit: true }], cans: 91 }),
  W({ id: '6-5', name: 'LAST STAND', region: 5, seed: 55, obj: { type: 'defend', time: 170 }, z: { start: 28, max: 86, grow: 10, mix: { walker: 0.25, runner: 0.2, riot: 0.15, brute: 0.15, spitter: 0.1, screamer: 0.15 } }, survivors: 10, stars: [{ line: 12 }, { kills: 320 }], cans: 93 }),
  W({ id: '6-6', name: 'GENERAL ROT', region: 5, seed: 56, obj: { type: 'boss', boss: 'general' }, z: { start: 18, max: 50, grow: 6, mix: { walker: 0.3, runner: 0.3, riot: 0.2, dog: 0.2 } }, survivors: 10, stars: [{ line: 12 }, { time: 280 }], cans: 140 }),
  // ── 7 AIRPORT ─────────────────────────────────────────────────────────────
  W({ id: '7-1', name: 'DEPARTURES', region: 6, seed: 61, obj: { type: 'survive', time: 160 }, z: { start: 28, max: 90, grow: 10, mix: { walker: 0.25, runner: 0.25, dog: 0.15, riot: 0.1, bloater: 0.1, brute: 0.15 } }, survivors: 10, stars: [{ line: 12 }, { kills: 320 }], cans: 100 }),
  W({ id: '7-2', name: 'LOST LUGGAGE', region: 6, seed: 62, obj: { type: 'rescue', count: 10 }, z: { start: 28, max: 92, grow: 10, mix: { walker: 0.25, runner: 0.25, dog: 0.15, spitter: 0.15, riot: 0.1, screamer: 0.1 } }, survivors: 10, stars: [{ line: 12 }, { time: 250 }], cans: 103 }),
  W({ id: '7-3', name: 'RED EYE', region: 6, seed: 63, night: true, obj: { type: 'survive', time: 170 }, z: { start: 30, max: 96, grow: 11, mix: { walker: 0.25, runner: 0.25, crawler: 0.15, dog: 0.15, brute: 0.1, screamer: 0.1 } }, survivors: 10, stars: [{ line: 13 }, { nobite: true }], cans: 106 }),
  W({ id: '7-4', name: 'FUEL TRUCK', region: 6, seed: 64, obj: { type: 'escort' }, z: { start: 30, max: 96, grow: 11, mix: { walker: 0.25, runner: 0.25, riot: 0.15, brute: 0.15, dog: 0.2 } }, survivors: 10, stars: [{ line: 12 }, { nohit: true }], cans: 109 }),
  W({ id: '7-5', name: 'CONTROL TOWER', region: 6, seed: 65, night: true, obj: { type: 'defend', time: 180 }, z: { start: 32, max: 100, grow: 11, mix: { walker: 0.2, runner: 0.25, riot: 0.15, brute: 0.15, spitter: 0.1, bloater: 0.15 } }, survivors: 11, stars: [{ line: 14 }, { kills: 400 }], cans: 112 }),
  W({ id: '7-6', name: 'THE HIVE', region: 6, seed: 66, obj: { type: 'boss', boss: 'hive' }, z: { start: 20, max: 60, grow: 8, mix: { walker: 0.4, runner: 0.3, dog: 0.3 } }, survivors: 11, stars: [{ line: 14 }, { time: 320 }], cans: 200 }),
];
export const levelIndex = id => LEVELS.findIndex(l => l.id === id);
export const OBJECTIVE_TEXT = {
  survive: l => `SURVIVE ${Math.floor(l.obj.time / 60)}:${String(l.obj.time % 60).padStart(2, '0')} UNTIL THE CHOPPER COMES`,
  rescue: l => `RESCUE ${l.obj.count} SURVIVORS, THEN REACH THE FLARE`,
  escort: () => 'KEEP THE BUS SAFE TO THE END OF THE ROAD',
  defend: l => `DEFEND THE RADIO TOWER FOR ${Math.floor(l.obj.time / 60)}:${String(l.obj.time % 60).padStart(2, '0')}`,
  boss: () => 'TAKE DOWN THE BOSS',
};
export const starText = s => s.line ? `${s.line} IN YOUR LINE AT THE END` : s.nobite ? 'NOBODY GETS BITTEN' : s.nohit ? 'NEVER GET HURT' : s.time ? `CLEAR IN UNDER ${Math.floor(s.time / 60)}:${String(s.time % 60).padStart(2, '0')}` : s.kills ? `KILL ${s.kills} ZOMBIES` : '';
