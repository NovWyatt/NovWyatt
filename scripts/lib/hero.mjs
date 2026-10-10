// Ảnh đầu trang: tên đùn khối 3D, dòng chữ tự gõ, khối cầu trắc địa xoay trên sàn lưới phối cảnh.

import { compose, icosphere, PHI_RATIO, project, rotX, rotY, rotZ } from './geo.mjs';
import { idMaker, MOTION_SWITCH_CSS, r1, roundedRectPath, svgDocument } from './svg.mjs';
import { mix, themeCss } from './theme.mjs';
import { Typesetter } from './type.mjs';

const W = 1200;
const H = 440;
const SPHERE = { cx: 930, cy: 182, radius: 116, camera: 4 };
const FLOOR = { horizon: 292, vpx: 930, unit: 150, far: 14 };

export function renderHero(profile, fonts) {
  const ts = new Typesetter(fonts, 'h');
  const id = idMaker('h');
  const defs = [];

  // ----- chữ bên trái -----
  const left = 62;
  const eyebrow =
    ts.run('~/' + profile.username.toLowerCase(), 'mono', 16, left + 2, 98, { cls: 'c-accent' }) +
    ts.run('$ whoami', 'mono', 16, left + 2 + ts.measure('~/' + profile.username.toLowerCase() + ' ', 'mono', 16), 98, {
      cls: 'c-muted',
    });

  let nameSize = 118;
  const nameText = profile.name.toUpperCase();
  while (ts.measure(nameText, 'display', nameSize, { tracking: -0.01 }) > 560) nameSize -= 2;
  const nameId = id('name');
  defs.push(`<g id="${nameId}">${ts.run(nameText, 'display', nameSize, left, 214, { tracking: -0.01 })}</g>`);
  const nameWidth = ts.measure(nameText, 'display', nameSize, { tracking: -0.01 });

  const taglineLines = ts.wrap(profile.tagline, 'sans', 19, 610, 2);
  const tagline = taglineLines.map((line, i) => ts.run(line, 'sans', 19, left + 2, 334 + i * 29, { cls: 'c-muted' })).join('');

  const roles = typing(ts, id, defs, profile.roles, left + 2, 274, 24);

  // ----- khối 3D -----
  const name3d = (animated) => extrudedName(nameId, animated);
  const sheenMask = id('mask');
  const sheenGrad = id('grad');
  defs.push(
    `<mask id="${sheenMask}"><use href="#${nameId}" fill="#fff"/></mask>`,
    `<linearGradient id="${sheenGrad}" x1="0" x2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0"/><stop offset=".5" stop-color="var(--accent)" stop-opacity=".75"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>`,
  );
  const sheen = `<g mask="url(#${sheenMask})"><rect class="sheen" x="${left - 160}" y="110" width="130" height="130" fill="url(#${sheenGrad})" transform="skewX(-18)"/></g>`;

  const frameClip = id('clip');
  defs.push(`<clipPath id="${frameClip}"><path d="${roundedRectPath(0, 0, W, H, 26)}"/></clipPath>`);

  const glow = id('glow');
  const floorFade = id('fade');
  const floorMask = id('mask');
  const vFade = id('grad');
  const shadowGrad = id('grad');
  const bodyGrad = id('grad');
  const blur = id('blur');
  defs.push(
    `<radialGradient id="${glow}" cx="${SPHERE.cx}" cy="${SPHERE.cy + 20}" r="430" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--accent)" stop-opacity=".13"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="${floorFade}" x1="220" x2="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>`,
    `<mask id="${floorMask}"><rect width="${W}" height="${H}" fill="url(#${floorFade})"/></mask>`,
    `<linearGradient id="${vFade}" x1="0" y1="${FLOOR.horizon}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--accent)" stop-opacity="0"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".42"/></linearGradient>`,
    `<radialGradient id="${shadowGrad}"><stop offset="0" stop-color="var(--accent)" stop-opacity=".34"/><stop offset=".55" stop-color="var(--accent)" stop-opacity=".08"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${bodyGrad}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="var(--raised)"/><stop offset=".7" stop-color="var(--surface)"/><stop offset="1" stop-color="var(--bg)"/></radialGradient>`,
    `<filter id="${blur}" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="4"/></filter>`,
  );

  const floor = (animated) => floorGrid(vFade, animated);
  const sphere = (animated) => geodesic(bodyGrad, blur, animated);
  const shadow = `<ellipse class="shadow" cx="${SPHERE.cx}" cy="358" rx="150" ry="22" fill="url(#${shadowGrad})"/>`;

  const body = [
    `<g clip-path="url(#${frameClip})">`,
    `<rect class="bg" width="${W}" height="${H}"/>`,
    `<rect width="${W}" height="${H}" fill="url(#${glow})"/>`,
    `<g mask="url(#${floorMask})"><g class="motion">${floor(true)}</g><g class="still">${floor(false)}</g></g>`,
    shadow,
    `<g class="bob"><g class="motion">${sphere(true)}</g><g class="still">${sphere(false)}</g></g>`,
    '</g>',
    eyebrow,
    `<g class="motion">${name3d(true)}</g><g class="still">${name3d(false)}</g>`,
    `<use href="#${nameId}" class="name-face"/>`,
    sheen,
    `<g class="motion">${roles.animated}</g><g class="still">${roles.still}</g>`,
    tagline,
    `<path class="frame" d="${roundedRectPath(0.5, 0.5, W - 1, H - 1, 26)}"/>`,
  ].join('');

  const css = [
    themeCss(),
    '.bg{fill:var(--bg)}.frame{fill:none;stroke:var(--line)}',
    '.c-accent{fill:var(--accent)}.c-muted{fill:var(--muted)}.c-text{fill:var(--text)}',
    `.name-face{fill:var(--text)}`,
    '.edge{fill:none;stroke:var(--accent);stroke-width:1.3;stroke-linecap:round}',
    '.node{fill:var(--accent)}',
    '.ring{fill:none;stroke:var(--accent);stroke-width:1.2}',
    '.ring-dash{fill:none;stroke:var(--accent);stroke-width:2.4;stroke-dasharray:2 14;stroke-linecap:round;animation:dash 7s linear infinite}',
    '.grid{fill:none;stroke-width:1}.gh{stroke:var(--accent)}',
    '.cursor{fill:var(--accent);animation:blink 1.06s steps(1) infinite}',
    '.bob{animation:bob 7s ease-in-out infinite alternate}',
    `.shadow{transform-origin:${SPHERE.cx}px 358px;animation:shadow 7s ease-in-out infinite alternate}`,
    '.sheen{animation:sheen 8s cubic-bezier(.6,0,.2,1) infinite}',
    '@keyframes bob{from{transform:translateY(-9px)}to{transform:translateY(7px)}}',
    '@keyframes shadow{from{transform:scale(.82);opacity:.5}to{transform:scale(1.05);opacity:1}}',
    '@keyframes blink{50%{opacity:0}}',
    '@keyframes dash{to{stroke-dashoffset:-160}}',
    `@keyframes sheen{0%{transform:translateX(0) skewX(-18deg)}38%,100%{transform:translateX(${Math.round(nameWidth + 340)}px) skewX(-18deg)}}`,
    MOTION_SWITCH_CSS,
  ].join('');

  return svgDocument({
    width: W,
    height: H,
    title: `${profile.name}: ${profile.roles[0]}`,
    css,
    defs: ts.defs() + defs.join('') + roles.defs,
    body,
  });
}

