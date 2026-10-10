// Sinh trang wyattos.cyou vào site/dist từ profile.yml, dùng chung dữ liệu và ảnh với README.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import subsetFont from 'subset-font';
import { metricText, statusLabel } from './cards.mjs';
import { flattenSvg } from './flatten.mjs';
import { loadIcon } from './icons.mjs';
import { mix, THEMES } from './theme.mjs';

const SITE_URL = 'https://wyattos.cyou';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function icon(spec, { weight = 'regular', cls = '' } = {}) {
  const { body, box } = loadIcon(spec, weight);
  return `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 ${box} ${box}" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
}

// Khối lập phương trục đo dùng cho logo, tiêu đề mục và favicon.
function cubeSvg(colors) {
  const [top, left, right] = colors;
  return (
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    `<path d="M16 2 28.1 9 16 16 3.9 9Z" fill="${top}"/>` +
    `<path d="M3.9 9 16 16v14L3.9 23Z" fill="${left}"/>` +
    `<path d="M28.1 9 16 16v14l12.1-7Z" fill="${right}"/></svg>`
  );
}
const cubeCss = () => cubeSvg(['var(--accent)', mix('accent', 'bg', 55), mix('accent', 'bg', 30)]);

// Ký tự Latin cơ bản, Latin mở rộng dùng cho tiếng Việt, dấu câu và mũi tên.
function vietnameseLatinChars() {
  const ranges = [
    [0x20, 0x7e], [0xa0, 0xff], [0x102, 0x103], [0x110, 0x111], [0x128, 0x129], [0x168, 0x169],
    [0x1a0, 0x1a1], [0x1af, 0x1b0], [0x300, 0x301], [0x303, 0x303], [0x309, 0x309], [0x323, 0x323],
    [0x1ea0, 0x1ef9], [0x2010, 0x2027], [0x2190, 0x2193], [0x20ab, 0x20ab],
  ];
  let s = '';
  for (const [a, b] of ranges) for (let c = a; c <= b; c++) s += String.fromCodePoint(c);
  return s;
}

const FONT_FACES = [
  ['Unbounded', 800, 'Unbounded-ExtraBold.ttf', 'unbounded-800.woff2'],
  ['Be Vietnam Pro', 400, 'BeVietnamPro-Regular.ttf', 'bevietnampro-400.woff2'],
  ['Be Vietnam Pro', 600, 'BeVietnamPro-SemiBold.ttf', 'bevietnampro-600.woff2'],
  ['JetBrains Mono', 500, 'JetBrainsMono-Medium.ttf', 'jetbrainsmono-500.woff2'],
  ['JetBrains Mono', 700, 'JetBrainsMono-Bold.ttf', 'jetbrainsmono-700.woff2'],
];

const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);

function themeVars() {
  const vars = (t) => Object.entries(t).map(([k, v]) => `--${k}:${v}`).join(';');
  return `:root{${vars(THEMES.dark)}}@media (prefers-color-scheme:light){:root{${vars(THEMES.light)}}}`;
}

// Bóng chữ nhiều lớp tạo khối đùn; hướng đùn theo --dx/--dy do JS đổi theo chuột.
function nameShadowCss(layers = 16) {
  const shadows = [];
  for (let i = 1; i <= layers; i++) {
    const pct = Math.round(66 - (52 * (i - 1)) / (layers - 1));
    shadows.push(`calc(var(--dx)*${i}px) calc(var(--dy)*${i}px) 0 ${mix('accent', 'bg', pct)}`);
  }
  return (
    '@property --dx{syntax:"<number>";inherits:true;initial-value:1}' +
    '@property --dy{syntax:"<number>";inherits:true;initial-value:1}' +
    `.name{text-shadow:${shadows.join(',')}}`
  );
}

function projectCard(p, meta, img) {
  const wide = p.size === 'wide' && img;
  const label = statusLabel(p, meta);
  const metric = metricText(p, meta).replace(/\s{2,}/g, ' · ');
  const href = p.link || `https://github.com/${p.repo}`;
  const text = [
    '<div class="card-head">',
    `<span class="tile">${icon(p.icon || 'phosphor:cube', { weight: 'duotone' })}</span>`,
    `<div><h3>${esc(p.title)}</h3>${p.repo ? `<p class="repo">${esc(p.repo)}</p>` : ''}</div>`,
    '</div>',
    `<p class="desc">${esc(p.description.trim())}</p>`,
    `<ul class="tags">${(p.tags || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`,
    '<div class="card-foot">',
    `<span class="status">${esc(label)}${icon('phosphor:arrow-up-right', { weight: 'bold' })}</span>`,
    metric ? `<span class="metric">${metric}</span>` : '',
    '</div>',
  ].join('');
  if (!wide) return `<a class="card reveal" href="${esc(href)}">${text}<span class="glare" aria-hidden="true"></span></a>`;
  return [
    `<a class="card card-wide${p.flip ? ' flip' : ''} reveal" href="${esc(href)}">`,
    `<div class="card-text">${text}</div>`,
    `<div class="shot"><img src="${img}" width="960" height="600" loading="lazy" decoding="async" alt="Screenshot of ${esc(p.title)}"></div>`,
    '<span class="glare" aria-hidden="true"></span></a>',
  ].join('');
}

