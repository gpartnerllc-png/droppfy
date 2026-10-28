import fs from 'node:fs';

const urls = [
  'https://pv.b4you.com.br/pages/ba37739f-f120-4302-91a8-b0aef1fdcfc9/N3D0eXCBRc',
  'https://pv.b4you.com.br/pages/cd98fb7e-f3a2-4f89-bb4e-3152a96bad7c/0oo2ymq_ry',
  'https://pv.b4you.com.br/pages/4b3fc91e-8c1d-468f-acef-6253948bb927/y1sNs-KyvC',
  'https://pv.b4you.com.br/pages/d4fabe4d-4f60-4ec4-8aa6-a95aa6dfde67/uSUYsTCB25',
  'https://pv.b4you.com.br/pages/ab296ba7-d797-41b5-8e3f-0da316752d48/g9Mv3yiMKs',
  'https://pv.b4you.com.br/pages/796b97b0-ee03-458b-a8b7-9815c0d93d89/yfyFw2LQMb',
  'https://pv.b4you.com.br/pages/251c03db-1f50-4ca9-840d-8dc4080184f2/yfyFw2LQMb',
  'https://pv.b4you.com.br/pages/847d1690-56d6-4510-8aa2-d9b133f1ff16/yfyFw2LQMb',
  'https://pv.b4you.com.br/pages/e07ad915-2118-4dda-be1a-5b9a1ecb486f/yfyFw2LQMb',
  'https://pv.b4you.com.br/pages/17e93c65-9307-4b88-8b2c-c238f288b32c/F-O5zTubcM',
  'https://pv.b4you.com.br/pages/937c56de-e0f9-46ec-92d2-a15bceecfac8/DPP2bbrBub',
  'https://pv.b4you.com.br/pages/20bc43dc-1760-4472-8702-cd94fee3e39d/KLJz_AaUHu',
  'https://pv.b4you.com.br/pages/43ac3c3d-2814-4d4c-aa08-a3c4df36110e/KLJz_AaUHu',
  'https://pv.b4you.com.br/pages/3472b473-3855-4fc0-9085-7e1caf2321e2/KLJz_AaUHu',
  'https://pv.b4you.com.br/pages/f26b5d67-6bab-46a4-964b-f10e2c6324c6/KLJz_AaUHu',
  'https://pv.b4you.com.br/pages/0ba3883c-8581-486d-8015-ee7989de1c08/KLJz_AaUHu',
  'https://pv.b4you.com.br/pages/c144f25e-052c-4eea-9352-90fa6748f708/tpqd9wGZDz',
  'https://pv.b4you.com.br/pages/6bdb4f62-a185-4a47-9afb-af2a4072974e/tpqd9wGZDz',
  'https://pv.b4you.com.br/pages/f0beee4e-022f-49d3-90d8-883a6ba6f623/tpqd9wGZDz',
  'https://pv.b4you.com.br/pages/a5fdf1b0-241d-4193-bf00-ec136099d460/tpqd9wGZDz',
  'https://pv.b4you.com.br/pages/705fb907-162d-4cef-b241-ca24d5b1543b/tpqd9wGZDz',
  'https://pv.b4you.com.br/pages/d35eb9e2-1863-4d6d-b9ef-4474f2c494cc/tpqd9wGZDz',
  'https://pv.b4you.com.br/pages/b2283f13-d36f-42db-b6db-fe4e38d5d384/uQkL3pKaN5',
  'https://pv.b4you.com.br/pages/13da1d72-c493-4d0f-b409-168bb12a452f/97tfVhNPwb',
  'https://pv.b4you.com.br/pages/e1f8ee3e-eae9-4c0d-90c7-8d17c4761de7/97tfVhNPwb',
  'https://pv.b4you.com.br/pages/f1903a03-3eec-4e46-b377-c6a99f8e2c66/97tfVhNPwb',
  'https://pv.b4you.com.br/pages/ea1ebd2b-8239-422c-9dc2-0430619b343f/97tfVhNPwb',
  'https://pv.b4you.com.br/pages/1128e964-7ddc-41ab-9bea-2dee1f0c1afa/SZOSRV00-b',
  'https://b4.app/ErnqpqoW',
  'https://pv.b4you.com.br/pages/f0d09e4e-80b1-47a8-8c15-d970be358e69/oGz5mwckFK',
  'https://pv.b4you.com.br/pages/b3bcb919-74be-4422-ac8e-467c712604fc/oGz5mwckFK',
  'https://pv.b4you.com.br/pages/770b7f00-7c09-44ba-811e-671cc1a378c9/oGz5mwckFK',
  'https://pv.b4you.com.br/pages/785f536f-d535-4af2-ba57-4966f32fc813/oGz5mwckFK',
  'https://pv.b4you.com.br/pages/37573e09-cfef-4a43-8718-cc98f4e6f363/xWO1D_WN5F',
  'https://pv.b4you.com.br/pages/08b93b4e-bc90-447c-81c5-ed2e0e86ac37/xWO1D_WN5F',
  'https://pv.b4you.com.br/pages/8a588d46-411c-4140-a37e-4dac80d2f30a/xWO1D_WN5F',
  'https://pv.b4you.com.br/pages/5b8f00ac-5ab1-4725-9afc-04e18249a32c/xWO1D_WN5F',
  'https://pv.b4you.com.br/pages/89ee2413-95e3-4f08-a40c-494ccff34710/xWO1D_WN5F',
  'https://pv.b4you.com.br/pages/b574d4a5-7417-45b6-9039-d05d675aa877/Ym7CFqOT2y',
  'https://pv.b4you.com.br/pages/380f2b1f-80b1-4744-a9da-360877704a57/Ym7CFqOT2y',
  'https://pv.b4you.com.br/pages/33b2709d-fd55-48a5-95a6-18d8f2f8acca/Ym7CFqOT2y',
  'https://pv.b4you.com.br/pages/cd8f7b04-c90b-4559-8886-a41ef30dec99/Ym7CFqOT2y',
  'https://pv.b4you.com.br/pages/0230fb2b-8c28-4050-85e2-8a4686fc4351/Ym7CFqOT2y',
  'https://pv.b4you.com.br/pages/3cc52afc-9703-444f-8d2d-247cf8434aa4/PFj-7KLZ5u',
  'https://b4.app/jPEpwspG',
];

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const meta = (html, prop) => {
  const re = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  if (m) return decode(m[1]);
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i');
  const m2 = html.match(re2);
  return m2 ? decode(m2[1]) : null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchText = async (url, tries = 2) => {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { finalUrl: res.url, html: await res.text() };
    } catch (e) {
      if (i === tries - 1) return { finalUrl: url, html: null, error: String(e.message || e) };
      await sleep(1000);
    }
  }
};

