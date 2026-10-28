import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const src = 'C:/Users/sisit/Downloads/Catalogo mix.pdf';
const outDir = 'site/assets/img/catalog';
fs.mkdirSync(outDir, { recursive: true });

const catalogo = JSON.parse(fs.readFileSync('data/catalogo.json', 'utf8'));
const wanted = catalogo.pages.filter((p) => p.text.length >= 80).map((p) => p.page);

const buf = fs.readFileSync(src);
const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;

let totalBytes = 0;
for (const p of wanted) {
  const page = await doc.getPage(p);
  const viewport = page.getViewport({ scale: 0.75 });
  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const out = `${outDir}/p${String(p).padStart(3, '0')}.jpg`;
  fs.writeFileSync(out, canvas.toBuffer('image/jpeg', 78));
  totalBytes += fs.statSync(out).size;
  if (p % 40 === 0) console.log(`rendered ${p}`);
}
console.log(`DONE ${wanted.length} paginas, ${(totalBytes / 1048576).toFixed(1)} MB`);
