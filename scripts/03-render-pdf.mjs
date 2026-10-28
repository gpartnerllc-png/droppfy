import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const src = 'C:/Users/sisit/Downloads/Catalogo mix.pdf';
const outDir = 'data/pages';
fs.mkdirSync(outDir, { recursive: true });

const pagesArg = process.argv[2];
const buf = fs.readFileSync(src);
const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;

const wanted = pagesArg
  ? pagesArg.split(',').flatMap((r) => {
      const [a, b] = r.split('-').map(Number);
      return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
    })
  : Array.from({ length: doc.numPages }, (_, i) => i + 1);

for (const p of wanted) {
  const page = await doc.getPage(p);
  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  fs.writeFileSync(`${outDir}/p${String(p).padStart(3, '0')}.png`, canvas.toBuffer('image/png'));
  if (p % 20 === 0) console.log(`rendered ${p}`);
}
console.log('DONE');
