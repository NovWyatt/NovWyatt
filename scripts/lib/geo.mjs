// Hình học 3D nhỏ gọn: khối cầu trắc địa (icosphere), phép quay và phép chiếu phối cảnh.
// SVG không có 3D nên mọi khung hình được tính sẵn ở đây rồi để trình duyệt nội suy giữa chúng.

const PHI = (1 + Math.sqrt(5)) / 2;

const ICOSA_VERTS = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
];
const ICOSA_FACES = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

const normalize = ([x, y, z]) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};

export function icosphere(subdivisions = 1) {
  let verts = ICOSA_VERTS.map(normalize);
  let faces = ICOSA_FACES;
  for (let s = 0; s < subdivisions; s++) {
    const cache = new Map();
    const mid = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!cache.has(key)) {
        const [ax, ay, az] = verts[a];
        const [bx, by, bz] = verts[b];
        verts.push(normalize([(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2]));
        cache.set(key, verts.length - 1);
      }
      return cache.get(key);
    };
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  const edgeSet = new Map();
  for (const [a, b, c] of faces) {
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const key = p < q ? `${p}_${q}` : `${q}_${p}`;
      if (!edgeSet.has(key)) edgeSet.set(key, [Math.min(p, q), Math.max(p, q)]);
    }
  }
  return { verts, edges: [...edgeSet.values()] };
}

export const rotX = (a) => ([x, y, z]) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
export const rotY = (a) => ([x, y, z]) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
export const rotZ = (a) => ([x, y, z]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
export const compose = (...fns) => (p) => fns.reduce((acc, f) => f(acc), p);

// z dương hướng về người xem. Trả về toạ độ màn hình và hệ số phóng.
export function project([x, y, z], { cx, cy, radius, camera = 4 }) {
  const s = camera / (camera - z);
  return { x: cx + x * radius * s, y: cy - y * radius * s, s, z };
}

export const PHI_RATIO = PHI;
