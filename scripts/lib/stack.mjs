// Bàn phím công nghệ: mỗi công nghệ là một phím 3D, phím chức năng đầu hàng là tên nhóm.
// Các phím lần lượt được "gõ" xuống, logo sáng lên và hắt sáng xuống mặt bàn phím.

import { loadIcon, placeIcon } from './icons.mjs';
import { slab } from './shapes.mjs';
import { MOTION_SWITCH_CSS, r1, roundedRectPath, svgDocument } from './svg.mjs';
import { themeCss } from './theme.mjs';
import { Typesetter } from './type.mjs';

const W = 1200;
const U = 126;
const KH = 100;
const GAP = 12;
const MOD_W = 204;
const PAD = 26;

function keySpec(key) {
  if (typeof key === 'string') return { icon: key, label: loadIcon(key).title || key };
  return { icon: key.icon, label: key.label || loadIcon(key.icon).title || key.icon };
}

// Xáo trộn có hạt giống để thứ tự gõ phím không đổi giữa các lần build.
function seededOrder(n, seed = 7) {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function renderStack(stack, fonts) {
  const ts = new Typesetter(fonts, 'k');
  const maxKeys = Math.max(...stack.map((row) => row.keys.length));
  const plateW = PAD * 2 + MOD_W + GAP + maxKeys * (U + GAP) - GAP;
  const plateH = PAD * 2 + stack.length * KH + (stack.length - 1) * GAP;
  const px = Math.round((W - plateW) / 2) - 6;
  const py = 14;
  const H = py + plateH + 40;

  const totalKeys = stack.reduce((n, row) => n + row.keys.length, 0);
  const order = seededOrder(totalKeys);
  const step = 0.42;
  const cycle = r1(totalKeys * step + 1.6);

  const keys = [];
  let k = 0;
  stack.forEach((row, ri) => {
    const y = py + PAD + ri * (KH + GAP);
    let x = px + PAD;
    keys.push(modKey(ts, row.row, x, y, MOD_W, KH));
    x += MOD_W + GAP;
    for (const raw of row.keys) {
      const spec = keySpec(raw);
      const delay = r1(order.indexOf(k) * step);
      keys.push(iconKey(ts, spec, x, y, U, KH, delay));
      x += U + GAP;
      k++;
    }
  });

  const css = [
    themeCss(),
    '.lg{fill:var(--text)}.lb{fill:var(--muted)}.mod-t{fill:var(--accent)}',
    '.well{fill:var(--bg);stroke:var(--line)}',
    `.cap,.lg,.kglow{animation-duration:${cycle}s;animation-iteration-count:infinite;animation-delay:var(--d)}`,
    '.cap{animation-name:press;animation-timing-function:ease-out}',
    '.lg{animation-name:lit}',
    '.kglow{opacity:0;fill:var(--accent);animation-name:glow}',
    '@keyframes press{0%,6%{transform:translateY(0)}1.4%,2.8%{transform:translateY(5px)}}',
    '@keyframes lit{0%,10%{fill:var(--text)}1.4%,3.4%{fill:var(--accent)}}',
    '@keyframes glow{0%,12%{opacity:0}2%{opacity:.55}}',
    MOTION_SWITCH_CSS,
  ].join('');

  const defs = [
    '<linearGradient id="k-skirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--raised)"/><stop offset="1" stop-color="var(--edge)"/></linearGradient>',
    '<linearGradient id="k-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--raised)"/><stop offset="1" stop-color="var(--surface)"/></linearGradient>',
    '<linearGradient id="k-mod" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,var(--accentDeep) 85%,var(--raised))"/><stop offset="1" stop-color="var(--accentDeep)"/></linearGradient>',
    '<filter id="k-blur" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="10"/></filter>',
  ].join('');

  const body = [
    slab({ x: px, y: py, w: plateW, h: plateH, r: 30, depth: 16, dx: 0.75, dy: 1.15 }),
    `<path class="well" d="${roundedRectPath(px + 12, py + 12, plateW - 24, plateH - 24, 20)}"/>`,
    keys.join(''),
  ].join('');

  const names = stack.flatMap((row) => row.keys.map((key) => keySpec(key).label));
  return svgDocument({ width: W, height: H, title: `Tech stack: ${names.join(', ')}`, css, defs: ts.defs() + defs, body });
}

function capShape(x, y, w, h) {
  return { skirt: roundedRectPath(x, y, w, h, 14), top: roundedRectPath(x + 7, y + 4, w - 14, h - 19, 10) };
}

function iconKey(ts, spec, x, y, w, h, delay) {
  const { skirt, top } = capShape(x, y, w, h);
  const iconSize = 34;
  const label = ts.measure(spec.label, 'mono', 11.5) > w - 22 ? spec.label.split(' ')[0] : spec.label;
  return [
    `<g style="--d:${delay}s">`,
    `<rect class="kglow" x="${x - 4}" y="${y + h - 30}" width="${w + 8}" height="34" rx="16" filter="url(#k-blur)"/>`,
    `<path d="${skirt}" fill="url(#k-skirt)" stroke="var(--edge)" stroke-opacity=".6"/>`,
    '<g class="cap">',
    `<path d="${top}" fill="url(#k-top)" stroke="var(--line)"/>`,
    `<path d="M${x + 18} ${y + 4.6}H${x + w - 18}" stroke="#fff" stroke-opacity=".08"/>`,
    placeIcon(spec.icon, x + w / 2 - iconSize / 2, y + 15, iconSize, { cls: 'lg' }),
    ts.run(label, 'mono', 11.5, x + w / 2, y + h - 25, { anchor: 'middle', cls: 'lb' }),
    '</g></g>',
  ].join('');
}

function modKey(ts, name, x, y, w, h) {
  const { skirt, top } = capShape(x, y, w, h);
  return [
    `<path d="${skirt}" fill="url(#k-skirt)" stroke="var(--edge)" stroke-opacity=".6"/>`,
    `<path d="${top}" fill="url(#k-mod)" stroke="var(--accentSoft)" stroke-opacity=".35"/>`,
    ts.run(name.toUpperCase(), 'monoBold', 15, x + 22, y + 32, { cls: 'mod-t', tracking: 0.08 }),
    placeIcon('phosphor:arrow-right', x + w - 44, y + h - 46, 20, { cls: 'mod-t', weight: 'bold' }),
  ].join('');
}