function keyboard(stack) {
  const maxKeys = Math.max(...stack.map((row) => row.keys.length));
  const rows = stack.map((row) => {
    const keys = row.keys.map((raw) => {
      const spec = typeof raw === 'string' ? { icon: raw } : raw;
      const label = spec.label || loadIcon(spec.icon).title || spec.icon;
      return `<div class="key" role="listitem" aria-label="${esc(label)}"><span class="cap">${icon(spec.icon)}<span class="lbl">${esc(label)}</span></span></div>`;
    });
    return (
      `<div class="kb-row" style="--keys:${maxKeys}">` +
      `<div class="key mod" aria-hidden="true"><span class="cap"><span class="mod-label">${esc(row.row.toUpperCase())}</span>${icon('phosphor:arrow-right', { weight: 'bold' })}</span></div>` +
      keys.join('') +
      '</div>'
    );
  });
  return `<div class="kb reveal"><div class="kb-well" role="list" aria-label="Tech stack">${rows.join('')}</div></div>`;
}

export async function buildSite(profile, projects, { root, metaFor, heroSvg, contribFile }) {
  const src = path.join(root, 'site', 'src');
  const dist = path.join(root, 'site', 'dist');
  // Dọn bên trong chứ không xoá thư mục: wrangler dev đang theo dõi nó thì Windows không cho xoá.
  fs.mkdirSync(dist, { recursive: true });
  for (const f of fs.readdirSync(dist)) fs.rmSync(path.join(dist, f), { recursive: true, force: true });
  fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });
  fs.mkdirSync(path.join(dist, 'img'), { recursive: true });
  const out = (rel, data) => fs.writeFileSync(path.join(dist, rel), data);

  // Font: chỉ giữ ký tự Latin và tiếng Việt, xuất woff2.
  const chars = vietnameseLatinChars();
  const faces = [];
  for (const [family, weight, ttf, woff2] of FONT_FACES) {
    const buf = await subsetFont(fs.readFileSync(path.join(root, 'fonts', ttf)), chars, { targetFormat: 'woff2' });
    out(`fonts/${woff2}`, buf);
    faces.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(/fonts/${woff2}) format('woff2')}`);
  }

  // Ảnh chụp màn hình cho thẻ rộng.
  const images = {};
  let wideIndex = 0;
  for (const p of projects) {
    if (p.size !== 'wide' || !p.image) continue;
    p.flip = wideIndex++ % 2 === 1;
    const buf = await sharp(path.join(root, p.image)).resize(960, 600, { fit: 'cover', position: 'left top' }).webp({ quality: 82 }).toBuffer();
    const name = `img/${p.id}-${hash(buf)}.webp`;
    out(name, buf);
    images[p.id] = `/${name}`;
  }

  // Biểu đồ đóng góp 3D (do Actions tạo), favicon, ảnh xem trước khi chia sẻ.
  let contrib = '';
  if (contribFile && fs.existsSync(contribFile)) {
    const buf = fs.readFileSync(contribFile);
    contrib = `/img/contrib-${hash(buf)}.svg`;
    out(contrib.slice(1), buf);
  }
  const favicon = cubeSvg(['#C4F25A', '#6E8A35', '#3F5320']).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  out('favicon.svg', favicon);
  out('apple-touch-icon.png', await sharp(Buffer.from(favicon)).resize(160, 160).extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#0A0C0F' }).png().toBuffer());
  const heroPng = await sharp(Buffer.from(flattenSvg(heroSvg))).png().toBuffer();
  out(
    'og.png',
    await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#0A0C0F' } })
      .composite([{ input: heroPng, top: 95, left: 0 }])
      .png()
      .toBuffer(),
  );

  // CSS và JS: tên tệp kèm mã băm để trình duyệt luôn lấy bản mới.
  const css = faces.join('') + themeVars() + fs.readFileSync(path.join(src, 'style.css'), 'utf8') + nameShadowCss();
  const cssName = `style-${hash(css)}.css`;
  out(cssName, css);
  const geo = fs.readFileSync(path.join(root, 'scripts', 'lib', 'geo.mjs'), 'utf8');
  const geoName = `geo-${hash(geo)}.js`;
  out(geoName, geo);
  const app = fs.readFileSync(path.join(src, 'app.js'), 'utf8').replace("from './geo.js'", `from './${geoName}'`);
  const appName = `app-${hash(app)}.js`;
  out(appName, app);

  const year = new Date().getFullYear();
  const description = `${profile.tagline} ${profile.intro.split('. ')[1] || ''}`.trim();
  const title = `${profile.name}, fullstack developer`;
  const github = `https://github.com/${profile.username}`;
  // Nút Website trỏ về chính trang này nên bỏ đi.
  const socials = (profile.socials || []).filter((s) => s.url.replace(/\/$/, '') !== SITE_URL);
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    alternateName: profile.username,
    url: SITE_URL,
    jobTitle: 'Fullstack developer',
    address: { '@type': 'PostalAddress', addressLocality: 'Ho Chi Minh City', addressCountry: 'VN' },
    sameAs: [github, ...socials.map((s) => s.url).filter((u) => u.startsWith('http'))],
  };
  const lead = esc(profile.tagline).replace(/(Windows tools|web apps)/g, '<em>$1</em>');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_URL}/">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="${THEMES.dark.bg}" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="${THEMES.light.bg}" media="(prefers-color-scheme: light)">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}/">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/unbounded-800.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/${cssName}">
