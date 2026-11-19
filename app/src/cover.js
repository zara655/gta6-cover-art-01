// Vice City Cover Studio — cover renderer.
// Draws a GTA-style multi-panel poster cover onto any canvas: panels of one photo with
// per-panel crop/zoom and color grades, a neon-sunset poster finish (sun glow, grain,
// vignette, keylines), and bold condensed caption lettering with a hard outline.

export const LAYOUTS = {
  grid4: { label: 'Grid 2x2', panels: 4 },
  hero: { label: 'Hero + 2', panels: 3 },
  strip3: { label: 'Triptych', panels: 3 },
  duo: { label: 'Wide + 2', panels: 3 },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.55) contrast(1.12) brightness(1.03) hue-rotate(-8deg)',
    wash: ['rgba(255, 110, 64, 0.30)', 'rgba(196, 30, 128, 0.34)'],
    blend: 'overlay',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.75) contrast(1.16) brightness(1.0) hue-rotate(16deg)',
    wash: ['rgba(0, 229, 255, 0.26)', 'rgba(255, 0, 170, 0.30)'],
    blend: 'overlay',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'sepia(0.32) saturate(1.45) contrast(1.06) brightness(1.07)',
    wash: ['rgba(255, 183, 77, 0.30)', 'rgba(255, 87, 34, 0.22)'],
    blend: 'soft-light',
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(0.88) contrast(1.38) brightness(0.94)',
    wash: ['rgba(38, 50, 96, 0.34)', 'rgba(8, 8, 20, 0.30)'],
    blend: 'multiply',
  },
  acid: {
    label: 'Acid Trip',
    filter: 'saturate(2.05) contrast(1.12) hue-rotate(48deg) brightness(1.02)',
    wash: ['rgba(190, 255, 60, 0.22)', 'rgba(150, 60, 255, 0.28)'],
    blend: 'overlay',
  },
};

const GRADE_CYCLE = ['sunset', 'neon', 'golden', 'noir'];

/** Fresh per-panel state: varied crops of the same photo, grades cycling. */
export function defaultPanels() {
  return [
    { ox: 0.0, oy: -0.38, zoom: 1.0, grade: 'sunset' },
    { ox: -0.32, oy: -0.52, zoom: 1.65, grade: 'neon' },
    { ox: 0.34, oy: 0.05, zoom: 1.28, grade: 'golden' },
    { ox: 0.12, oy: -0.62, zoom: 2.05, grade: 'noir' },
  ];
}

export function defaultState() {
  return {
    photo: null,
    caption: 'Sunset Heist',
    subtitle: 'A Vice City Story',
    tag: 'Vice City',
    layout: 'grid4',
    panels: defaultPanels(),
  };
}

/** Panel rectangles for a layout inside a w x h cover, with a gutter and outer margin. */
export function layoutRects(layout, w, h) {
  const m = Math.round(Math.min(w, h) * 0.022); // outer margin
  const g = Math.round(Math.min(w, h) * 0.012); // gutter
  const W = w - m * 2;
  const H = h - m * 2;
  const R = (x, y, pw, ph) => ({ x: m + x, y: m + y, w: pw, h: ph });
  switch (layout) {
    case 'hero': {
      const lw = Math.round(W * 0.6);
      const rw = W - lw - g;
      const th = Math.round((H - g) * 0.52);
      return [R(0, 0, lw, H), R(lw + g, 0, rw, th), R(lw + g, th + g, rw, H - th - g)];
    }
    case 'strip3': {
      const pw = Math.floor((W - g * 2) / 3);
      return [0, 1, 2].map((i) => R(i * (pw + g), 0, i === 2 ? W - 2 * (pw + g) : pw, H));
    }
    case 'duo': {
      const th = Math.round(H * 0.55);
      const bw = Math.floor((W - g) / 2);
      return [R(0, 0, W, th), R(0, th + g, bw, H - th - g), R(bw + g, th + g, W - bw - g, H - th - g)];
    }
    case 'grid4':
    default: {
      const pw = Math.floor((W - g) / 2);
      const ph = Math.floor((H - g) / 2);
      return [
        R(0, 0, pw, ph),
        R(pw + g, 0, W - pw - g, ph),
        R(0, ph + g, pw, H - ph - g),
        R(pw + g, ph + g, W - pw - g, H - ph - g),
      ];
    }
  }
}

/** Where the photo lands inside a panel rect for the given crop state. */
export function panelDrawBox(rect, img, panel) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = Math.max(0, dw - rect.w);
  const slackY = Math.max(0, dh - rect.h);
  return {
    x: rect.x - slackX / 2 - (panel.ox * slackX) / 2,
    y: rect.y - slackY / 2 - (panel.oy * slackY) / 2,
    w: dw,
    h: dh,
    slackX,
    slackY,
  };
}