const results = [];
for (const u of urls) {
  const entry = { stub: u };
  const first = await fetchText(u);
  entry.resolved = first.finalUrl;
  if (first.html) {
    entry.title = meta(first.html, 'title') || (first.html.match(/<title>([^<]+)<\/title>/i) || [])[1]?.trim() || null;
    if (entry.title) entry.title = decode(entry.title);
    entry.image = meta(first.html, 'image');
    entry.target = meta(first.html, 'url');
    const rep = first.html.match(/window\.location\.replace\(["']([^"']+)["']\)/);
    if (rep) entry.target = entry.target || rep[1];
    const href = first.html.match(/<meta http-equiv=["']refresh["'] content=["'][^"]*url=([^"']+)["']/i);
    if (href) entry.target = entry.target || href[1];

    if (entry.target) {
      const lp = await fetchText(entry.target);
      if (lp.html) {
        entry.lpImage = meta(lp.html, 'image');
        entry.video = meta(lp.html, 'video');
        entry.description = meta(lp.html, 'description')?.slice(0, 300) || null;
        const price = lp.html.match(/R\$\s?[0-9][0-9.,]*/);
        if (price) entry.lpPrice = price[0];
      } else {
        entry.lpError = lp.error || 'fetch failed';
      }
    }
  } else {
    entry.error = first.error || 'no html';
  }
  results.push(entry);
  console.log(`[${results.length}/${urls.length}] ${(entry.title || entry.error || '?').slice(0, 60)}`);
  await sleep(250);
}

fs.writeFileSync('data/parceiros.json', JSON.stringify(results, null, 2));
console.log('DONE -> data/parceiros.json');
