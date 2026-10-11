// Region palettes. Phase 1 has the Suburbs (day). Survivors are warm and saturated,
// zombies desaturated greens/greys, pickups glow.
export const OUTLINE = '#1c1424';
export const SUBURBS = {
  sky: ['#9fd8d0', '#8fcfc9', '#7fc4c2'],
  grass: ['#5f9e45', '#558f3e', '#6caa4c', '#4b8238'], tuft: '#3f7433', flower: ['#f4d35e', '#ee7b9a', '#f6f1e7'],
  lawn: ['#6aa84b', '#5c9a42'],
  road: ['#4b4f5c', '#535866', '#45495a'], roadLine: '#e8d77a', curb: '#c9c2b2',
  walk: ['#c4bcaa', '#b7af9d'], walkSeam: '#9f9888',
  drive: ['#aaa293', '#9c9485'],
  dirt: ['#8a6a4a', '#7a5c40', '#6b4f36'], stone: '#9b9384',
  houses: [
    { wall: ['#efe3c8', '#d3c5a5', '#b1a385'], trim: '#ffffff', roof: ['#c0564d', '#a2463f', '#7f3631'] },
    { wall: ['#a9c8e6', '#8aaed2', '#6c8fb4'], trim: '#f5f2ea', roof: ['#5b5f73', '#4b4e60', '#3a3c4b'] },
    { wall: ['#f0c0b4', '#d6a093', '#b38074'], trim: '#fbf5ee', roof: ['#6b7d5a', '#59694a', '#46543a'] },
    { wall: ['#f3dc8f', '#d8bf70', '#b49c55'], trim: '#ffffff', roof: ['#8a5a44', '#734a38', '#5b3a2c'] },
  ],
  glass: ['#8fd3ee', '#5aa9cf', '#2e3a4f'], door: ['#7a4a2e', '#5f3a24'],
  fence: ['#f4f0e6', '#d9d1c2', '#b8af9f'],
  hedge: ['#3f7d3a', '#336a31', '#285527', '#5a9a46'],
  leaf: ['#7cbc55', '#5a9e46', '#3e7d3a', '#2c5c2e', '#9bd068'], pine: ['#4d8a4f', '#3a6f40', '#2a5432', '#6aa55e'],
  trunk: ['#7a5236', '#5c3d28'],
  car: [['#d6453d', '#b5372f', '#8e2b25'], ['#3d7bd6', '#3165b3', '#264f8c'], ['#e9e3d6', '#cbc4b5', '#a39c8d'], ['#f2b632', '#d39a22', '#a87818']],
  metal: ['#c9ccd3', '#a3a7b1', '#7b7f8a'], tire: '#24222b',
  shadow: 'rgba(28,20,44,0.30)',
  blood: ['#7a1f24', '#5e171c', '#9a2a2c'],
};
export const CHAR = {
  skin: ['#f2c7a2', '#d9a47c', '#a86f4c', '#7c4f36'],
  hair: ['#3b2a20', '#7a4a2a', '#e3b04b', '#c9c3b8', '#1f1a1a'],
  cop: { shirt: '#3a5fb5', shirt2: '#2a4689', pants: '#25335c', hat: '#22305a', badge: '#f4c542' },
  zskin: ['#9bb38a', '#7d9670', '#6a8261'], zcloth: ['#6d6a73', '#7d7262', '#5f6b6e', '#7a6e7e'], zpants: ['#4a4652', '#53483d'],
  zeye: '#e04a3a', mouth: '#4a1f24',
  shoes: '#2a2230', gun: '#2b2b33', white: '#ffffff',
};

/* ------------------------------------------------------------------------------------------
   All seven regions. Each is a limited palette (about 20 colours) on top of shared basics, so a
   region reads as one place. Ground characters: '.' base  'l' alt ground  'r' road  ':' walkway
   'd' concrete  'b' decor  'o' dirt  'w' water  'p' planks  'f' floor tiles  't' white tiles
   's' sand  'R' runway.
   ------------------------------------------------------------------------------------------ */
