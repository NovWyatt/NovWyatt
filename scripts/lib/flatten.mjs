// Biến SVG dùng biến CSS thành SVG màu cố định, để thư viện vẽ ảnh (librsvg trong sharp)
// xuất được PNG, ví dụ ảnh xem trước khi chia sẻ link lên mạng xã hội.

import { THEMES } from './theme.mjs';

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export function mixHex(a, b, pct) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => (v * pct + cb[i] * (100 - pct)) / 100));
}

export function flattenSvg(svg, theme = 'dark') {
  const t = THEMES[theme];
  return svg
    .replace(/@media \(prefers-color-scheme:light\)\{:root\{[^}]*\}\}/g, '')
    .replace(/color-mix\(in srgb,\s*var\(--(\w+)\)\s*(\d+)%,\s*var\(--(\w+)\)\)/g, (_, a, p, b) => mixHex(t[a], t[b], Number(p)))
    .replace(/var\(--(\w+)\)/g, (_, name) => t[name] || '#000')
    .replace('.still{display:none}', '.motion{display:none}');
}
