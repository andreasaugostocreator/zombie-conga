/** Run upgrades: offered as level-up cards. Each stacks to level 5 (max: 1 for one-offs). */
export const UPGRADES = [
  { id: 'rate', name: 'RAPID FIRE', desc: ['EVERYONE SHOOTS', '15% FASTER'], icon: 'rate' },
  { id: 'damage', name: 'BIGGER AMMO', desc: ['+25% DAMAGE', 'FOR THE WHOLE LINE'], icon: 'damage' },
  { id: 'pierce', name: 'PIERCING', desc: ['SHOTS GO THROUGH', 'ONE MORE ZOMBIE'], icon: 'pierce' },
  { id: 'ricochet', name: 'RICOCHET', desc: ['BULLETS BOUNCE', 'TO ANOTHER ZOMBIE'], icon: 'ricochet' },
  { id: 'speed', name: 'SNEAKERS', desc: ['LEADER MOVES', '10% FASTER'], icon: 'speed' },
  { id: 'magnet', name: 'MAGNET', desc: ['GRAB PICKUPS FROM', 'FARTHER AWAY'], icon: 'magnet' },
  { id: 'heart', name: 'FIRST AID', desc: ['+1 HEART', '(UP TO 5)'], icon: 'heart' },
  { id: 'tough', name: 'TOUGH SKIN', desc: ['SURVIVORS SHRUG', 'OFF ONE BITE'], icon: 'tough' },
  { id: 'medic', name: 'MEDIC', desc: ['SAVES A BITTEN', 'SURVIVOR EACH MINUTE'], icon: 'medic' },
  { id: 'barbed', name: 'BARBED WIRE', desc: ['ZOMBIES TOUCHING', 'THE LINE GET HURT'], icon: 'barbed' },
  { id: 'saw', name: 'CHAINSAW', desc: ['A SAW BLADE', 'CIRCLES YOU'], icon: 'saw' },
  { id: 'molotov', name: 'MOLOTOV', desc: ['THE LINE DROPS', 'FIRE BOMBS'], icon: 'molotov' },
  { id: 'grenade', name: 'GRENADES', desc: ['THE LAST SURVIVOR', 'THROWS GRENADES'], icon: 'grenade' },
  { id: 'recruits', name: 'VETERANS', desc: ['NEW RECRUITS JOIN', 'ALREADY LEVELLED'], icon: 'recruits' },
  { id: 'radar', name: 'RESCUE RADAR', desc: ['ARROW TO THE', 'NEAREST SURVIVOR'], icon: 'radar', max: 1 },
];

/** Base Camp: permanent upgrades bought with cans. */
export const CAMP = [
  { id: 'hearts', name: 'STURDY BOOTS', desc: '+1 STARTING HEART', costs: [90, 240] },
  { id: 'start', name: 'BUDDY SYSTEM', desc: 'START WITH A SURVIVOR', costs: [60, 160, 320] },
  { id: 'xp', name: 'BIG BRAIN', desc: '+15% BRAINS', costs: [50, 130, 260] },
  { id: 'magnet', name: 'CAN OPENER', desc: '+40% PICKUP RANGE', costs: [40, 110, 220] },
  { id: 'reroll', name: 'SECOND THOUGHTS', desc: '+1 CARD REROLL', costs: [70, 180, 360] },
  { id: 'damage', name: 'GUN OIL', desc: '+10% DAMAGE', costs: [80, 200, 400] },
];

/** Achievements with pixel badges (icon names from sprites.makeIcon). */
export const ACHIEVEMENTS = [
  { id: 'rescue1', name: 'FIRST RESCUE', desc: 'SAVE A SURVIVOR', icon: 'conga' },
  { id: 'line10', name: 'CONGA TEN', desc: 'A LINE OF 10', icon: 'conga' },
  { id: 'line20', name: 'FULL CONGA', desc: 'A LINE OF 20', icon: 'conga' },
  { id: 'kills500', name: 'ZOMBIE HUNTER', desc: '500 ZOMBIES IN TOTAL', icon: 'damage' },
  { id: 'kills5000', name: 'EXTERMINATOR', desc: '5000 ZOMBIES IN TOTAL', icon: 'damage' },
  { id: 'nohit', name: 'UNTOUCHABLE', desc: 'CLEAR A LEVEL UNHURT', icon: 'tough' },
  { id: 'nobite', name: 'NOBODY LEFT BEHIND', desc: 'CLEAR WITH NO BITES', icon: 'medic' },
  { id: 'boom', name: 'CHAIN REACTION', desc: 'BLOW 3 BARRELS AT ONCE', icon: 'grenade' },
  { id: 'stars30', name: 'STAR STUDENT', desc: 'EARN 30 STARS', icon: 'star' },
  { id: 'stars126', name: 'PERFECTIONIST', desc: 'EARN ALL 126 STARS', icon: 'star' },
  { id: 'boss_mailman', name: 'RETURN TO SENDER', desc: 'BEAT THE MAILMAN', icon: 'skull' },
  { id: 'boss_santa', name: 'NAUGHTY LIST', desc: 'BEAT MALL SANTA', icon: 'skull' },
  { id: 'boss_pz', name: 'CURED', desc: 'BEAT PATIENT ZERO', icon: 'skull' },
  { id: 'boss_tank', name: 'TANK BUSTER', desc: 'BEAT THE TANK', icon: 'skull' },
  { id: 'boss_captain', name: 'MAN OVERBOARD', desc: 'BEAT THE CAPTAIN', icon: 'skull' },
  { id: 'boss_general', name: 'AT EASE', desc: 'BEAT GENERAL ROT', icon: 'skull' },
  { id: 'boss_hive', name: 'WHEELS UP', desc: 'ESCAPE THE HIVE', icon: 'skull' },
  { id: 'daily3', name: 'DAILY DEVOTION', desc: '3-DAY DAILY STREAK', icon: 'flame' },
  { id: 'endless5', name: 'ENDLESS NIGHT', desc: '5 MINUTES IN ENDLESS', icon: 'flame' },
];

/** Daily challenge modifiers. */
export const MODIFIERS = [
  { id: 'grandmas', name: 'ONLY GRANDMAS', desc: 'EVERY SURVIVOR IS A GRANDMA' },
  { id: 'runners', name: 'RUSH HOUR', desc: 'EVERY ZOMBIE IS A RUNNER' },
  { id: 'night', name: 'LIGHTS OUT', desc: 'IT IS NIGHT' },
  { id: 'double', name: 'DOUBLE TROUBLE', desc: 'TWICE THE ZOMBIES' },
  { id: 'glass', name: 'GLASS CANNON', desc: '1 HEART, DOUBLE DAMAGE' },
  { id: 'brutes', name: 'BIG BOYS', desc: 'BRUTES EVERYWHERE' },
];
