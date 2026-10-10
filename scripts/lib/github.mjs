// Lấy số liệu repo (sao, số commit, bản phát hành) từ GitHub API.
// Kết quả được lưu vào data/github.json: khi chạy trên Actions mà token không đọc được repo private,
// số liệu cũ trong tệp này vẫn được dùng.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function token() {
  for (const name of ['PROFILE_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN']) {
    if (process.env[name]) return process.env[name];
  }
  try {
    return execSync('gh auth token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

async function api(pathname, auth) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const res = await fetch(`https://api.github.com${pathname}`, { headers });
  if (!res.ok) {
    const err = new Error(`${res.status} ${pathname}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

async function commitCount(repo, auth) {
  const res = await api(`/repos/${repo}/commits?per_page=1`, auth);
  const link = res.headers.get('link') || '';
  const last = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (last) return Number(last[1]);
  const body = await res.json();
  return body.length;
}

async function latestRelease(repo, auth) {
  try {
    const res = await api(`/repos/${repo}/releases/latest`, auth);
    return (await res.json()).tag_name;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function fetchOne(repo, auth) {
  const info = await (await api(`/repos/${repo}`, auth)).json();
  return {
    stars: info.stargazers_count,
    commits: await commitCount(repo, auth),
    release: await latestRelease(repo, auth),
  };
}

export async function loadRepoMeta(repos, cacheFile) {
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
  const auth = token();
  const result = {};
  const notes = [];
  await Promise.all(
    [...new Set(repos)].map(async (repo) => {
      try {
        result[repo] = await fetchOne(repo, auth);
      } catch (err) {
        if (cache[repo]) {
          result[repo] = cache[repo];
          notes.push(`${repo}: dùng số liệu đã lưu (${err.message})`);
        } else {
          notes.push(`${repo}: không lấy được số liệu (${err.message})`);
        }
      }
    }),
  );
  // Chỉ giữ repo còn dùng, để tệp không giữ lại tên repo đã bỏ khỏi profile.yml.
  const merged = Object.fromEntries([...new Set(repos)].filter((r) => result[r] || cache[r]).map((r) => [r, result[r] || cache[r]]));
  const sorted = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(sorted, null, 2) + '\n');
  return { meta: result, notes };
}
