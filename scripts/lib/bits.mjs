// Ảnh nhỏ: nút mạng xã hội dạng phím bấm và tiêu đề từng mục.

import { placeIcon } from './icons.mjs';
import { slab } from './shapes.mjs';
import { MOTION_SWITCH_CSS, r1, svgDocument } from './svg.mjs';
import { themeCss } from './theme.mjs';
import { rotX, rotY } from './geo.mjs';
import { Typesetter } from './type.mjs';

// Nút mạng xã hội. Chiều rộng co theo nhãn để các nút đứng cạnh nhau đều nhau.
export function renderSocial(social, fonts) {
  const ts = new Typesetter(fonts, 's');
  const H = 64;
  const labelW = ts.measure(social.label, 'sansBold', 19);
  const w = Math.round(22 + 26 + 12 + labelW + 14 + 16 + 22);
  const W = w + 8;
  const body = [
    slab({ x: 0, y: 0, w, h: H - 8, r: 14, depth: 6, dx: 0.6, dy: 1.2, top: 'var(--raised)' }),
    `<path d="M14 1.2H${w - 14}" stroke="#fff" stroke-opacity=".07"/>`,
    placeIcon(social.icon, 22, 15, 26, { cls: 'c-icon' }),
    ts.run(social.label, 'sansBold', 19, 60, 35, { cls: 'c-text' }),
    placeIcon('phosphor:arrow-up-right', 60 + labelW + 14, 20, 16, { cls: 'c-accent', weight: 'bold' }),
  ].join('');
  return svgDocument({
    width: W,
    height: H,
    title: social.label,
    css: themeCss() + '.c-icon{fill:var(--accent)}.c-text{fill:var(--text)}.c-accent{fill:var(--accent)}',
    defs: ts.defs(),
    body,
  });
}

// Tiêu đề mục: khối lập phương nhỏ xoay chậm, chữ lớn, đường kẻ có chấm sáng chạy.
export function renderHeading(text, fonts, index = 0) {
  const ts = new Typesetter(fonts, 'hd');
  const W = 1200;
  const H = 92;
  const titleX = 74;
  const baseline = 60;
  const titleW = ts.measure(text, 'display', 30);
  const lineX = titleX + titleW + 28;
  const lineY = 49;
  const body = [
    `<g class="motion">${spinningCube(36, 46, 30)}</g><g class="still">${spinningCube(36, 46, 30, false)}</g>`,
    ts.run(text, 'display', 30, titleX, baseline, { cls: 'c-text' }),
    `<path d="M${r1(lineX)} ${lineY}H${W - 6}" stroke="url(#hd-fade${index})" stroke-width="1.2"/>`,
    `<circle class="runner" cx="${r1(lineX)}" cy="${lineY}" r="3" fill="var(--accent)"/>`,
  ].join('');
  const travel = Math.round(W - 40 - lineX);
  const css = [
    themeCss(),
    '.c-text{fill:var(--text)}',
    '.cube-base{fill:var(--bg)}.cube-face{fill:var(--accent);stroke:var(--accent);stroke-width:1;stroke-linejoin:round}',
    `.runner{animation:run 6s cubic-bezier(.5,0,.3,1) ${-index * 1.7}s infinite}`,
    `@keyframes run{0%{transform:translateX(0);opacity:0}10%{opacity:1}80%{opacity:1}100%{transform:translateX(${travel}px);opacity:0}}`,
    MOTION_SWITCH_CSS,
  ].join('');
  const defs = `<linearGradient id="hd-fade${index}" x1="${r1(lineX)}" x2="${W}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--accent)" stop-opacity=".7"/><stop offset=".35" stop-color="var(--line)"/><stop offset="1" stop-color="var(--line)" stop-opacity="0"/></linearGradient>`;
  return svgDocument({ width: W, height: H, title: text, css, defs: ts.defs() + defs, body });
}

// Khối lập phương xoay quanh trục đứng. Khối lồi nên chỉ cần ẩn mặt quay lưng (độ mờ 0),
// không phải sắp thứ tự vẽ. Quay 90 độ thì khối trùng lúc đầu nên vòng lặp liền mạch.
function spinningCube(cx, cy, size, animated = true) {
  const verts = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])));
  const faces = [
    [0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3],
  ];
  const view = rotX(0.56);
  const steps = 9;
  const light = [-0.42, 0.78, 0.46];
  const frames = Array.from({ length: animated ? steps + 1 : 1 }, (_, f) => {
    const spin = rotY(Math.PI / 4 + (f / steps) * (Math.PI / 2));
    return verts.map((v) => view(spin(v)));
  });
  const scale = size / 1.75;
  const anim = (attr, values) =>
    animated ? `<animate attributeName="${attr}" dur="2.6s" repeatCount="indefinite" values="${values.join(';')}"/>` : '';
  const out = [];
  for (const face of faces) {
    const ds = [];
    const shade = [];
    const shown = [];
    for (const pts of frames) {
      // Khối tâm gốc toạ độ: tâm mặt chính là pháp tuyến hướng ra ngoài.
      const n = [0, 1, 2].map((axis) => face.reduce((acc, i) => acc + pts[i][axis], 0) / 4);
      const facing = n[2] > 0.02;
      const lambert = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
      ds.push(face.map((i, k) => `${k ? 'L' : 'M'}${r1(cx + pts[i][0] * scale)} ${r1(cy - pts[i][1] * scale)}`).join('') + 'Z');
      shade.push(facing ? Math.round((0.28 + 0.72 * lambert) * 100) / 100 : 0);
      shown.push(facing ? 1 : 0);
    }
    out.push(`<path class="cube-base" d="${ds[0]}" opacity="${shown[0]}">${anim('d', ds)}${anim('opacity', shown)}</path>`);
    out.push(
      `<path class="cube-face" d="${ds[0]}" fill-opacity="${shade[0]}" stroke-opacity="${shown[0]}">${anim('d', ds)}${anim('fill-opacity', shade)}${anim('stroke-opacity', shown)}</path>`,
    );
  }
  return out.join('');
}
