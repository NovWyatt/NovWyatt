// Tương tác của wyattos.cyou. Không dùng thư viện: khối cầu 3D vẽ bằng canvas 2D với cùng
// module hình học (geo.js) mà README dùng để tính khung hình.

import { compose, icosphere, PHI_RATIO, project, rotX, rotY, rotZ } from './geo.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

// ---------- màu lấy từ biến CSS, đổi theo giao diện sáng/tối ----------
let colors = {};
function readColors() {
  const css = getComputedStyle(document.documentElement);
  for (const name of ['accent', 'bg', 'surface', 'raised', 'line', 'text']) colors[name] = css.getPropertyValue(`--${name}`).trim();
}
readColors();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  readColors();
  orb && orb.draw();
});

function rgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// ---------- khối cầu trắc địa ----------
function createOrb(canvas) {
  const ctx = canvas.getContext('2d');
  const { verts, edges } = icosphere(1);
  const align = rotX(Math.atan(-PHI_RATIO));
  const ring = Array.from({ length: 121 }, (_, i) => {
    const a = (i / 120) * Math.PI * 2;
    return [1.62 * Math.cos(a), 0, 1.62 * Math.sin(a)];
  });
  const ringTilt = compose(rotX(0.36), rotZ(0.38));

  let w = 0;
  let h = 0;
  let dpr = 1;
  let spin = 0;
  let velocity = 0.32; // rad/s
  const baseVelocity = 0.32;
  let pitch = 0.42;
  let targetPitch = 0.42;
  let yawOffset = 0;
  let targetYaw = 0;
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let time = 0;
  let running = false;
  let visible = true;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw();
  }

  function draw() {
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const accent = colors.accent;
    const radius = Math.min(w, h) * 0.26;
    const bob = reduceMotion.matches ? 0 : Math.sin(time * 0.9) * 7;
    const cx = w / 2;
    const cy = h * 0.42 + bob;
    const horizon = h * 0.66;

    // Sàn lưới phối cảnh, trôi về phía người xem.
    const unit = h * 0.32;
    const yAt = (z) => horizon + unit / z;
    ctx.lineWidth = 1;
    const phase = reduceMotion.matches ? 0 : (time * 0.32) % 1;
    for (let i = 0; i <= 14; i++) {
      const z = Math.max(0.55, i + 1 - phase);
      const y = yAt(z);
      if (y > h + 2) continue;
      const fade = Math.max(0, 1 - (z - 1) / 13) ** 1.6;
      ctx.strokeStyle = rgba(accent, 0.42 * fade);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const grad = ctx.createLinearGradient(0, horizon, 0, h);
    grad.addColorStop(0, rgba(accent, 0));
    grad.addColorStop(1, rgba(accent, 0.38));
    ctx.strokeStyle = grad;
    for (let k = -12; k <= 12; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + (k * unit) / 0.8, yAt(0.8));
      ctx.lineTo(cx + (k * unit) / 16, yAt(16));
      ctx.stroke();
    }
    // Làm mờ mép sàn theo hình elip để lưới không bị cắt cứng ở rìa khung.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.translate(cx, horizon);
    ctx.scale(1, 1.05);
    const edge = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.5);
    edge.addColorStop(0.5, '#000');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(-w, -h * 2, w * 2, h * 4);
    ctx.restore();

    // Bóng đổ trên sàn.
    const shadow = ctx.createRadialGradient(cx, h * 0.78, 0, cx, h * 0.78, radius * 1.4);
    shadow.addColorStop(0, rgba(accent, 0.3 - bob * 0.012));
    shadow.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.78, radius * 1.4, radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    const view = { cx, cy, radius, camera: 4 };
    const transform = compose(align, rotY(spin), rotX(pitch), rotZ(-0.2 + yawOffset));
    const pts = verts.map((v) => project(transform(v), view));
    const ringPts = ring.map((p) => project(compose(ringTilt, rotZ(yawOffset))(p), view));

    const strokeRing = (front) => {
      ctx.strokeStyle = rgba(accent, front ? 0.55 : 0.16);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let pen = false;
      for (const p of ringPts) {
        if (p.z >= 0 === front) {
          pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();
    };

    strokeRing(false);

    // Thân khối cầu.
    const sil = radius * 1.033;
    const body = ctx.createRadialGradient(cx - sil * 0.3, cy - sil * 0.4, sil * 0.1, cx, cy, sil);
    body.addColorStop(0, colors.raised);
    body.addColorStop(0.7, colors.surface);
    body.addColorStop(1, colors.bg);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, sil, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(accent, 0.22);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cạnh: mờ dần ra phía sau.
    ctx.lineCap = 'round';
    for (const [a, b] of edges) {
      const z = (pts[a].z + pts[b].z) / 2;
      ctx.strokeStyle = rgba(accent, 0.1 + 0.88 * ((z + 1) / 2) ** 1.7);
      ctx.lineWidth = 1 + 0.6 * ((z + 1) / 2);
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
      ctx.stroke();
    }
    ctx.fillStyle = accent;
    for (const p of pts) {
      ctx.globalAlpha = 0.1 + 0.88 * ((p.z + 1) / 2) ** 1.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6 * p.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    strokeRing(true);

    // Vệ tinh.
    const si = Math.floor(((time * 0.1) % 1) * 120);
    const sat = ringPts[si];
    const hidden = sat.z < 0 && Math.hypot(sat.x - cx, sat.y - cy) < sil;
    if (!hidden) {
      ctx.globalAlpha = sat.z < 0 ? 0.45 : 1;
      const glow = ctx.createRadialGradient(sat.x, sat.y, 0, sat.x, sat.y, 14);
      glow.addColorStop(0, rgba(accent, 0.55));
      glow.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sat.x, sat.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(sat.x, sat.y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (lastT || now)) / 1000);
    lastT = now;
    time += dt;
    if (!dragging) velocity += (baseVelocity - velocity) * Math.min(1, dt * 1.5);
    spin += velocity * dt;
    pitch += (targetPitch - pitch) * Math.min(1, dt * 4);
    yawOffset += (targetYaw - yawOffset) * Math.min(1, dt * 4);
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || !visible || document.hidden) return;
    if (reduceMotion.matches && !dragging) {
      draw();
      return;
    }
    running = true;
    lastT = 0;
    requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  // Kéo để xoay, thả ra thì quay chậm dần về tốc độ thường.
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    start();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    spin += dx * 0.012;
    velocity = dx * 0.6;
    if (reduceMotion.matches) draw();
  });
  const release = () => {
    dragging = false;
    if (reduceMotion.matches) stop();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // Nghiêng nhẹ theo vị trí chuột trong vùng đầu trang.
  const hero = canvas.closest('.hero');
  if (hero && finePointer.matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      targetPitch = 0.42 + ny * 0.35;
      targetYaw = nx * 0.25;
    });
    hero.addEventListener('pointerleave', () => {
      targetPitch = 0.42;
      targetYaw = 0;
    });
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new ResizeObserver(resize).observe(canvas);
  resize();
  start();
  return { draw };
}

