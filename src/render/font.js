import { makeCanvas } from './screen.js';
// 3×5 pixel font, drawn in code. Each glyph: 5 rows of 3 bits.
const G = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  '!': '010010010000010', '?': '110001010000010', '.': '000000000000010', ':': '000010000010000', '-': '000000111000000', '+': '000010111010000',
  '/': '001001010100100', "'": '010010000000000', ',': '000000000010100', ' ': '000000000000000', 'x': '000101010101000', '%': '101001010100101',
};
const cache = new Map();
function glyphSheet(color, outline) {
  const key = color + outline;
  if (cache.has(key)) return cache.get(key);
  const chars = Object.keys(G), cw = outline ? 5 : 3, ch = outline ? 7 : 5;
  const [c, x] = makeCanvas(chars.length * cw, ch);
  chars.forEach((k, i) => {
    const bits = G[k], ox = i * cw + (outline ? 1 : 0), oy = outline ? 1 : 0;
    if (outline) {
      x.fillStyle = outline;
      for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (bits[r * 3 + q] === '1')
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.fillRect(ox + q + dx, oy + r + dy, 1, 1);
    }
    x.fillStyle = color;
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (bits[r * 3 + q] === '1') x.fillRect(ox + q, oy + r, 1, 1);
  });
  const sheet = { c, cw, ch, index: new Map(chars.map((k, i) => [k, i])) };
  cache.set(key, sheet);
  return sheet;
}
/** Draws text with the pixel font. scale is a whole number. Returns the width drawn. */
export function text(ctx, str, x, y, { color = '#ffffff', outline = '#1c1424', scale = 1, align = 'left' } = {}) {
  const sh = glyphSheet(color, outline), adv = 4 * scale;
  str = String(str).toUpperCase();
  const width = str.length * adv - scale + (outline ? 2 * scale : 0);
  let cx = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
  for (const chr of str) {
    const i = sh.index.get(chr) ?? sh.index.get('?');
    ctx.drawImage(sh.c, i * sh.cw, 0, sh.cw, sh.ch, cx, Math.round(y), sh.cw * scale, sh.ch * scale);
    cx += adv;
  }
  return width;
}
