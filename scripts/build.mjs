// Sinh README.md và toàn bộ ảnh trong assets/ từ profile.yml.
// Chạy: npm run build   (cần Node 22+; số liệu GitHub lấy bằng PROFILE_TOKEN, GITHUB_TOKEN hoặc gh CLI nếu có)
// Chỉ vẽ lại một phần: npm run build -- hero cards stack socials headings readme site

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { renderHeading, renderSocial } from './lib/bits.mjs';
import { renderHalfCard, renderWideCard } from './lib/cards.mjs';
import { loadRepoMeta } from './lib/github.mjs';
import { renderHero } from './lib/hero.mjs';
import { renderReadme } from './lib/readme.mjs';
import { buildSite } from './lib/site.mjs';
import { renderStack } from './lib/stack.mjs';
import { loadFonts } from './lib/type.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

const profile = YAML.parse(fs.readFileSync(path.join(ROOT, 'profile.yml'), 'utf8'));
const fonts = loadFonts(path.join(ROOT, 'fonts'));
const projects = (profile.projects || []).filter((p) => p.show !== false);

const written = [];
function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  written.push(`${rel.padEnd(42)} ${(Buffer.byteLength(content) / 1024).toFixed(1).padStart(6)} KB`);
}

const repos = [...projects.map((p) => p.repo), ...(profile.more || []).map((m) => m.repo)].filter(Boolean);
const { meta, notes } = await loadRepoMeta(repos, path.join(ROOT, 'data', 'github.json'));
const metaFor = (p) => meta[p.repo] || null;

if (want('hero')) write('assets/hero.svg', renderHero(profile, fonts));

if (want('cards')) {
  let wide = 0;
  for (const [i, p] of projects.entries()) {
    const svg = p.size === 'wide' ? await renderWideCard(p, metaFor(p), fonts, ROOT, i, wide++ % 2 === 1) : renderHalfCard(p, metaFor(p), fonts, i);
    write(`assets/projects/${p.id}.svg`, svg);
  }
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const socialFiles = (profile.socials || []).map((s) => `assets/social/${slug(s.label)}.svg`);
if (want('socials')) {
  (profile.socials || []).forEach((s, i) => write(socialFiles[i], renderSocial(s, fonts)));
}

const headings = { work: 'assets/heading-work.svg', stack: 'assets/heading-stack.svg', activity: 'assets/heading-activity.svg' };
if (want('headings')) {
  write(headings.work, renderHeading('Selected work', fonts, 0));
  write(headings.stack, renderHeading('Stack', fonts, 1));
  write(headings.activity, renderHeading('Activity', fonts, 2));
}

if (want('stack') && profile.stack) write('assets/stack.svg', renderStack(profile.stack, fonts));

const contribFile = 'profile-3d-contrib/profile-wyatt.svg';
// Bo góc và kẻ viền biểu đồ đóng góp 3D (do GitHub Actions tạo) cho đồng bộ với các khối khác.
if (want('contrib') && fs.existsSync(path.join(ROOT, contribFile))) {
  const file = path.join(ROOT, contribFile);
  let svg = fs.readFileSync(file, 'utf8');
  if (!svg.includes('data-polished')) {
    const m = svg.match(/<svg[^>]*width="(\d+)" height="(\d+)"/);
    const [w, h] = m ? [Number(m[1]), Number(m[2])] : [1280, 850];
    const border =
      `<rect data-polished="1" x="1" y="1" width="${w - 2}" height="${h - 2}" rx="29" fill="none" stroke="#D9DEE5" stroke-width="2"/>` +
      '<style>@media (prefers-color-scheme:dark){[data-polished]{stroke:#262B33}}</style>';
    svg = svg
      .replace(/<rect x="0" y="0" width="(\d+)" height="(\d+)" class="fill-bg">/, '<rect x="0" y="0" width="$1" height="$2" rx="30" class="fill-bg">')
      .replace(/<\/svg>\s*$/, `${border}</svg>`);
    write(contribFile, svg);
  }
}

if (want('readme')) {
  write('README.md', renderReadme(profile, projects, { socialFiles, contribFile, metaFor, headings }) + '\n');
}

// Trang web wyattos.cyou (site/dist, không đưa vào git; đăng bằng npm run deploy).
if (want('site')) {
  const heroSvg = fs.readFileSync(path.join(ROOT, 'assets/hero.svg'), 'utf8');
  const files = await buildSite(profile, projects, { root: ROOT, metaFor, heroSvg, contribFile: path.join(ROOT, contribFile) });
  written.push(`site/dist/ (${files.length} tệp)`);
}

// Xoá ảnh của dự án hoặc mạng xã hội đã bỏ khỏi profile.yml.
if (!only.length) {
  const keep = new Set([...projects.map((p) => `${p.id}.svg`), ...socialFiles.map((f) => path.basename(f))]);
  for (const dir of ['assets/projects', 'assets/social']) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      if (f.endsWith('.svg') && !keep.has(f)) {
        fs.rmSync(path.join(abs, f));
        written.push(`${dir}/${f} (đã xoá)`);
      }
    }
  }
}

console.log(written.join('\n'));
if (notes.length) console.log('\nGhi chú:\n' + notes.map((n) => `  - ${n}`).join('\n'));