const BASE = {
  water: ['#3f8fb5', '#357ea2', '#4ea3c6'], foam: '#d6eef2', plank: ['#a07448', '#8a6038', '#6f4b2a'],
  floor: ['#e9dfcf', '#d8ccb8'], tile: ['#e8ecef', '#d5dbe0'], grout: '#bfc6cc', sand: ['#d9c08a', '#cbb07a', '#e3cd9b'],
  runway: ['#545866', '#5c616f'], runLine: '#f2efe6', concrete: ['#b9b6ae', '#aaa69d'],
};
export const REGIONS = [
  { ...BASE, ...SUBURBS, key: 'suburbs', name: 'SUBURBS', night: false },
  { ...BASE, ...SUBURBS, key: 'mall', name: 'SHOPPING MALL', night: false,
    sky: ['#f2d7c4', '#e8c4b0', '#dbb09f'], grass: ['#e3d6c2', '#d8cab4', '#ece0cd', '#cdbfa8'], tuft: '#c4b49b', lawn: ['#7fb069', '#6f9e5c'],
    floor: ['#efe4d3', '#ded0bc'], dirt: ['#a68b6c', '#8f7558', '#76604a'],
    houses: [
      { wall: ['#f2b8a0', '#d99a82', '#b57b66'], trim: '#ffffff', roof: ['#d9d2c6', '#c4bcae', '#a8a091'], sign: '#e2384a', awning: ['#e2384a', '#ffffff'] },
      { wall: ['#a8d5c2', '#88bba6', '#6a9c88'], trim: '#ffffff', roof: ['#d9d2c6', '#c4bcae', '#a8a091'], sign: '#3d7bd6', awning: ['#3d7bd6', '#ffffff'] },
      { wall: ['#f3dc8f', '#d8bf70', '#b49c55'], trim: '#ffffff', roof: ['#d9d2c6', '#c4bcae', '#a8a091'], sign: '#9a6bb8', awning: ['#9a6bb8', '#f4f1ea'] },
      { wall: ['#c9c2e6', '#aaa2cc', '#8a82ac'], trim: '#ffffff', roof: ['#d9d2c6', '#c4bcae', '#a8a091'], sign: '#2f8f57', awning: ['#2f8f57', '#ffffff'] },
    ],
    wall: ['#cfc6b8', '#b7ad9e', '#968c7d'] },
  { ...BASE, ...SUBURBS, key: 'hospital', name: 'HOSPITAL', night: true,
    sky: ['#2b2f4a', '#252840', '#1f2136'], grass: ['#4f7a52', '#476e4a', '#5a8a5c', '#3f6342'], lawn: ['#567f57', '#4b734c'],
    houses: [
      { wall: ['#eef1f3', '#d3d8dc', '#aeb5bb'], trim: '#c9d3da', roof: ['#b9c0c6', '#a3aab0', '#878e94'], cross: '#e2384a' },
      { wall: ['#dfe9f0', '#c3d0da', '#9eabb6'], trim: '#ffffff', roof: ['#9aa3ab', '#858d95', '#6c737a'], cross: '#e2384a' },
    ] },
  { ...BASE, ...SUBURBS, key: 'downtown', name: 'DOWNTOWN', night: false,
    sky: ['#c9d6e3', '#b5c5d6', '#a3b5c8'], grass: ['#8d9a8a', '#828f80', '#99a696', '#768372'], lawn: ['#6f9e5c', '#62904f'],
    walk: ['#b3ada3', '#a49e94'], drive: ['#9c968c', '#8f897f'],
    houses: [
      { wall: ['#8fa3b8', '#768ba1', '#5d7186'], trim: '#c9d3da', roof: ['#6b7280', '#5a606d', '#484d59'], glass: '#a9d1ea' },
      { wall: ['#c9b49a', '#b09b81', '#8f7c64'], trim: '#e9e0d0', roof: ['#7a7166', '#665e54', '#524b43'], glass: '#9cc4e0' },
      { wall: ['#6f7a8c', '#5c6676', '#48505e'], trim: '#a8b2c0', roof: ['#4e5462', '#41464f', '#33373f'], glass: '#7fb6d6' },
      { wall: ['#b8a3a0', '#9e8986', '#7f6c69'], trim: '#ddd2cf', roof: ['#6e6464', '#5c5353', '#4a4242'], glass: '#a3cfe6' },
    ] },
  { ...BASE, ...SUBURBS, key: 'harbor', name: 'HARBOR', night: false,
    sky: ['#a9d2e0', '#94c4d6', '#80b5ca'], grass: ['#9aa39a', '#8e978e', '#a6afa6', '#828b82'], dirt: ['#7d756b', '#6a635a', '#57514a'],
    houses: [
      { wall: ['#d6453d', '#b5372f', '#8e2b25'], trim: '#e8e0d0', roof: ['#c23f37', '#a23530', '#7f2a26'] },
      { wall: ['#3d7bd6', '#3165b3', '#264f8c'], trim: '#e8e0d0', roof: ['#3a72c6', '#305fa6', '#264c85'] },
      { wall: ['#f2b632', '#d39a22', '#a87818'], trim: '#e8e0d0', roof: ['#e5aa2c', '#c4901e', '#9c7016'] },
      { wall: ['#4f8a3c', '#3f7533', '#2f5a27'], trim: '#e8e0d0', roof: ['#4a8238', '#3c6d2f', '#2d5424'] },
      { wall: ['#a3a7b1', '#868a94', '#6a6e77'], trim: '#d6d9df', roof: ['#9b9fa9', '#80848e', '#656972'] },
    ] },
  { ...BASE, ...SUBURBS, key: 'military', name: 'MILITARY BASE', night: true,
    sky: ['#3a3a2e', '#33332a', '#2b2b24'], grass: ['#8a8457', '#7d774d', '#958f62', '#6f6a44'], lawn: ['#6c7a45', '#60703c'],
    dirt: ['#8a7350', '#776143', '#635037'], road: ['#7a6f5a', '#847862', '#706651'], roadLine: '#d9cfa8',
    houses: [
      { wall: ['#7d8456', '#6a7147', '#565c39'], trim: '#9aa16e', roof: ['#6f7a45', '#5f6939', '#4e562e'] },
      { wall: ['#a39f93', '#8c887d', '#737065'], trim: '#c4c0b4', roof: ['#8a867b', '#757166', '#5f5c53'] },
    ] },
  { ...BASE, ...SUBURBS, key: 'airport', name: 'AIRPORT', night: false,
    sky: ['#f6c79a', '#eeb088', '#e39a7a'], grass: ['#7aa35c', '#6d9450', '#87b067', '#5f8545'],
    houses: [
      { wall: ['#d9e3ea', '#bccad4', '#98a8b4'], trim: '#ffffff', roof: ['#b7c2ca', '#9fabb4', '#86919a'], glass: '#8fc3e3' },
      { wall: ['#c9c4bb', '#b0aba2', '#908b83'], trim: '#e8e3da', roof: ['#9d988f', '#88837b', '#716d66'], glass: '#7fb2d4' },
    ] },
];
