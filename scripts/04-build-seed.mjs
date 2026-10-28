import fs from 'node:fs';

const catalogo = JSON.parse(fs.readFileSync('data/catalogo.json', 'utf8'));
const parceiros = JSON.parse(fs.readFileSync('data/parceiros.json', 'utf8'));
const naturoyal = JSON.parse(fs.readFileSync('data/naturoyal-produtos.json', 'utf8'));

const ip = [
  { id: 'muscle-pack-mono', name: 'MUSCLE PACK WHEY PROTEIN 3W 40G — MONODOSE', brand: 'TrustFuel', category: 'Suplementos', base: 999, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2Ff157626a-4903-449e-a8a9-cf2f8834d4f5%3Fv%3D20250826141446%26q%3Dthumbnail', badge: 'Mais vendido' },
  { id: 'powerfuel-chocolate', name: 'POWERFUEL PROTEIN CHOCOLATE 450G', brand: 'TrustFuel', category: 'Suplementos', base: 5288, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2F06d903e5-7e59-4790-92ae-dc41928b1e80%3Fv%3D20250701192632%26q%3Dthumbnail', badge: 'Atacado 12+' },
  { id: 'powerfuel-coconut', name: 'POWERFUEL PROTEIN COCONUT 450G', brand: 'TrustFuel', category: 'Suplementos', base: 5288, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2F89b47237-479d-446b-99a4-fbba8d97abe6%3Fv%3D20250701193236%26q%3Dthumbnail' },
  { id: 'powerfuel-vanilla', name: 'POWERFUEL PROTEIN VANILLA 450G', brand: 'TrustFuel', category: 'Suplementos', base: 5288, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2F328e582d-846a-4f9e-bc21-9d37b06bc35a%3Fv%3D20250701193013%26q%3Dthumbnail' },
  { id: 'bready-original', name: 'BREADY — BASE NUTRITIVA ORIGINAL', brand: 'Bready', category: 'Alimentos Funcionais', base: 6355, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2F175a1a1a-8d09-44e0-b546-8bb19c3d75fe%3Fv%3D20260118154943%26q%3Dthumbnail', badge: 'Premium' },
  { id: 'waffle-fit', name: 'WAFFLE FIT GOURMET — CROCÂNCIA DA NUTRIÇÃO', brand: 'Bready', category: 'Alimentos Funcionais', base: 6367, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2Face2c2a4-90f8-4ae9-903d-e56c29fda1c3%3Fv%3D20260118160542%26q%3Dthumbnail' },
  { id: 'bready-pizza', name: 'BREADY PIZZA — TOQUE DE TOMATE E MANJERICÃO', brand: 'Bready', category: 'Alimentos Funcionais', base: 6387, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2F71224562-67b4-4ce3-a3a2-0779289815c0%3Fv%3D20260118153445%26q%3Dthumbnail' },
  { id: 'brownie-premium', name: 'BROWNIE PREMIUM — PRAZER INTENSO DO CACAU', brand: 'Bready', category: 'Alimentos Funcionais', base: 6847, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2F6e9c9cf3-952e-4df8-b575-6c52303bcd8b%3Fv%3D20260118162341%26q%3Dthumbnail' },
  { id: 'prograss-pistachio', name: 'PROGRASS VEGAN PROTEIN — PISTACHIO 490G', brand: 'TrustFuel', category: 'Suplementos', base: 5088, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2Fd684e0d2-fd58-43d4-b984-abfe0e1c19ad%3Fv%3D20250701190333%26q%3Dthumbnail' },
  { id: 'kit-12-essencias', name: 'KIT 12 ESSÊNCIAS — EXPLORADOR AROMÁTICO', brand: 'Natura Royal', category: 'Aromaterapia', base: 72956, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2F35ff55a7-0dcd-4046-82fb-15e915a264a9%3Fv%3D20251202184335%26q%3Dthumbnail', badge: 'Kit Premium' },
  { id: 'kit-22-emocoes', name: 'KIT JARDIM DAS 22 EMOÇÕES — ROTA DA SERENIDADE', brand: 'Natura Royal', category: 'Aromaterapia', base: 99877, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2Fb16d535c-57df-4780-a2c3-2c56e152c2aa%3Fv%3D20251202183205%26q%3Dthumbnail', badge: 'Edição Especial' },
  { id: 'luva-termica', name: 'LUVA FEMININA TÉRMICA', brand: 'Droppfy', category: 'Moda & Bem-Estar', base: 1999, img: 'https://assets.infinitepay.io/unsafe/3840x0/filters:quality(75)/https%3A%2F%2Finfinitepay-sales.services.production.infinitepay.io%2Fv1%2Fproducts%2Fvariation%2Fmedia_proxy%2F15a5dc85-6575-4236-b506-032a7c42b2b8%3Fv%3D20250826112346%26q%3Dthumbnail' },
];

const trustfuel = [
  ['muscle-pack-egg-coco', 'SUP MUSCLE PACK EGG COCO FRAPPE PÓ 900G', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_sup-muscle-pack-egg-coco-frappe-po-900g-1.png'],
  ['powerfuel-creatine', 'SUP POWERFUEL CREATINE PÓ 300G', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_sup-powerfuel-creatine-po-300g-1.png'],
  ['whey-vanilla', 'WHEY PROTEIN POWERFUEL VANILLA 900G', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_whey-protein-powerfuel-protein-vanilla-900g-282.png'],
  ['whey-coconut', 'WHEY PROTEIN POWERFUEL COCONUT 900G', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_whey-protein-powerfuel-protein-coconut-900g-283.png'],
  ['whey-chocolate', 'WHEY PROTEIN POWERFUEL CHOCOLATE 900G', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_whey-protein-powerfuel-protein-chocolate-900g-284.png'],
  ['glutamine', 'SUP POWERFUEL GLUTAMINE PÓ 300G', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_sup-powerfuel-glutamine-po-300g.png'],
  ['goalmy-flexfuel', 'GOALMY FLEXFUEL ORANGE', 'Goalmy', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_gm-goalmy-flexfuel-orange-c-30.png'],
  ['goalmy-hair', 'GOALMY HAIR SKIN NAILS STRAWBERRY', 'Goalmy', 'Beleza', 'https://www.trustfuel.com.br/upload/produto/imagem/b_gm-goalmy-hair-skin-nails-strawberry-c-6.png'],
  ['brainfuel-caps', 'SUP BRAINFUEL SPORTS CAPS', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_sup-brainfuel-sports-cap-c-60.jpg'],
  ['brainfuel-acai', 'SUP BRAINFUEL AÇAÍ BANANA PÓ 450G', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_sup-brainfuel-acai-banana-po-c-450g.jpg'],
  ['warm-up-spices', 'WARM-UP INDIAN SPICES — ACELERADOR METABÓLICO 110G', 'TrustFuel', 'Suplementos', 'https://www.trustfuel.com.br/upload/produto/imagem/b_warm-up-indian-spices-acelerador-metabolico-natural-110g-142.png'],
  ['bready-sache', 'BREADY — 3 SABORES SACHÊ', 'Bready', 'Alimentos Funcionais', 'https://www.meubready.com.br/cdn/shop/files/BREADY_Mockup_3_sabores_-_sache.png?v=1733776537'],
  ['bready-base', 'BREADY — BASE NUTRITIVA', 'Bready', 'Alimentos Funcionais', 'https://www.meubready.com.br/cdn/shop/files/image-1.png?v=1733767823'],
  ['bready-foto', 'BREADY — LINHA COMPLETA', 'Bready', 'Alimentos Funcionais', 'https://www.meubready.com.br/cdn/shop/files/Copia_de_JOA00117_1.webp?v=1749589462'],
];

const products = [];

const catFor = (text) => {
  const t = text.toLowerCase();
  if (/kids|malttinha|infantil/.test(t)) return 'Infantil';
  if (/oleo|essencia|aroma|difusor|umidificador|inalador/.test(t)) return 'Aromaterapia';
  if (/colageno|hialuronico|cabelo|pele|unha|beleza|skin/.test(t)) return 'Beleza';
  if (/creatina|whey|proteina|bcaa|glutamina|barra|fitness|treino|musc/.test(t)) return 'Fitness';
  if (/cha|propolis|mel/.test(t)) return 'Chás & Naturais';
  if (/vitamina|mineral|zinco|magnesio|selenio|ferro|complexo b|omega/.test(t)) return 'Vitaminas & Minerais';
  return 'Suplementos';
};

const brandFor = (page) => {
  if (page <= 56) return 'Bioativos / Malttinha';
  if (page <= 150) return 'Melfort';
  return 'Qvita Nutrition';
};

const cleanName = (text) => {
  const cut = text.split(/\s+EAN/i)[0];
  let n = cut.replace(/\s+/g, ' ').trim();
  if (n.length > 70) n = n.slice(0, 70).replace(/\s+\S*$/, '');
  if (!n) n = text.slice(0, 50);
  return n;
};

for (const p of ip) {
  products.push({
    id: p.id, name: p.name, brand: p.brand, category: p.category, type: 'kit',
    image: p.img, base_price_cents: p.base, badge: p.badge || '', featured: 1, sort: 1,
    description: `${p.name} — distribuição oficial Droppfy. Envio imediato com frete grátis para todo o Brasil.`,
  });
}

for (const [id, name, brand, category, img] of trustfuel) {
  products.push({ id, name, brand, category, type: 'catalog', image: img, base_price_cents: null, badge: 'Linha Premium', featured: 0, sort: 20, description: `${name} (${brand}). Disponibilidade e tabela de atacado mediante cadastro de revenda.` });
}

for (const p of naturoyal) {
  products.push({ id: `naturoyal-${p.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').slice(0, 60)}`, name: p.name, brand: 'Natura Royal', category: p.name.match(/essencia/i) ? 'Aromaterapia' : p.name.match(/difusor|inalador|umidificador|expositor/i) ? 'Aromaterapia' : 'Beleza', type: 'catalog', image: p.img.replace(/-300x300/, ''), base_price_cents: null, badge: 'Catálogo Oficial', featured: 0, sort: 21, description: `${p.name} — Natura Royal. Tabela de atacado mediante cadastro de revenda.` });
}

for (const page of catalogo.pages) {
  if (page.text.length < 80) continue;
  const brand = brandFor(page.page);
  products.push({
    id: `catalogo-p${page.page}`,
    name: cleanName(page.text),
    brand,
    category: catFor(page.text),
    type: 'catalog',
    image: `/assets/img/catalog/p${String(page.page).padStart(3, '0')}.jpg`,
    base_price_cents: null,
    badge: 'Catálogo Oficial',
    featured: 0,
    sort: 30 + page.page,
    description: page.text.slice(0, 500),
  });
}

const skipTitles = new Set();
for (const p of parceiros) {
  if (p.error || !p.title) continue;
  const key = (p.title || '').slice(0, 40);
  skipTitles.add(key);
  products.push({
    id: `parceiro-${p.stub.split('/pages/')[1]?.replace(/[^\w-]/g, '').slice(0, 60) || Math.random().toString(36).slice(2, 10)}`,
    name: p.title.slice(0, 120),
    brand: p.title.split('–')[0].trim().slice(0, 40) || 'Parceiro',
    category: 'Parceiros',
    type: 'partner',
    image: p.image || '',
    base_price_cents: null,
    partner_url: p.stub,
    badge: p.lpPrice ? `A partir de ${p.lpPrice}` : 'Oferta Parceira',
    featured: 0,
    sort: 50,
    description: p.description || 'Oferta exclusiva de parceiro. Clique para ver a oferta completa na página oficial.',
  });
}

fs.writeFileSync('data/produtos.json', JSON.stringify({ products }, null, 2));
console.log(`seed gerado: ${products.length} produtos (kits: ${products.filter((p) => p.type === 'kit').length}, catalogo: ${products.filter((p) => p.type === 'catalog').length}, parceiros: ${products.filter((p) => p.type === 'partner').length})`);