const orbCanvas = document.getElementById('orb');
const orb = orbCanvas ? createOrb(orbCanvas) : null;

// ---------- tên đùn khối nghiêng theo chuột ----------
const name = document.querySelector('[data-name]');
const hero = document.querySelector('.hero');
if (name && hero && finePointer.matches && !reduceMotion.matches) {
  hero.addEventListener('pointermove', (e) => {
    const r = name.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
    const ny = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    name.style.setProperty('--dx', (1 - nx * 2.6).toFixed(3));
    name.style.setProperty('--dy', (1 - ny * 1.6).toFixed(3));
  });
  hero.addEventListener('pointerleave', () => {
    name.style.setProperty('--dx', '1');
    name.style.setProperty('--dy', '1');
  });
}

// ---------- dòng chữ tự gõ ----------
const typing = document.querySelector('[data-typing]');
if (typing && !reduceMotion.matches) {
  const roles = JSON.parse(typing.dataset.roles);
  let r = 0;
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  (async function loop() {
    await wait(2200);
    for (;;) {
      const text = roles[r];
      for (let i = text.length; i >= 0; i--) {
        typing.textContent = text.slice(0, i);
        await wait(28);
      }
      await wait(350);
      r = (r + 1) % roles.length;
      const next = roles[r];
      for (let i = 1; i <= next.length; i++) {
        typing.textContent = next.slice(0, i);
        await wait(65 + Math.random() * 40);
      }
      await wait(2400);
    }
  })();
}

// ---------- thẻ dự án nghiêng 3D theo chuột ----------
if (finePointer.matches && !reduceMotion.matches) {
  for (const card of document.querySelectorAll('.card')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const strength = card.classList.contains('card-wide') ? 3.5 : 6;
      card.classList.add('tilting');
      card.style.setProperty('--ry', `${((x - 0.5) * strength).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - y) * strength).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
}

// ---------- bàn phím tự gõ khi cuộn tới ----------
const keyboard = document.querySelector('.kb');
if (keyboard && !reduceMotion.matches) {
  const keys = [...keyboard.querySelectorAll('.key:not(.mod)')];
  let timer = null;
  let paused = false;
  const tap = () => {
    if (paused) return;
    const key = keys[Math.floor(Math.random() * keys.length)];
    key.classList.add('down');
    setTimeout(() => key.classList.remove('down'), 170);
  };
  keyboard.addEventListener('pointerenter', () => (paused = true));
  keyboard.addEventListener('pointerleave', () => (paused = false));
  new IntersectionObserver(([entry]) => {
    clearInterval(timer);
    if (entry.isIntersecting) timer = setInterval(tap, 420);
  }).observe(keyboard);
}

// ---------- hiện dần khi cuộn tới, viền thanh điều hướng ----------
const revealer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px' },
);
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

const nav = document.querySelector('.nav');
const sentinel = document.querySelector('.hero');
if (nav && sentinel) {
  new IntersectionObserver(([entry]) => nav.classList.toggle('scrolled', entry.boundingClientRect.top < -10), {
    threshold: [0, 0.98],
  }).observe(sentinel);
}
