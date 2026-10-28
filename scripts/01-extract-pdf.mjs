import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const src = 'C:/Users/sisit/Downloads/Catalogo mix.pdf';
const out = 'data/catalogo.json';

const buf = fs.readFileSync(src);
const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true, disableFontFace: true }).promise;

const pages = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  const lines = [];
  for (const item of tc.items) {
    if (typeof item.str === 'string' && item.str.trim()) lines.push(item.str.trim());
  }
  pages.push({ page: p, text: lines.join(' ') });
  if (p % 10 === 0) console.log(`page ${p}/${doc.numPages}`);
}

fs.writeFileSync(out, JSON.stringify({ numPages: doc.numPages, pages }, null, 2));
console.log(`DONE ${doc.numPages} pages -> ${out}`);
