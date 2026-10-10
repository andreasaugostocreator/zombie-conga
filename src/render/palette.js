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
