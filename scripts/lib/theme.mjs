// Bảng màu chung cho mọi ảnh. Một màu nhấn duy nhất (xanh chanh) trên nền xám lạnh.
// Mỗi SVG tự đổi sáng/tối theo cài đặt máy của người xem (prefers-color-scheme).

export const THEMES = {
  dark: {
    bg: '#0A0C0F',
    surface: '#111419',
    raised: '#181C23',
    edge: '#040506',
    line: '#262B33',
    text: '#E9ECF0',
    muted: '#8E97A4',
    faint: '#3B424C',
    accent: '#C4F25A',
    accentSoft: '#8DBB2C',
    accentDeep: '#26340D',
  },
  light: {
    bg: '#EDF0F3',
    surface: '#FFFFFF',
    raised: '#F5F7F9',
    edge: '#BCC4CE',
    line: '#D9DEE5',
    text: '#0D1015',
    muted: '#56606D',
    faint: '#B3BBC5',
    accent: '#4C7A0A',
    accentSoft: '#76AE17',
    accentDeep: '#E2F5BA',
  },
};

const toVars = (t) =>
  Object.entries(t)
    .map(([k, v]) => `--${k}:${v}`)
    .join(';');

export function themeCss() {
  return `:root{${toVars(THEMES.dark)}}@media (prefers-color-scheme:light){:root{${toVars(THEMES.light)}}}`;
}

// Trộn màu theo tỉ lệ, để các lớp đùn khối 3D chuyển dần giữa hai tông.
export const mix = (a, b, pct) => `color-mix(in srgb,var(--${a}) ${pct}%,var(--${b}))`;
