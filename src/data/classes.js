/** Survivor classes. kind: 0 bullet, 1 pellet, 2 knife, 3 pebble. Unlock: how you get them. */
export const CLASSES = {
  cop: { label: 'COP', color: '#7fa6ff', range: 5.2, rate: 2.2, dmg: 2, pellets: 1, spread: 0.05, speed: 15, kind: 0, desc: 'PISTOL. RELIABLE.' },
  farmer: { label: 'FARMER', color: '#ff8a6a', range: 3.4, rate: 0.85, dmg: 1.6, pellets: 5, spread: 0.32, speed: 13, kind: 1, desc: 'SHOTGUN. CLOSE RANGE.' },
  grandma: { label: 'GRANDMA', color: '#d7a6ff', melee: true, range: 1.15, rate: 1.2, dmg: 3, knock: 8, desc: 'FRYING PAN. KNOCKBACK.' },
  nurse: { label: 'NURSE', color: '#ffb3c6', heal: true, desc: 'HEALS YOU AND THE LINE.' },
  chef: { label: 'CHEF', color: '#ffffff', range: 4.6, rate: 1.25, dmg: 2.6, pellets: 1, spread: 0.02, speed: 8, kind: 2, pierce: 2, desc: 'KNIVES THAT PIERCE.', cost: 60, need: '1-3' },
  kid: { label: 'KID', color: '#9bd068', range: 4.2, rate: 3.4, dmg: 0.9, pellets: 1, spread: 0.08, speed: 12, kind: 3, spacing: 0.45, desc: 'FAST SLINGSHOT.', cost: 120, need: '1-6' },
  firefighter: { label: 'FIREFIGHTER', color: '#f4d35e', melee: true, range: 1.25, rate: 0.75, dmg: 7, knock: 4, fireproof: true, desc: 'BIG AXE. FIREPROOF.', cost: 220, need: '2-6' },
  mechanic: { label: 'MECHANIC', color: '#ffb347', melee: true, range: 1.1, rate: 1, dmg: 1.5, knock: 3, turret: 15, desc: 'BUILDS GUN TURRETS.', cost: 340, need: '3-6' },
  soldier: { label: 'SOLDIER', color: '#a3c46a', range: 6, rate: 5.5, dmg: 1.6, pellets: 1, spread: 0.06, speed: 18, kind: 0, desc: 'ASSAULT RIFLE.', cost: 520, need: '4-6' },
};
export const STARTER_CLASSES = ['cop', 'farmer', 'grandma', 'nurse'];