// Tên đùn khối: nhiều lớp chồng lệch nhau, hướng đùn lắc qua lại như camera đang xoay quanh chữ.
function extrudedName(nameId, animated) {
  const layers = 18;
  const from = [1.15, 0.95];
  const to = [-0.55, 0.95];
  const out = [];
  for (let i = layers; i >= 1; i--) {
    const pct = Math.round(14 + (52 * (layers - i)) / (layers - 1));
    const fill = mix('accent', 'bg', pct);
    const a = `${r1(from[0] * i)} ${r1(from[1] * i)}`;
    const b = `${r1(to[0] * i)} ${r1(to[1] * i)}`;
    const anim = animated
      ? `<animateTransform attributeName="transform" type="translate" dur="14s" repeatCount="indefinite" values="${a};${b};${a}" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`
      : '';
    out.push(`<use href="#${nameId}" style="fill:${fill}" transform="translate(${a})">${anim}</use>`);
  }
  return out.join('');
}

// Dòng chữ tự gõ rồi tự xoá, lần lượt từng vai trò. Dùng SMIL vì cần bước rời rạc theo từng ký tự.
function typing(ts, id, defs, roles, x, y, size) {
  const prompt = ts.run('>', 'mono', size, x, y, { cls: 'c-accent' });
  const startX = x + ts.measure('> ', 'mono', size);
  const adv = ts.measure('M', 'mono', size);
  const typeStep = 0.07;
  const deleteStep = 0.028;
  const hold = 2.6;
  const gap = 0.45;

  const slots = [];
  let t = 0.3;
  for (const role of roles) {
    const n = [...role].length;
    const t0 = t;
    const t1 = t0 + n * typeStep;
    const t2 = t1 + hold;
    const t3 = t2 + n * deleteStep;
    slots.push({ role, n, t0, t1, t2, t3 });
    t = t3 + gap;
  }
  const total = t;
  const k = (s) => Math.round((s / total) * 10000) / 10000;

  // Chuỗi (thời điểm, giá trị) cho mỗi vai trò, dạng rời rạc.
  const series = (slot) => {
    const pts = [[0, 0]];
    for (let c = 1; c <= slot.n; c++) pts.push([slot.t0 + c * typeStep, c * adv]);
    for (let c = slot.n - 1; c >= 0; c--) pts.push([slot.t2 + (slot.n - c) * deleteStep, c * adv]);
    return pts;
  };
  const toAnim = (attr, pts, offset = 0) => {
    const times = [];
    const values = [];
    for (const [time, value] of pts) {
      const kt = k(time);
      if (times.length && kt <= times[times.length - 1]) {
        values[values.length - 1] = value + offset;
        continue;
      }
      times.push(kt);
      values.push(value + offset);
    }
    return `<animate attributeName="${attr}" dur="${Math.round(total * 100) / 100}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.join(';')}" values="${values.map((v) => r1(v)).join(';')}"/>`;
  };

  let clipDefs = '';
  let texts = '';
  for (const slot of slots) {
    const clip = id('type');
    clipDefs += `<clipPath id="${clip}"><rect x="${r1(startX)}" y="${y - size}" height="${size * 1.5}" width="0">${toAnim('width', series(slot))}</rect></clipPath>`;
    texts += `<g clip-path="url(#${clip})">${ts.run(slot.role, 'mono', size, startX, y, { cls: 'c-text' })}</g>`;
  }
  const cursorPts = slots.flatMap((slot) => series(slot).slice(1));
  cursorPts.unshift([0, 0]);
  const cursor = `<rect class="cursor" x="${r1(startX)}" y="${r1(y - size * 0.82)}" width="${r1(adv * 0.58)}" height="${r1(size * 1.02)}" rx="1.5">${toAnim('x', cursorPts, startX)}</rect>`;

  const firstRole = slots[0].role;
  const stillCursorX = startX + [...firstRole].length * adv + adv * 0.2;
  return {
    defs: clipDefs,
    animated: prompt + texts + cursor,
    still:
      prompt +
      ts.run(firstRole, 'mono', size, startX, y, { cls: 'c-text' }) +
      `<rect class="cursor" x="${r1(stillCursorX)}" y="${r1(y - size * 0.82)}" width="${r1(adv * 0.58)}" height="${r1(size * 1.02)}" rx="1.5"/>`,
  };
}

