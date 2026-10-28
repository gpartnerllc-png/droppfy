const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexagon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function draw(size) {
  const s = size / 96;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const gold = ctx.createLinearGradient(4 * s, 4 * s, 92 * s, 92 * s);
  gold.addColorStop(0, '#f0d78c');
  gold.addColorStop(0.55, '#e8c56a');
  gold.addColorStop(1, '#c8963a');
  const green = ctx.createLinearGradient(35 * s, 32 * s, 61 * s, 62 * s);
  green.addColorStop(0, '#1fe3a0');
  green.addColorStop(1, '#0e9e6c');

  roundedRect(ctx, 4 * s, 4 * s, 88 * s, 88 * s, 22 * s);
  ctx.fillStyle = '#0b101f';
  ctx.fill();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3 * s;
  ctx.stroke();

  hexagon(ctx, [[48, 22], [70, 36], [70, 60], [48, 74], [26, 60], [26, 36]].map((p) => [p[0] * s, p[1] * s]));
  ctx.strokeStyle = gold;
  ctx.lineWidth = 6 * s;
  ctx.lineJoin = 'round';
  ctx.stroke();

  hexagon(ctx, [[48, 32], [61, 40], [61, 54], [48, 62], [35, 54], [35, 40]].map((p) => [p[0] * s, p[1] * s]));
  ctx.fillStyle = green;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(48 * s, 47 * s, 6 * s, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6, 18, 12, 0.55)';
  ctx.fill();

  return canvas;
}

const out = process.argv[2];
if (!out) {
  console.error('uso: node gen-favicons.js <dir-saida>');
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });

const p96 = draw(96);
fs.writeFileSync(path.join(out, 'favicon-96.png'), p96.toBuffer('image/png'));
const p180 = draw(180);
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), p180.toBuffer('image/png'));

// favicon.ico com o PNG 96 embutido (formato ICO aceita PNG)
const png = p96.toBuffer('image/png');
const ico = Buffer.alloc(22 + png.length);
ico.writeUInt16LE(0, 0); // reservado
ico.writeUInt16LE(1, 2); // tipo: icone
ico.writeUInt16LE(1, 4); // quantidade
ico[6] = 96;  // largura
ico[7] = 96;  // altura
ico.writeUInt16LE(1, 10);  // planes
ico.writeUInt16LE(32, 12); // bitcount
ico.writeUInt32LE(png.length, 14);
ico.writeUInt32LE(22, 18);
png.copy(ico, 22);
fs.writeFileSync(path.join(out, 'favicon.ico'), ico);

console.log('gerado em', out, ': favicon-96.png, apple-touch-icon.png, favicon.ico');
