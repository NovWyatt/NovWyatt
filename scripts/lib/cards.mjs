// Thẻ dự án. Thẻ "half": nửa hàng. Thẻ "wide": cả hàng, kèm ảnh chụp màn hình nghiêng 3D.

import sharp from 'sharp';
import { placeIcon } from './icons.mjs';
import { chips, CHIP_CSS, comet, slab } from './shapes.mjs';
import { idMaker, MOTION_SWITCH_CSS, r1, svgDocument } from './svg.mjs';
import { themeCss } from './theme.mjs';
import { Typesetter } from './type.mjs';

const STATUS = {
  'open-source': () => 'Open source',
  live: () => 'Live demo',
  release: (meta) => (meta && meta.release ? `Download ${meta.release}` : 'Download'),
  closed: () => 'Closed source',
};

export function statusLabel(project, meta) {
  return (STATUS[project.status] || STATUS['open-source'])(meta);
}

// Số commit chỉ có nghĩa khi repo chứa mã nguồn (repo chỉ để phát hành thì bỏ qua),
// và chỉ hiện khi đủ nhiều: repo đẩy lên một lần có vài commit trông mỏng hơn thực tế.
function metricText(project, meta) {
  if (!meta) return '';
  const parts = [];
  if (meta.stars > 0) parts.push(`${meta.stars} stars`);
  if (meta.commits >= 10 && !['release', 'closed'].includes(project.status)) parts.push(`${meta.commits} commits`);
  return parts.join('   ');
}

const BASE_CSS = [
  '.t-title{fill:var(--text)}.t-muted{fill:var(--muted)}.t-accent{fill:var(--accent)}.t-text{fill:var(--text)}',
  '.ico{fill:var(--accent)}',
  CHIP_CSS,
  MOTION_SWITCH_CSS,
].join('');

function iconTile(project, x, y, size) {
  const tile = slab({ x, y, w: size, h: size, r: 14, depth: 5, top: 'var(--raised)', dx: 0.7, dy: 0.9 });
  const icon = placeIcon(project.icon || 'phosphor:cube', x + size * 0.22, y + size * 0.22, size * 0.56, { cls: 'ico', weight: 'duotone' });
  return tile + icon;
}

function statusRow(ts, label, xRight, y) {
  const w = ts.measure(label, 'sansBold', 15);
  const arrow = placeIcon('phosphor:arrow-up-right', xRight - 16, y - 13, 16, { cls: 'ico', weight: 'bold' });
  return ts.run(label, 'sansBold', 15, xRight - 22 - w, y, { cls: 't-accent' }) + arrow;
}

export function renderHalfCard(project, meta, fonts, index = 0) {
  const W = 600;
  const H = 284;
  const sw = 590;
  const sh = 272;
  const ts = new Typesetter(fonts, 'c');
  const pad = 28;

  const title = ts.run(project.title, 'display', 21, pad + 82, pad + 27, { cls: 't-title' });
  const repoLine = project.repo ? ts.run(project.repo, 'mono', 13, pad + 82, pad + 52, { cls: 't-muted' }) : '';
  const metric = metricText(project, meta);
  const metricRun = metric ? ts.run(metric, 'mono', 13, sw - pad, pad + 27, { cls: 't-muted', anchor: 'end' }) : '';
  const lines = ts.wrap(project.description, 'sans', 17, sw - pad * 2, 3);
  const desc = lines.map((line, i) => ts.run(line, 'sans', 17, pad, 128 + i * 26, { cls: 't-muted' })).join('');
  const label = statusLabel(project, meta);
  const labelW = ts.measure(label, 'sansBold', 15) + 34;
  const chipRow = chips(ts, project.tags || [], pad, sh - pad - 28, sw - pad * 2 - labelW);
  const status = statusRow(ts, label, sw - pad, sh - pad - 9);
  const glow = comet({ x: 0, y: 0, w: sw, h: sh, r: 20, length: 120, duration: 12, delay: -index * 2.7 });

  const body = [
    slab({ x: 0, y: 0, w: sw, h: sh, r: 20, depth: 9, dx: 1, dy: 1.25 }),
    glow.svg,
    iconTile(project, pad, pad - 4, 62),
    title,
    repoLine,
    metricRun,
    desc,
    chipRow,
    status,
  ].join('');

  return svgDocument({
    width: W,
    height: H,
    title: `${project.title}: ${project.description}`,
    css: themeCss() + BASE_CSS + glow.css,
    defs: ts.defs(),
    body,
  });
}