// Sàn lưới phối cảnh. Các vạch ngang trôi về phía người xem; khi trôi đúng một ô thì
// tập vạch trùng với lúc đầu nên vòng lặp liền mạch.
function floorGrid(vFadeId, animated) {
  const { horizon, vpx, unit, far } = FLOOR;
  const yAt = (z) => horizon + unit / z;
  const opAt = (z) => Math.max(0, 1 - (z - 1) / (far - 1)) ** 1.5 * 0.5;
  const out = [];
  for (let k = -16; k <= 4; k++) {
    const zn = 0.85;
    out.push(`<path class="grid" stroke="url(#${vFadeId})" d="M${r1(vpx + (k * unit) / zn)} ${r1(yAt(zn))}L${r1(vpx + (k * unit) / far)} ${r1(yAt(far))}"/>`);
  }
  const frames = 8;
  const dur = 3.2;
  for (let i = 0; i <= far; i++) {
    const zs = Array.from({ length: frames + 1 }, (_, f) => i + 1 - f / frames).map((z) => Math.max(z, 0.6));
    const d0 = `M0 ${r1(yAt(zs[0]))}H${W}`;
    if (!animated) {
      out.push(`<path class="grid gh" stroke-opacity="${r1(opAt(zs[0]) * 100) / 100}" d="${d0}"/>`);
      continue;
    }
    const dVals = zs.map((z) => `M0 ${r1(yAt(z))}H${W}`).join(';');
    const oVals = zs.map((z) => Math.round(opAt(z) * 100) / 100).join(';');
    out.push(
      `<path class="grid gh" d="${d0}"><animate attributeName="d" dur="${dur}s" repeatCount="indefinite" values="${dVals}"/><animate attributeName="stroke-opacity" dur="${dur}s" repeatCount="indefinite" values="${oVals}"/></path>`,
    );
  }
  return out.join('');
}

