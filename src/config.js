// Iso grid: a tile is a 16×8 diamond; one height unit (one "block") is 8 px tall.
export const TW = 16, TH = 8, HW = 8, HH = 4, ZH = 8;
// Target internal resolution (portrait). The real size adapts to the screen's aspect ratio.
export const BASE_W = 216, BASE_H = 384;
export const STEP = 1 / 60; // fixed update step

export const TUNING = {
  leaderSpeed: 3.3,      // tiles per second
  leaderRadius: 0.24,
  hearts: 3,
  hurtInvuln: 1.3,       // seconds of blinking after a hit
  pistol: { range: 5.5, rate: 3.2, damage: 2, speed: 15, spread: 0.04 },
  walker: { speed: 0.85, hp: 5, radius: 0.24, contact: 0.42 },
  maxZombies: 300,
  testZombies: 28,       // how many walkers the Phase 1 test map keeps alive
};
