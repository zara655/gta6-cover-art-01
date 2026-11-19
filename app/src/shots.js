// Fixed scenes for screenshots, driven by query params:
//   ?shot=cover&photo=pier&caption=Sunset%20Heist&layout=grid4&grade=sunset
//   ?shot=editor&photo=boulevard&caption=Boulevard%20Queen
// `photo` picks a sample (samples/<photo>.jpg); `layout` and `grade` are optional.
// window.__shotReady is set once the scene has painted, so a headless browser can wait for it.
import { GRADES, LAYOUTS } from './cover.js';

export async function runShot(hooks) {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  const { state } = hooks;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = /^(\d+)x(\d+)$/.exec(query.get('size') ?? '');
    if (size) hooks.setCanvasSize(Number(size[1]), Number(size[2]));
    else hooks.setCanvasSize(window.innerWidth, window.innerHeight);
  }

  await hooks.loadSample(query.get('photo') ?? 'pier');

  if (LAYOUTS[query.get('layout')]) state.layout = query.get('layout');
  if (query.get('caption')) state.caption = query.get('caption');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('tag')) state.tag = query.get('tag');
  if (GRADES[query.get('grade')]) {
    for (const p of state.panels) p.grade = query.get('grade');
  }

  // Cover shots show the poster alone; editor shots keep the second panel selected
  // so the controls show a live crop.
  hooks.setSelected(shot === 'cover' ? -1 : 1);
  hooks.syncUi();
  hooks.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
