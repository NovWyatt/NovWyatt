// Ghép README.md từ profile.yml và các ảnh đã sinh.

import { statusLabel } from './cards.mjs';

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const repoUrl = (repo) => `https://github.com/${repo}`;
const projectUrl = (p) => p.link || (p.repo ? repoUrl(p.repo) : '#');

export function renderReadme(profile, projects, { socialFiles, contribFile, metaFor, headings }) {
  const out = [];
  out.push(
    '<!--',
    '  README này được sinh tự động từ profile.yml (scripts/build.mjs).',
    '  Muốn đổi nội dung thì sửa profile.yml, xem HUONG-DAN.md. Sửa trực tiếp tệp này sẽ bị ghi đè.',
    '-->',
    '',
  );

  out.push(
    `<a href="https://github.com/${profile.username}"><img src="assets/hero.svg" width="100%" alt="${attr(`${profile.name}: ${profile.roles.join(', ')}`)}"></a>`,
    '',
  );

  if (profile.socials && profile.socials.length) {
    const buttons = profile.socials.map(
      (s, i) => `<a href="${attr(s.url)}"><img src="${socialFiles[i]}" height="46" alt="${attr(s.label)}"></a>`,
    );
    out.push('<p align="center">', buttons.join('&nbsp;\n'), '</p>', '');
  }

  if (profile.intro) out.push(`<p align="center">${profile.intro.trim()}</p>`, '');

  out.push(`<img src="${headings.work}" width="100%" alt="Selected work">`, '');

  // Thẻ rộng đứng riêng một hàng; các thẻ nửa liền nhau được ghép thành từng cặp.
  const rows = [];
  let pending = [];
  for (const p of projects) {
    if (p.size === 'wide') {
      if (pending.length) rows.push(pending), (pending = []);
      rows.push([p]);
    } else {
      pending.push(p);
      if (pending.length === 2) rows.push(pending), (pending = []);
    }
  }
  if (pending.length) rows.push(pending);

  for (const row of rows) {
    const width = row.length === 1 && row[0].size === 'wide' ? '100%' : '49%';
    const cells = row.map((p) => {
      const alt = `${p.title}: ${p.description.trim()} (${statusLabel(p, metaFor(p))})`;
      return `<a href="${attr(projectUrl(p))}"><img src="assets/projects/${p.id}.svg" width="${width}" alt="${attr(alt)}"></a>`;
    });
    // Hai thẻ phải nằm trên cùng một dòng, nếu không GitHub có thể chèn <br> giữa chúng.
    out.push(cells.join('&nbsp;'), '');
  }

  if (profile.more && profile.more.length) {
    out.push('<details>', '<summary><b>More projects</b></summary>', '', '| Project | What it is |', '| --- | --- |');
    for (const m of profile.more) {
      const name = `[${m.title}](${m.repo ? repoUrl(m.repo) : m.link})`;
      const demo = m.link && m.repo ? ` [Live demo](${m.link})` : '';
      out.push(`| ${name} | ${m.description}${demo} |`);
    }
    out.push('', '</details>', '');
  }

  out.push(`<img src="${headings.stack}" width="100%" alt="Stack">`, '');
  const names = (profile.stack || []).map((row) => row.row).join(', ');
  out.push(`<img src="assets/stack.svg" width="100%" alt="${attr(`Tech stack keyboard: ${names}`)}">`, '');

  out.push(`<img src="${headings.activity}" width="100%" alt="Activity">`, '');
  out.push(`<img src="${contribFile}" width="100%" alt="3D contribution calendar of ${attr(profile.username)}">`, '');

  if (profile.quote) out.push(`<p align="center"><sub>${profile.quote}</sub></p>`, '');

  return out.join('\n');
}
