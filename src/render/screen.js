import { BASE_W, BASE_H } from '../config.js';

/** Low-resolution canvas scaled up by a whole number with nearest-neighbour, so pixels stay crisp. */
export function createScreen(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const screenInfo = window.screen;
  const screen = { canvas, ctx, w: BASE_W, h: BASE_H, scale: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;inset:0;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    // Home-screen apps on iOS can report a viewport shorter than the screen (leaving a black bar):
    // use the full screen size when running standalone in portrait.
    const standalone = navigator.standalone || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
    const portrait = window.innerHeight >= window.innerWidth;
    const vw = standalone ? Math.max(window.innerWidth, portrait ? screenInfo.width : screenInfo.height) : window.innerWidth;
    const vh = standalone ? Math.max(window.innerHeight, portrait ? screenInfo.height : screenInfo.width) : window.innerHeight;
    const pw = Math.round(vw * dpr), ph = Math.round(vh * dpr);
    // Largest whole-number scale that keeps the internal width near the 216 px target.
    const scale = Math.max(1, Math.round(pw / BASE_W));
    screen.scale = scale;
    screen.w = Math.ceil(pw / scale);
    screen.h = Math.ceil(ph / scale);
    canvas.width = screen.w; canvas.height = screen.h;
    canvas.style.width = (screen.w * scale / dpr) + 'px';
    canvas.style.height = (screen.h * scale / dpr) + 'px';
    ctx.imageSmoothingEnabled = false;
    const cs = getComputedStyle(probe), px = v => Math.ceil(parseFloat(v) * dpr / scale) || 0;
    screen.safe = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
    screen.cssToInternal = (x, y) => [x * dpr / scale, y * dpr / scale];
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  screen.resize = resize;
  return screen;
}

/** Offscreen canvas helper with smoothing off. */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  return [c, x];
}