<script type="module" src="/${appName}"></script>
<script type="application/ld+json">${JSON.stringify(person)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav"><div class="wrap">
<a class="brand" href="#top" aria-label="${esc(profile.name)}, back to top">${cubeCss()}<span>${esc(profile.username.toLowerCase())}</span></a>
<nav class="nav-links" aria-label="Sections"><a href="#work">Work</a><a href="#stack">Stack</a><a href="#activity">Activity</a><a class="keep" href="#contact">Contact</a></nav>
<a class="icon-btn" href="${github}" aria-label="GitHub">${icon('github')}</a>
</div></header>
<main id="main">
<section class="hero wrap" id="top">
<div class="hero-copy">
<p class="whoami"><span class="accent">~/${esc(profile.username.toLowerCase())}</span> $ whoami</p>
<h1 class="name" data-name>${esc(profile.name.toUpperCase())}</h1>
<p class="typing mono"><span class="accent">&gt;</span> <span data-typing data-roles="${esc(JSON.stringify(profile.roles))}">${esc(profile.roles[0])}</span><span class="caret" aria-hidden="true"></span></p>
<div class="ctas"><a class="btn primary" href="#work">View work</a><a class="btn" href="${github}">${icon('github')}GitHub</a></div>
</div>
<div class="hero-orb"><canvas id="orb" role="img" aria-label="A rotating geodesic sphere. Drag to spin it."></canvas></div>
</section>
<section class="about wrap">
<p class="lead reveal">${lead}</p>
<p class="intro reveal">${esc(profile.intro.trim())}</p>
</section>
<section class="section wrap" id="work">
<h2 class="section-title">${cubeCss()}Selected work</h2>
<div class="work-grid">${projects.map((p) => projectCard(p, metaFor(p), images[p.id])).join('')}</div>
${
  profile.more && profile.more.length
    ? `<div class="more reveal"><h3>More projects</h3><ul>${profile.more
        .map(
          (m) =>
            `<li><a href="${esc(m.repo ? `https://github.com/${m.repo}` : m.link)}">${esc(m.title)}</a>${
              m.link && m.repo ? `<a class="demo" href="${esc(m.link)}">live demo</a>` : ''
            }<p>${esc(m.description)}</p></li>`,
        )
        .join('')}</ul></div>`
    : ''
}
</section>
<section class="section wrap" id="stack">
<h2 class="section-title">${cubeCss()}Stack</h2>
${keyboard(profile.stack || [])}
</section>
${
  contrib
    ? `<section class="section wrap" id="activity">
<h2 class="section-title">${cubeCss()}Activity</h2>
<img class="contrib reveal" src="${contrib}" width="1280" height="850" loading="lazy" decoding="async" alt="3D contribution calendar of ${esc(profile.username)} over the last year">
<a class="link-arrow" href="${github}">Everything else is on GitHub${icon('phosphor:arrow-up-right', { weight: 'bold' })}</a>
</section>`
    : ''
}
<section class="section wrap contact" id="contact">
<h2 class="section-title">${cubeCss()}Contact</h2>
<p class="lead reveal">Have a project or a role in mind? <em>Send me a message.</em></p>
<div class="socials reveal">${socials.map((s) => `<a class="btn" href="${esc(s.url)}">${icon(s.icon)}${esc(s.label)}</a>`).join('')}</div>
</section>
</main>
<footer class="footer"><div class="wrap">
<span>${esc(profile.quote || '')}</span>
<span>&copy; ${year} ${esc(profile.name)}. <a href="${github}/${profile.username}">Source of this site</a></span>
</div></footer>
</body>
</html>
`;
  out('index.html', html);

  out(
    '404.html',
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/${cssName}"></head><body><main class="wrap" style="min-height:100dvh;display:grid;place-content:center;gap:24px;text-align:center"><p class="whoami"><span class="accent">~/${esc(profile.username.toLowerCase())}</span> $ cd ./this-page</p><h1 class="name" style="font-size:clamp(56px,12vw,120px)">404</h1><p class="intro" style="margin-inline:auto">This page does not exist.</p><p><a class="btn primary" href="/">Back home</a></p></main></body></html>`,
  );

  out('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  out(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>\n`,
  );
  out(
    '_headers',
    [
      '/*',
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
      // Cloudflare Web Analytics tự chèn beacon từ cloudflareinsights.com.
      "  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://static.cloudflareinsights.com; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      '/fonts/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '/img/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '/*.css',
      '  Cache-Control: public, max-age=31536000, immutable',
      '/*.js',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
    ].join('\n'),
  );

  return fs.readdirSync(dist, { recursive: true }).filter((f) => !fs.statSync(path.join(dist, f)).isDirectory());
}
