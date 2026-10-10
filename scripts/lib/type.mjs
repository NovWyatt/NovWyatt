// Dựng chữ thành path từ file font, để ảnh hiển thị đúng font trên mọi máy
// (SVG nhúng trong README không tải được font ngoài).
// Mỗi glyph được định nghĩa một lần trong <defs> rồi dùng lại bằng <use>, nên ảnh nhẹ.

import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const FONT_FILES = {
  display: 'Unbounded-ExtraBold.ttf',
  sans: 'BeVietnamPro-Regular.ttf',
  sansBold: 'BeVietnamPro-SemiBold.ttf',
  mono: 'JetBrainsMono-Medium.ttf',
  monoBold: 'JetBrainsMono-Bold.ttf',
};
const FONT_CODES = { display: 'd', sans: 's', sansBold: 'b', mono: 'm', monoBold: 'n' };

export function loadFonts(dir) {
  const fonts = {};
  for (const [key, file] of Object.entries(FONT_FILES)) {
    const buf = fs.readFileSync(path.join(dir, file));
    fonts[key] = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return fonts;
}

export class Typesetter {
  constructor(fonts, prefix) {
    this.fonts = fonts;
    this.prefix = prefix;
    this.used = new Map();
  }

  // Vị trí từng glyph theo đơn vị font (chưa nhân cỡ chữ).
  layout(text, key, { tracking = 0 } = {}) {
    const font = this.fonts[key];
    const glyphs = font.stringToGlyphs(text.normalize('NFC'));
    const spacing = tracking * font.unitsPerEm;
    const placed = [];
    let x = 0;
    glyphs.forEach((glyph, i) => {
      placed.push({ glyph, x });
      x += glyph.advanceWidth + spacing;
      if (i < glyphs.length - 1) x += font.getKerningValue(glyph, glyphs[i + 1]);
    });
    if (glyphs.length) x -= spacing;
    return { placed, width: x, upm: font.unitsPerEm };
  }

  measure(text, key, size, opts) {
    const { width, upm } = this.layout(text, key, opts);
    return (width * size) / upm;
  }

  glyphId(key, glyph) {
    const id = `${this.prefix}${FONT_CODES[key]}${glyph.index}`;
    if (!this.used.has(id)) {
      const d = glyph.getPath(0, 0, this.fonts[key].unitsPerEm).toPathData(0);
      this.used.set(id, d);
    }
    return id;
  }

  // Một dòng chữ. anchor: start | middle | end. Trả về chuỗi <g> đặt sẵn vị trí.
  run(text, key, size, x, y, { anchor = 'start', cls = '', tracking = 0, attrs = '' } = {}) {
    const { placed, width, upm } = this.layout(text, key, { tracking });
    const scale = size / upm;
    let left = x;
    if (anchor === 'middle') left = x - (width * scale) / 2;
    if (anchor === 'end') left = x - width * scale;
    const uses = placed
      .filter(({ glyph }) => glyph.path && glyph.path.commands && glyph.path.commands.length)
      .map(({ glyph, x: gx }) => `<use href="#${this.glyphId(key, glyph)}"${gx ? ` x="${Math.round(gx)}"` : ''}/>`)
      .join('');
    const klass = cls ? ` class="${cls}"` : '';
    return `<g${klass}${attrs ? ' ' + attrs : ''} transform="translate(${round(left)} ${round(y)}) scale(${round4(scale)})">${uses}</g>`;
  }

  // Ngắt dòng theo bề rộng tối đa; dòng cuối thêm "..." nếu quá số dòng cho phép.
  wrap(text, key, size, maxWidth, maxLines = Infinity) {
    const words = text.trim().split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (this.measure(next, key, size) <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      let last = kept[maxLines - 1];
      while (last && this.measure(`${last}...`, key, size) > maxWidth) last = last.replace(/\s*\S+$/, '');
      kept[maxLines - 1] = `${last}...`;
      return kept;
    }
    return lines;
  }

  defs() {
    return [...this.used].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('');
  }
}

const round = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;
