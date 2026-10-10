// Các khối dùng chung: tấm đùn có độ dày, viền sáng chạy quanh, nhãn dạng viên thuốc.

import { r1, roundedRectPath, roundedRectPerimeter } from './svg.mjs';
import { mix } from './theme.mjs';

// Tấm có độ dày: các lớp chồng lệch xuống phải, lớp xa tối dần, rồi mặt trên.
export function slab({ x, y, w, h, r, depth, dx = 0.8, dy = 1, top = 'var(--surface)', sideFrom = 'line', sideTo = 'edge', stroke = 'var(--line)' }) {
  const out = [];
  for (let i = depth; i >= 1; i--) {
    const pct = Math.round(100 - (70 * (i - 1)) / Math.max(1, depth - 1));
    out.push(`<path d="${roundedRectPath(x + i * dx, y + i * dy, w, h, r)}" style="fill:${mix(sideFrom, sideTo, pct)}"/>`);
  }
  out.push(`<path d="${roundedRectPath(x, y, w, h, r)}" fill="${top}" stroke="${stroke}"/>`);
  return out.join('');
}

// Vệt sáng chạy vòng quanh viền (ảnh chỉ có CSS, không cần JS).
export function comet({ x, y, w, h, r, length = 130, duration = 11, delay = 0, cls = 'comet' }) {
  const per = roundedRectPerimeter(w, h, r);
  const d = roundedRectPath(x, y, w, h, r);
  const style = `stroke-dasharray:${r1(length)} ${r1(per - length)};animation:${cls} ${duration}s linear ${delay}s infinite`;
  return {
    svg: `<path class="${cls}-glow" d="${d}" style="${style}"/><path class="${cls}" d="${d}" style="${style}"/>`,
    css:
      `.${cls},.${cls}-glow{fill:none;stroke:var(--accent);stroke-linecap:round}` +
      `.${cls}{stroke-width:1.6;stroke-opacity:.95}.${cls}-glow{stroke-width:7;stroke-opacity:.18}` +
      `@keyframes ${cls}{from{stroke-dashoffset:0}to{stroke-dashoffset:${-r1(per)}}}`,
  };
}

// Hàng nhãn công nghệ. Bỏ bớt nhãn cuối nếu không đủ chỗ.
export function chips(ts, tags, x, y, maxWidth, { size = 13, height = 28, gap = 8 } = {}) {
  const out = [];
  let cx = x;
  for (const tag of tags) {
    const w = ts.measure(tag, 'mono', size) + 24;
    if (cx + w - x > maxWidth) break;
    out.push(
      `<rect x="${r1(cx)}" y="${y}" width="${r1(w)}" height="${height}" rx="${height / 2}" class="chip"/>` +
        ts.run(tag, 'mono', size, cx + 12, y + height / 2 + size * 0.36, { cls: 'chip-t' }),
    );
    cx += w + gap;
  }
  return out.join('');
}

export const CHIP_CSS = '.chip{fill:var(--raised);stroke:var(--line)}.chip-t{fill:var(--muted)}';