// Ảnh chụp màn hình -> WebP nhúng thẳng vào SVG (README không cho ảnh SVG tải tệp ngoài).
async function screenshot(file, width = 960, height = 600) {
  const resized = sharp(file).resize(width, height, { fit: 'cover', position: 'left top' });
  const buf = await resized.clone().webp({ quality: 80 }).toBuffer();
  const { dominant } = await resized.clone().stats();
  const average = `rgb(${dominant.r},${dominant.g},${dominant.b})`;
  return { href: `data:image/webp;base64,${buf.toString('base64')}`, width, height, average };
}

// Tấm ảnh xoay quanh trục dọc có phối cảnh thật. SVG chỉ có phép biến đổi affine,
// nên ảnh được cắt thành nhiều dải dọc, mỗi dải co giãn theo độ sâu của nó, rồi cắt mép theo
// đúng hình thang phối cảnh để mép ngoài thẳng và sắc.
function perspectivePanel(shot, box, { angle, strips = 44, radius = 18, id }) {
  const PW = shot.width;
  const PH = shot.height;
  const a = (angle * Math.PI) / 180;
  const f = PW * 2.1;
  const proj = (u, v) => {
    const z = u * Math.sin(a);
    const s = f / (f - z);
    return { X: u * Math.cos(a) * s, Y: v * s, s };
  };
  const corners = [proj(-PW / 2, -PH / 2), proj(PW / 2, -PH / 2), proj(PW / 2, PH / 2), proj(-PW / 2, PH / 2)];
  const minX = Math.min(...corners.map((c) => c.X));
  const maxX = Math.max(...corners.map((c) => c.X));
  const minY = Math.min(...corners.map((c) => c.Y));
  const maxY = Math.max(...corners.map((c) => c.Y));
  const k = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
  const ox = box.x + (box.w - (maxX - minX) * k) / 2 - minX * k;
  const oy = box.y + (box.h - (maxY - minY) * k) / 2 - minY * k;
  const toScreen = (u, v) => {
    const p = proj(u, v);
    return [ox + p.X * k, oy + p.Y * k];
  };

  // Viền bo góc, chiếu từng điểm.
  const outline = [];
  const rr = radius / k;
  const arc = (cx, cy, from) => {
    for (let i = 0; i <= 6; i++) {
      const t = from + (i / 6) * (Math.PI / 2);
      outline.push(toScreen(cx + rr * Math.cos(t), cy + rr * Math.sin(t)));
    }
  };
  arc(PW / 2 - rr, -PH / 2 + rr, -Math.PI / 2);
  arc(PW / 2 - rr, PH / 2 - rr, 0);
  arc(-PW / 2 + rr, PH / 2 - rr, Math.PI / 2);
  arc(-PW / 2 + rr, -PH / 2 + rr, Math.PI);
  const outlineD = outline.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('') + 'Z';

  const imgId = id('shot');
  const clipId = id('panel');
  const defs = [`<image id="${imgId}" width="${PW}" height="${PH}" preserveAspectRatio="none" href="${shot.href}"/>`, `<clipPath id="${clipId}"><path d="${outlineD}"/></clipPath>`];
  const parts = [];
  for (let i = 0; i < strips; i++) {
    const px0 = (i / strips) * PW;
    const px1 = ((i + 1) / strips) * PW;
    const p0 = proj(px0 - PW / 2, 0);
    const p1 = proj(px1 - PW / 2, 0);
    const sx0 = ox + p0.X * k;
    const sx1 = ox + p1.X * k;
    const ma = (sx1 - sx0) / (px1 - px0);
    const me = sx0 - ma * px0;
    const md = Math.max(p0.s, p1.s) * k;
    const mf = oy - (PH / 2) * md;
    const stripClip = id('s');
    defs.push(`<clipPath id="${stripClip}"><rect x="${r1(px0 - 1.5)}" y="0" width="${r1(px1 - px0 + 3)}" height="${PH}"/></clipPath>`);
    parts.push(`<use href="#${imgId}" clip-path="url(#${stripClip})" transform="matrix(${r4(ma)} 0 0 ${r4(md)} ${r1(me)} ${r1(mf)})"/>`);
  }

  // Độ dày tấm: viền chồng lệch xuống dưới.
  const thickness = [];
  for (let i = 7; i >= 1; i--) {
    thickness.push(`<path d="${outlineD}" transform="translate(${r1(i * 0.35 * Math.sign(angle))} ${r1(i * 1.1)})" style="fill:color-mix(in srgb,var(--line) ${100 - i * 10}%,var(--edge))"/>`);
  }
  const shadowBlur = id('blur');
  const glareGrad = id('glare');
  const [tlx, tly] = toScreen(-PW / 2, -PH / 2);
  const [brx, bry] = toScreen(PW / 2, PH / 2);
  defs.push(
    `<filter id="${shadowBlur}" x="-.2" y="-.2" width="1.4" height="1.4"><feGaussianBlur stdDeviation="14"/></filter>`,
    `<linearGradient id="${glareGrad}" gradientUnits="userSpaceOnUse" x1="${r1(tlx)}" y1="${r1(tly)}" x2="${r1(brx)}" y2="${r1(bry)}"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
  );
  const sweepX = Math.round(box.w + 260);
  const svg = [
    `<path d="${outlineD}" transform="translate(0 18)" fill="var(--edge)" opacity=".55" filter="url(#${shadowBlur})"/>`,
    thickness.join(''),
    // Lớp lót cùng tông ảnh để chỗ nối giữa các dải không lộ nền.
    `<g clip-path="url(#${clipId})"><path d="${outlineD}" fill="${shot.average}"/>${parts.join('')}<path d="${outlineD}" fill="url(#${glareGrad})"/>`,
    `<rect class="sweep" x="${r1(box.x - 200)}" y="${r1(box.y - 40)}" width="90" height="${r1(box.h + 80)}" fill="#fff" opacity=".07" transform="skewX(-14)"/></g>`,
    `<path d="${outlineD}" fill="none" stroke="var(--line)" stroke-width="1.5"/>`,
  ].join('');
  const css = `.sweep{animation:sweep 9s cubic-bezier(.6,0,.2,1) infinite}@keyframes sweep{0%{transform:translateX(0) skewX(-14deg)}35%,100%{transform:translateX(${sweepX}px) skewX(-14deg)}}`;
  return { svg, defs: defs.join(''), css };
}

export async function renderWideCard(project, meta, fonts, root, index = 0, flip = false) {
  const W = 1200;
  const H = 360;
  const sw = 1188;
  const sh = 346;
  const ts = new Typesetter(fonts, 'w');
  const id = idMaker(`w${index}`);
  const pad = 40;
  const textW = 500;
  const tx = flip ? sw - pad - textW : pad;

  const shot = await screenshot(`${root}/${project.image}`);
  const panelBox = flip ? { x: 34, y: 30, w: 580, h: 288 } : { x: sw - 34 - 580, y: 30, w: 580, h: 288 };
  const panel = perspectivePanel(shot, panelBox, { angle: flip ? -24 : 24, id });

  const title = ts.run(project.title, 'display', 28, tx + 92, pad + 34, { cls: 't-title' });
  const repoLine = project.repo ? ts.run(project.repo, 'mono', 14, tx + 92, pad + 62, { cls: 't-muted' }) : '';
  // Xếp từ dưới lên: hàng nhãn sát đáy, dòng trạng thái ngay trên, mô tả lấp phần còn lại.
  const chipsTop = sh - pad - 28;
  const statusY = chipsTop - 24;
  const descTop = 150;
  const maxLines = Math.floor((statusY - 38 - descTop) / 29) + 1;
  const lines = ts.wrap(project.description, 'sans', 19, textW, maxLines);
  const desc = lines.map((line, i) => ts.run(line, 'sans', 19, tx, descTop + i * 29, { cls: 't-muted' })).join('');
  const metric = metricText(project, meta);
  const label = statusLabel(project, meta);
  const labelW = ts.measure(label, 'sansBold', 15) + 22;
  const status = statusRow(ts, label, tx + labelW, statusY);
  const metricRun = metric ? ts.run(metric, 'mono', 13, tx + labelW + 22, statusY, { cls: 't-muted' }) : '';
  const chipRow = chips(ts, project.tags || [], tx, chipsTop, textW);
  const glow = comet({ x: 0, y: 0, w: sw, h: sh, r: 22, length: 170, duration: 15, delay: -index * 3.1 });

  const body = [
    slab({ x: 0, y: 0, w: sw, h: sh, r: 22, depth: 11, dx: 1, dy: 1.25 }),
    glow.svg,
    panel.svg,
    iconTile(project, tx, pad - 6, 70),
    title,
    repoLine,
    desc,
    status,
    metricRun,
    chipRow,
  ].join('');

  return svgDocument({
    width: W,
    height: H,
    title: `${project.title}: ${project.description}`,
    css: themeCss() + BASE_CSS + glow.css + panel.css,
    defs: ts.defs() + panel.defs,
    body,
  });
}

const r4 = (n) => Math.round(n * 10000) / 10000;
