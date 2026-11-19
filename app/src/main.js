// Vice City Cover Studio — editor wiring.
// Owns the cover state, the preview canvas, panel picking/dragging/zooming, photo
// loading (picker, drag-and-drop, samples), and PNG export at poster sizes.
// A ?shot= query switches to a fixed scene for screenshots (./shots.js).
import { GRADES, LAYOUTS, defaultPanels, defaultState, drawCover, layoutRects, panelDrawBox } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const els = {
  photo: document.getElementById('photo'),
  caption: document.getElementById('caption'),
  subtitle: document.getElementById('subtitle'),
  tag: document.getElementById('tag'),
  zoom: document.getElementById('zoom'),
  grade: document.getElementById('grade'),
  size: document.getElementById('size'),
  status: document.getElementById('status'),
  selLabel: document.getElementById('selLabel'),
  layouts: document.getElementById('layouts'),
  samples: document.getElementById('samples'),
};

const state = defaultState();
let selected = 0;

function redraw() {
  drawCover(canvas, state, { selected });
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function clampPanel(p) {
  p.ox = Math.min(1, Math.max(-1, p.ox));
  p.oy = Math.min(1, Math.max(-1, p.oy));
  p.zoom = Math.min(3, Math.max(1, p.zoom));
}

/** Reflects the selected panel + layout into the controls. */
function syncUi() {
  const p = state.panels[Math.max(0, selected)];
  els.selLabel.textContent = String(selected + 1);
  els.zoom.value = String(p.zoom);
  els.grade.value = p.grade;
  els.caption.value = state.caption;
  els.subtitle.value = state.subtitle;
  els.tag.value = state.tag;
  for (const btn of els.layouts.querySelectorAll('[data-layout]')) {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function setPhotoFromUrl(url, label) {
  try {
    state.photo = await loadImage(url);
    state.panels = defaultPanels();
    selected = 0;
    syncUi();
    redraw();
    if (label) els.status.textContent = label;
  } catch {
    els.status.textContent = 'That photo could not be loaded.';
  }
}

// --- Photo sources -----------------------------------------------------------
els.photo.addEventListener('change', () => {
  const file = els.photo.files[0];
  if (file) setPhotoFromUrl(URL.createObjectURL(file), `Loaded ${file.name}`);
});
els.samples.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sample]');
  if (btn) setPhotoFromUrl(`samples/${btn.dataset.sample}.jpg`, `Sample: ${btn.dataset.sample}`);
});
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  document.body.classList.add('dragging');
});
window.addEventListener('dragleave', (e) => {
  if (e.relatedTarget === null) document.body.classList.remove('dragging');
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragging');
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    setPhotoFromUrl(URL.createObjectURL(file), `Loaded ${file.name}`);
  }
});

// --- Panel picking, panning, zooming -----------------------------------------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
function panelAt(pt) {
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  return rects.findIndex((r) => pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h);
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const i = panelAt(pt);
  if (i < 0) return;
  selected = i;
  drag = { x: pt.x, y: pt.y };
  canvas.setPointerCapture(e.pointerId);
  syncUi();
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || !state.photo) return;
  const pt = canvasPoint(e);
  const rect = layoutRects(state.layout, canvas.width, canvas.height)[selected];
  const p = state.panels[selected];
  const box = panelDrawBox(rect, state.photo, p);
  if (box.slackX > 0) p.ox -= (pt.x - drag.x) / (box.slackX / 2);
  if (box.slackY > 0) p.oy -= (pt.y - drag.y) / (box.slackY / 2);
  clampPanel(p);
  drag = { x: pt.x, y: pt.y };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const i = panelAt(canvasPoint(e));
  if (i < 0) return;
  selected = i;
  const p = state.panels[selected];
  p.zoom *= e.deltaY < 0 ? 1.06 : 1 / 1.06;
  clampPanel(p);
  syncUi();
  redraw();
}, { passive: false });

els.zoom.addEventListener('input', () => {
  state.panels[selected].zoom = Number(els.zoom.value);
  redraw();
});
els.grade.addEventListener('change', () => {
  state.panels[selected].grade = els.grade.value;
  redraw();
});
document.getElementById('gradeAll').addEventListener('click', () => {
  const g = state.panels[selected].grade;
  for (const p of state.panels) p.grade = g;
  redraw();
});
document.getElementById('shuffle').addEventListener('click', () => {
  const keys = Object.keys(GRADES);
  state.panels = state.panels.map(() => ({
    ox: Math.random() * 1.4 - 0.7,
    oy: Math.random() * 1.2 - 0.8,
    zoom: 1 + Math.random() * 1.3,
    grade: keys[Math.floor(Math.random() * keys.length)],
  }));
  syncUi();
  redraw();
});

// --- Layout, lettering, size --------------------------------------------------
els.layouts.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layout]');
  if (!btn) return;
  state.layout = btn.dataset.layout;
  if (selected >= panelCount()) selected = 0;
  syncUi();
  redraw();
});
for (const [el, key] of [[els.caption, 'caption'], [els.subtitle, 'subtitle'], [els.tag, 'tag']]) {
  el.addEventListener('input', () => {
    state[key] = el.value;
    redraw();
  });
}
els.size.addEventListener('change', () => {
  const [w, h] = els.size.value.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  redraw();
});

// --- Export --------------------------------------------------------------------
document.getElementById('export').addEventListener('click', () => {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  drawCover(out, state, { selected: -1 });
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${out.width}x${out.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    els.status.textContent = `Saved vice-city-cover-${out.width}x${out.height}.png`;
  }, 'image/png');
});

// --- Boot ----------------------------------------------------------------------
const hooks = {
  state,
  canvas,
  loadSample: (name) => setPhotoFromUrl(`samples/${name}.jpg`),
  setSelected: (i) => { selected = i; },
  syncUi,
  redraw,
  setCanvasSize: (w, h) => { canvas.width = w; canvas.height = h; },
};

if (new URLSearchParams(location.search).has('shot')) {
  runShot(hooks);
} else {
  syncUi();
  redraw();
  setPhotoFromUrl('samples/pier.jpg');
}
