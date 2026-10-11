/** Zombie types. hp, speed (tiles/s), radius, contact distance, XP brains, can drop chance. */
export const ZOMBIES = {
  walker: { hp: 5, speed: 0.85, r: 0.24, contact: 0.42, xp: 1, cans: 0.08 },
  runner: { hp: 3, speed: 2.0, r: 0.22, contact: 0.4, xp: 1, cans: 0.1 },
  brute: { hp: 34, speed: 0.62, r: 0.36, contact: 0.6, xp: 4, cans: 0.6, scale: 2, shove: true },
  bloater: { hp: 9, speed: 0.55, r: 0.32, contact: 0.5, xp: 2, cans: 0.2, explode: 1.6 },
  spitter: { hp: 6, speed: 0.8, r: 0.24, contact: 0.42, xp: 2, cans: 0.15, spit: 4.5 },
  crawler: { hp: 4, speed: 1.2, r: 0.22, contact: 0.38, xp: 1, cans: 0.1, low: true },
  screamer: { hp: 7, speed: 0.7, r: 0.24, contact: 0.42, xp: 3, cans: 0.3, scream: 7 },
  riot: { hp: 16, speed: 0.75, r: 0.28, contact: 0.45, xp: 3, cans: 0.3, shield: true },
  dog: { hp: 2.5, speed: 2.8, r: 0.22, contact: 0.4, xp: 1, cans: 0.05, pack: 3 },
  fish: { hp: 5, speed: 1.1, r: 0.24, contact: 0.42, xp: 1, cans: 0.1 },
  elf: { hp: 2, speed: 1.9, r: 0.18, contact: 0.36, xp: 1, cans: 0.05 },
};
/** Region bosses. scale = sprite size multiple. */
export const BOSSES = {
  mailman: { name: 'THE MAILMAN', hp: 240, speed: 0.75, r: 0.6, contact: 0.85, scale: 3 },
  santa: { name: 'MALL SANTA', hp: 320, speed: 0.6, r: 0.6, contact: 0.85, scale: 3 },
  pz: { name: 'PATIENT ZERO', hp: 200, speed: 0.8, r: 0.55, contact: 0.8, scale: 3, split: 2 },
  tank: { name: 'THE TANK', hp: 460, speed: 0.7, r: 0.75, contact: 1.0, scale: 1, shield: true },
  captain: { name: 'THE CAPTAIN', hp: 420, speed: 0.7, r: 0.6, contact: 0.85, scale: 3 },
  general: { name: 'GENERAL ROT', hp: 520, speed: 0.55, r: 0.75, contact: 1.0, scale: 1 },
  hive: { name: 'THE HIVE', hp: 1100, speed: 0, r: 1.3, contact: 1.5, scale: 1 },
};
