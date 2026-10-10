// Icon thương hiệu lấy từ Simple Icons (CC0), icon chung lấy từ Phosphor (MIT).
// Trong profile.yml: "typescript" là tên trên simpleicons.org, "phosphor:car-profile" là icon Phosphor.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as simpleIcons from 'simple-icons';

const require = createRequire(import.meta.url);
const phosphorDir = path.dirname(path.dirname(require.resolve('@phosphor-icons/core/assets/regular/cube.svg')));

const bySlug = new Map(
  Object.values(simpleIcons)
    .filter((icon) => icon && typeof icon === 'object' && icon.slug)
    .map((icon) => [icon.slug, icon]),
);

export function iconExists(spec) {
  try {
    loadIcon(spec);
    return true;
  } catch {
    return false;
  }
}

// Trả về { body, box }: nội dung SVG của icon và cạnh hộp gốc (24 hoặc 256).
export function loadIcon(spec, weight = 'regular') {
  if (spec.startsWith('phosphor:')) {
    const name = spec.slice('phosphor:'.length);
    const suffix = weight === 'regular' ? '' : `-${weight}`;
    const file = path.join(phosphorDir, weight, `${name}${suffix}.svg`);
    if (!fs.existsSync(file)) throw new Error(`Không có icon Phosphor "${name}" (xem phosphoricons.com)`);
    const svg = fs.readFileSync(file, 'utf8');
    const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="256" height="256" fill="none"\/>/, '');
    return { body, box: 256 };
  }
  const icon = bySlug.get(spec);
  if (!icon) throw new Error(`Không có icon Simple Icons "${spec}" (xem simpleicons.org)`);
  return { body: `<path d="${icon.path}"/>`, box: 24, title: icon.title };
}

// Đặt icon vào ô vuông (x, y, size). cls quyết định màu qua CSS.
export function placeIcon(spec, x, y, size, { cls = '', weight = 'regular' } = {}) {
  const { body, box } = loadIcon(spec, weight);
  const s = size / box;
  return `<g${cls ? ` class="${cls}"` : ''} transform="translate(${r(x)} ${r(y)}) scale(${Math.round(s * 10000) / 10000})">${body}</g>`;
}

const r = (n) => Math.round(n * 100) / 100;
