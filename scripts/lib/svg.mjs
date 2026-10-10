// Tiện ích chung để viết SVG bằng chuỗi.

export const r1 = (n) => Math.round(n * 10) / 10;
export const r2 = (n) => Math.round(n * 100) / 100;

export function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Tạo id ngắn, ổn định cho từng ảnh để các id không đụng nhau khi nhiều SVG nằm cùng trang.
export function idMaker(prefix) {
  let n = 0;
  return (name = 'x') => `${prefix}-${name}${n++}`;
}

export function roundedRectPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return (
    `M${r1(x + r)} ${r1(y)}H${r1(x + w - r)}A${r} ${r} 0 0 1 ${r1(x + w)} ${r1(y + r)}` +
    `V${r1(y + h - r)}A${r} ${r} 0 0 1 ${r1(x + w - r)} ${r1(y + h)}` +
    `H${r1(x + r)}A${r} ${r} 0 0 1 ${r1(x)} ${r1(y + h - r)}V${r1(y + r)}A${r} ${r} 0 0 1 ${r1(x + r)} ${r1(y)}Z`
  );
}

export function roundedRectPerimeter(w, h, r) {
  return 2 * (w + h) - 8 * r + 2 * Math.PI * r;
}

export function svgDocument({ width, height, title, css = '', defs = '', body }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}">`,
    `<title>${esc(title)}</title>`,
    css ? `<style>${css}</style>` : '',
    defs ? `<defs>${defs}</defs>` : '',
    body,
    '</svg>',
  ].join('');
}

// Bản tĩnh cho người bật "giảm chuyển động": SMIL không tắt được bằng CSS,
// nên ảnh có hai lớp và CSS chọn lớp hiển thị.
export const MOTION_SWITCH_CSS =
  '.still{display:none}' +
  '@media (prefers-reduced-motion:reduce){.motion{display:none}.still{display:inline}*{animation:none!important}}';