// Khối cầu trắc địa xoay quanh trục đi qua một đỉnh. Quay đủ 72 độ thì khối trùng với lúc đầu
// (đối xứng bậc 5), nên chỉ cần 10 khung hình cho một vòng lặp liền mạch.
function geodesic(bodyGradId, blurId, animated) {
  const { verts, edges } = icosphere(1);
  const align = rotX(Math.atan(-PHI_RATIO));
  const tilt = compose(rotX(0.42), rotZ(-0.2));
  const steps = 9;
  const period = 5.6;
  const frames = Array.from({ length: animated ? steps + 1 : 1 }, (_, f) => {
    const spin = rotY((f / steps) * ((2 * Math.PI) / 5));
    return verts.map((v) => project(tilt(spin(align(v))), SPHERE));
  });
  const depthOpacity = (z) => Math.round((0.1 + 0.88 * ((z + 1) / 2) ** 1.7) * 100) / 100;
  const anim = (attr, values) =>
    animated ? `<animate attributeName="${attr}" dur="${period}s" repeatCount="indefinite" values="${values.join(';')}"/>` : '';

  // Vòng quỹ đạo nghiêng quanh khối cầu, tách nửa sau (bị che) và nửa trước.
  const ringT = compose(rotX(0.36), rotZ(0.38));
  const ringPts = Array.from({ length: 121 }, (_, i) => {
    const a = (i / 120) * 2 * Math.PI;
    return project(ringT([1.62 * Math.cos(a), 0, 1.62 * Math.sin(a)]), SPHERE);
  });
  const ringPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${r1(p.x)} ${r1(p.y)}`).join('');
  const backRuns = [];
  const frontRuns = [];
  let run = [ringPts[0]];
  for (let i = 1; i < ringPts.length; i++) {
    const p = ringPts[i];
    if (p.z >= 0 === run[0].z >= 0) run.push(p);
    else {
      run.push(p);
      (run[0].z >= 0 ? frontRuns : backRuns).push(run);
      run = [p];
    }
  }
  (run[0].z >= 0 ? frontRuns : backRuns).push(run);

  const silhouette = SPHERE.radius * 1.033;
  const out = [];
  out.push(...backRuns.map((pts) => `<path class="ring" stroke-opacity=".16" d="${ringPath(pts)}"/>`));
  out.push(`<circle cx="${SPHERE.cx}" cy="${SPHERE.cy}" r="${r1(silhouette)}" fill="url(#${bodyGradId})"/>`);
  out.push(`<circle cx="${SPHERE.cx}" cy="${SPHERE.cy}" r="${r1(silhouette)}" fill="none" stroke="var(--accent)" stroke-opacity=".22"/>`);

  for (const [a, b] of edges) {
    const ds = frames.map((fr) => `M${r1(fr[a].x)} ${r1(fr[a].y)}L${r1(fr[b].x)} ${r1(fr[b].y)}`);
    const ops = frames.map((fr) => depthOpacity((fr[a].z + fr[b].z) / 2));
    out.push(`<path class="edge" d="${ds[0]}" stroke-opacity="${ops[0]}">${anim('d', ds)}${anim('stroke-opacity', ops)}</path>`);
  }
  verts.forEach((_, i) => {
    const xs = frames.map((fr) => r1(fr[i].x));
    const ys = frames.map((fr) => r1(fr[i].y));
    const ops = frames.map((fr) => depthOpacity(fr[i].z));
    out.push(
      `<circle class="node" cx="${xs[0]}" cy="${ys[0]}" r="2.6" fill-opacity="${ops[0]}">${anim('cx', xs)}${anim('cy', ys)}${anim('fill-opacity', ops)}</circle>`,
    );
  });

  out.push(...frontRuns.map((pts) => `<path class="ring" stroke-opacity=".55" d="${ringPath(pts)}"/>`));
  out.push(`<path class="ring-dash" stroke-opacity=".5" d="${ringPath(ringPts)}"/>`);

  // Vệ tinh chạy trên quỹ đạo, mờ đi khi khuất sau khối cầu.
  const sat = ringPts.filter((_, i) => i % 3 === 0);
  const hidden = (p) => p.z < 0 && Math.hypot(p.x - SPHERE.cx, p.y - SPHERE.cy) < silhouette;
  if (animated) {
    const motion = `<animateMotion dur="10s" repeatCount="indefinite" calcMode="linear" values="${sat.map((p) => `${r1(p.x)},${r1(p.y)}`).join(';')}"/>`;
    const satOp = `<animate attributeName="opacity" dur="10s" repeatCount="indefinite" values="${sat.map((p) => (hidden(p) ? 0 : p.z < 0 ? 0.45 : 1)).join(';')}"/>`;
    out.push(`<g><circle r="9" fill="var(--accent)" opacity=".55" filter="url(#${blurId})"/><circle r="4.2" fill="var(--accent)"/>${motion}${satOp}</g>`);
  } else {
    const p = sat.find((q) => q.z > 0) || sat[0];
    out.push(`<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="4.2" fill="var(--accent)"/>`);
  }
  return out.join('');
}
