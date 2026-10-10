// Xem trước README như trên GitHub: dựng Markdown bằng API của GitHub, phục vụ ảnh từ thư mục repo.
// Chạy: npm run preview   rồi mở http://localhost:4173  (thêm ?theme=light để xem giao diện sáng)

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4173);
const TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.html': 'text/html; charset=utf-8' };

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

async function renderReadme() {
  const text = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const headers = { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch('https://api.github.com/markdown', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, mode: 'markdown', context: 'NovWyatt/NovWyatt' }),
  });
  if (!res.ok) throw new Error(`GitHub markdown API: ${res.status}`);
  return res.text();
}

function page(html, theme) {
  const dark = theme !== 'light';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Xem trước profile</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-${dark ? 'dark' : 'light'}.min.css">
<style>body{margin:0;background:${dark ? '#0d1117' : '#ffffff'};color-scheme:${dark ? 'dark' : 'light'}}
.wrap{max-width:900px;margin:24px auto;padding:24px;border:1px solid ${dark ? '#30363d' : '#d0d7de'};border-radius:6px}
.markdown-body{background:transparent}</style></head>
<body><div class="wrap"><article class="markdown-body">${html}</article></div></body></html>`;
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    try {
      if (url.pathname === '/') {
        const html = await renderReadme();
        res.writeHead(200, { 'Content-Type': TYPES['.html'] });
        res.end(page(html, url.searchParams.get('theme')));
        return;
      }
      // GitHub đổi đường dẫn tương đối thành /NovWyatt/NovWyatt/raw/main/...
      const rel = decodeURIComponent(url.pathname).replace(/^\/NovWyatt\/NovWyatt\/(raw|blob)\/main\//, '/');
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(err));
    }
  })
  .listen(PORT, () => console.log(`Xem trước: http://localhost:${PORT}`));