// Deterministic grain tile (seeded, so screenshots are stable).
let grainTile = null;
function makeGrainTile() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  let seed = 1337;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function drawPanel(ctx, rect, img, panel) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) {
    const grade = GRADES[panel.grade] ?? GRADES.sunset;
    const box = panelDrawBox(rect, img, panel);
    ctx.filter = grade.filter;
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    ctx.filter = 'none';
    // Grade wash: diagonal two-stop tint blended over the photo.
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    wash.addColorStop(0, grade.wash[0]);
    wash.addColorStop(1, grade.wash[1]);
    ctx.globalCompositeOperation = grade.blend;
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    // Per-panel vignette for depth.
    const vig = ctx.createRadialGradient(
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
    );
    vig.addColorStop(0, 'rgba(10, 0, 24, 0)');
    vig.addColorStop(1, 'rgba(10, 0, 24, 0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, '#3a1454');
    grad.addColorStop(1, '#12041f');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

function fitFont(ctx, text, weight, maxWidth, startSize) {
  let size = startSize;
  const set = () => {
    ctx.font = `${weight} ${size}px "Arial Narrow", "Liberation Sans Narrow", Impact, sans-serif`;
  };
  set();
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    set();
  }
  return size;
}

function drawLettering(ctx, w, h, state) {
  const caption = (state.caption ?? '').trim().toUpperCase();
  const subtitle = (state.subtitle ?? '').trim().toUpperCase();
  const tag = (state.tag ?? '').trim().toUpperCase();
  const cx = w / 2;

  // Bottom scrim so the lettering sits on a dark band.
  const scrimH = h * 0.34;
  const scrim = ctx.createLinearGradient(0, h - scrimH, 0, h);
  scrim.addColorStop(0, 'rgba(8, 0, 18, 0)');
  scrim.addColorStop(0.45, 'rgba(8, 0, 18, 0.55)');
  scrim.addColorStop(1, 'rgba(8, 0, 18, 0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - scrimH, w, scrimH);

  // Top tag: small spaced caps between two rules.
  if (tag) {
    const tagSize = Math.max(12, h * 0.026);
    ctx.save();
    ctx.font = `700 ${tagSize}px "Arial Narrow", "Liberation Sans Narrow", sans-serif`;
    try { ctx.letterSpacing = `${tagSize * 0.42}px`; } catch { /* older engines */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(tag).width;
    const ty = h * 0.052;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = tagSize * 0.3;
    ctx.fillText(tag, cx, ty);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const ruleW = w * 0.16;
    const gap = tw / 2 + w * 0.03;
    ctx.fillRect(cx - gap - ruleW, ty - 1, ruleW, 2);
    ctx.fillRect(cx + gap, ty - 1, ruleW, 2);
    ctx.restore();
  }

  if (!caption && !subtitle) return;

  const baseY = h - h * 0.055;
  let cursorY = baseY;

  if (subtitle) {
    const subSize = Math.max(11, h * 0.03);
    ctx.save();
    ctx.font = `700 ${subSize}px "Arial Narrow", "Liberation Sans Narrow", sans-serif`;
    try { ctx.letterSpacing = `${subSize * 0.34}px`; } catch { /* older engines */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = subSize * 0.35;
    ctx.fillText(subtitle, cx, cursorY);
    ctx.restore();
    cursorY -= subSize * 1.5;
  }

  if (caption) {
    const size = fitFont(ctx, caption, 900, w * 0.9, h * 0.125);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // Slight horizontal squeeze + italic lean for the condensed poster look.
    ctx.translate(cx, cursorY);
    ctx.transform(0.84, 0, -0.05, 1, 0, 0);
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    // Hard offset shadow, then thick outline, then a white-to-pink fill.
    ctx.shadowColor = 'rgba(5, 0, 12, 0.85)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = size * 0.045;
    ctx.shadowOffsetY = size * 0.06;
    ctx.strokeStyle = '#12041f';
    ctx.lineWidth = size * 0.17;
    ctx.strokeText(caption, 0, 0);
    ctx.shadowColor = 'transparent';
    const fill = ctx.createLinearGradient(0, -size, 0, size * 0.25);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.55, '#ffe9f4');
    fill.addColorStop(1, '#ffb3d9');
    ctx.fillStyle = fill;
    ctx.fillText(caption, 0, 0);
    ctx.restore();
  }
}

/**
 * Draws the full cover. `state` is {photo, caption, subtitle, tag, layout, panels}.
 * opts.selected >= 0 outlines that panel (editor only; exports pass -1).
 */
export function drawCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const selected = opts.selected ?? -1;

  // Backdrop: deep purple-black so gutters read as poster keylines.
  ctx.fillStyle = '#0d0218';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    drawPanel(ctx, rect, state.photo, state.panels[i] ?? defaultPanels()[i]);
  });

  // Sun glow high in the frame (screen blend, warm).
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.16, 0, w * 0.5, h * 0.16, Math.max(w, h) * 0.55);
  sun.addColorStop(0, 'rgba(255, 170, 80, 0.20)');
  sun.addColorStop(0.5, 'rgba(255, 90, 120, 0.08)');
  sun.addColorStop(1, 'rgba(255, 90, 120, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Film grain.
  if (!grainTile) grainTile = makeGrainTile();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Overall vignette.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(6, 0, 14, 0)');
  vig.addColorStop(1, 'rgba(6, 0, 14, 0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Keylines: white panel borders + outer frame.
  const line = Math.max(2, Math.min(w, h) * 0.0035);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = line;
  for (const rect of rects) ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.lineWidth = line * 1.6;
  ctx.strokeRect(line, line, w - line * 2, h - line * 2);

  drawLettering(ctx, w, h, state);

  if (selected >= 0 && rects[selected]) {
    const r = rects[selected];
    ctx.save();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.005);
    ctx.setLineDash([Math.min(w, h) * 0.02, Math.min(w, h) * 0.012]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
}

export { GRADE_CYCLE };
