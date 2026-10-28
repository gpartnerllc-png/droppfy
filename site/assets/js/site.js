/* ================= DROPPFY SITE APP ================= */
const API = location.hostname.endsWith('workers.dev') ? '' : 'https://business-cdd-bsb-droppfy.contatodroppfy.workers.dev';
const TOKEN_KEY = 'droppfy_token';
const USER_KEY = 'droppfy_user';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmt = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const token = () => localStorage.getItem(TOKEN_KEY);
const user = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } };

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(`${API}/api${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

/* ---------- toasts ---------- */
function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.className = `toast${isErr ? ' err' : ''}`;
  el.textContent = msg;
  $('#toastWrap').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 4200);
}

/* ---------- canvas fx ---------- */
function initFx() {
  const c = $('#fx-canvas');
  const ctx = c.getContext('2d');
  let w, h, parts = [];
  const resize = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
  resize();
  addEventListener('resize', resize);
  const N = Math.min(90, Math.floor(w / 16));
  parts = Array.from({ length: N }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: Math.random() * 1.8 + 0.4,
    vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
    gold: Math.random() < 0.35,
  }));
  (function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.gold ? 'rgba(232,197,106,0.5)' : 'rgba(18,185,129,0.4)';
      ctx.shadowColor = p.gold ? 'rgba(232,197,106,0.8)' : 'rgba(18,185,129,0.8)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(tick);
  })();
}

/* ---------- reveal + counters ---------- */
function initReveal() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        e.target.querySelectorAll('[data-count]').forEach((el) => {
          const target = Number(el.dataset.count);
          const dur = 1600; const t0 = performance.now();
          (function step(t) {
            const k = Math.min(1, (t - t0) / dur);
            el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
            if (k < 1) requestAnimationFrame(step);
          })(performance.now());
        });
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el) => io.observe(el));
}

/* ---------- tilt ---------- */
function initTilt() {
  $$('[data-tilt]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
  const stage = $('#heroStage');
  if (stage) {
    stage.addEventListener('mousemove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const core = stage.querySelector('.hero-core');
      if (core) core.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 16}deg)`;
      stage.querySelectorAll('.orbit').forEach((o, i) => {
        o.style.translate = `${x * (i + 1) * -26}px ${y * (i + 1) * -18}px`;
      });
    });
    stage.addEventListener('mouseleave', () => {
      const core = stage.querySelector('.hero-core');
      if (core) core.style.transform = '';
      stage.querySelectorAll('.orbit').forEach((o) => { o.style.translate = ''; });
    });
  }
}

/* ---------- product card ---------- */
function cardHTML(p, showCta = true) {
  const img = p.image || '/assets/img/logo.svg';
  const price = p.type === 'kit' && p.base_price_cents ? fmt(p.unit_price_cents) : null;
  const badge = p.badge ? `<div class="p-card-badge ${p.badge.includes('12') ? 'emerald' : ''}">${esc(p.badge)}</div>` : '';
  const cta = p.type === 'partner'
    ? '<div class="partner-out">Ver oferta oficial ↗</div>'
    : p.type === 'kit' && price
      ? '<div class="p-card-cta">Unidade · Kit 8 · Kit 12+</div>'
      : '<div class="p-card-cta">Sob consulta — Revenda</div>';
  return `
    <article class="p-card" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(p.name)}">
      <div class="p-card-img">
        ${badge}
        <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='/assets/img/logo.svg'">
      </div>
      <div class="p-card-body">
        <div class="p-card-brand">${esc(p.brand || p.category || '')}</div>
        <h3 class="p-card-name">${esc(p.name)}</h3>
        <div class="p-card-price">${price ? `<b>${price}</b><small>unidade</small>` : '<small>Tabela de atacado disponível</small>'}</div>
        ${showCta ? cta : ''}
      </div>
    </article>`;
}

function bindCards(root) {
  root.querySelectorAll('.p-card').forEach((el) => {
    el.addEventListener('click', () => openProduct(el.dataset.id));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') openProduct(el.dataset.id); });
  });
}

/* ---------- load + render ---------- */
let allProducts = [];

async function loadProducts() {
  try {
    const data = await api('/products');
    allProducts = data.products || [];
    renderKits();
    renderCatalog();
    renderPartners();
  } catch (e) {
    toast('Falha ao carregar produtos: ' + e.message, true);
  }
}

function renderKits() {
  const kits = allProducts.filter((p) => p.type === 'kit' && p.active !== 0);
  const wrap = $('#kitsWrapper');
  wrap.innerHTML = kits.map((p) => `<div class="swiper-slide">${cardHTML(p)}</div>`).join('');
  bindCards(wrap);
  new Swiper('.kits-swiper', {
    slidesPerView: 1, spaceBetween: 18, loop: true, centeredSlides: true, effect: 'coverflow',
    coverflowEffect: { rotate: 4, stretch: 0, depth: 140, modifier: 1.1, slideShadows: false },
    autoplay: { delay: 3800, disableOnInteraction: false },
    pagination: { el: '.kits-swiper .swiper-pagination', clickable: true },
    navigation: { nextEl: '.kits-swiper .swiper-button-next', prevEl: '.kits-swiper .swiper-button-prev' },
    breakpoints: { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } },
  });
}

function renderCatalog() {
  const cats = {};
  for (const p of allProducts) {
    if (p.type === 'partner' || p.active === 0) continue;
    (cats[p.category || 'Geral'] = cats[p.category || 'Geral'] || []).push(p);
  }
  const chips = $('#filterChips');
  const names = Object.keys(cats);
  chips.innerHTML = ['<button class="chip active" data-cat="*">Todos</button>']
    .concat(names.map((n) => `<button class="chip" data-cat="${esc(n)}">${esc(n)}</button>`)).join('');
  chips.querySelectorAll('.chip').forEach((c) => {
    c.addEventListener('click', () => {
      chips.querySelectorAll('.chip').forEach((x) => x.classList.remove('active'));
      c.classList.add('active');
      applyCatalogFilter(c.dataset.cat, $('#catalogSearch').value);
    });
  });
  $('#catalogSearch').addEventListener('input', (e) => {
    applyCatalogFilter(chips.querySelector('.chip.active')?.dataset.cat || '*', e.target.value);
  });
  applyCatalogFilter('*', '');
}

function applyCatalogFilter(cat, q) {
  const ql = (q || '').trim().toLowerCase();
  const root = $('#catalogSections');
  const cats = {};
  for (const p of allProducts) {
    if (p.type === 'partner' || p.active === 0) continue;
    if (cat !== '*' && (p.category || 'Geral') !== cat) continue;
    if (ql && !`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(ql)) continue;
    (cats[p.category || 'Geral'] = cats[p.category || 'Geral'] || []).push(p);
  }
  const names = Object.keys(cats);
  root.innerHTML = names.length
    ? names.map((n) => `
      <div class="cat-section">
        <div class="cat-head"><h3>${esc(n)}</h3><span>${cats[n].length} ${cats[n].length === 1 ? 'item' : 'itens'}</span></div>
        <div class="swiper cat-carousel cat-${esc(n.replace(/\W/g, ''))}">
          <div class="swiper-wrapper">${cats[n].map((p) => `<div class="swiper-slide">${cardHTML(p)}</div>`).join('')}</div>
          <div class="swiper-pagination"></div>
        </div>
      </div>`).join('')
    : '<div class="empty-state">Nenhum produto encontrado. Ajuste a busca ou fale conosco no WhatsApp.</div>';
  names.forEach((n) => {
    new Swiper(`.cat-${n.replace(/\W/g, '')}`, {
      slidesPerView: 1.25, spaceBetween: 16, pagination: { clickable: true },
      breakpoints: { 640: { slidesPerView: 2.4 }, 1024: { slidesPerView: 3.6 }, 1400: { slidesPerView: 4.6 } },
    });
  });
  bindCards(root);
}

function renderPartners() {
  const partners = allProducts.filter((p) => p.type === 'partner' && p.active !== 0);
  const wrap = $('#partnersWrapper');
  wrap.innerHTML = partners.map((p) => `<div class="swiper-slide">${cardHTML(p)}</div>`).join('');
  bindCards(wrap);
  new Swiper('.partners-swiper', {
    slidesPerView: 1.3, spaceBetween: 16,
    pagination: { el: '.partners-swiper .swiper-pagination', clickable: true },
    navigation: { nextEl: '.partners-swiper .swiper-button-next', prevEl: '.partners-swiper .swiper-button-prev' },
    breakpoints: { 640: { slidesPerView: 2.4 }, 1024: { slidesPerView: 3.6 }, 1400: { slidesPerView: 4.6 } },
  });
}

/* ---------- search ---------- */
function initSearch() {
  const input = $('#searchInput');
  const results = $('#searchResults');
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => doSearch(input.value), 220);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') results.hidden = true;
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchWrap')) results.hidden = true;
  });
  function doSearch(q) {
    const ql = (q || '').trim().toLowerCase();
    if (!ql) { results.hidden = true; return; }
    const hits = allProducts.filter((p) => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(ql)).slice(0, 8);
    results.innerHTML = hits.length
      ? hits.map((p) => `
        <div class="search-hit" data-id="${esc(p.id)}">
          <img src="${esc(p.image || '/assets/img/logo.svg')}" alt="" onerror="this.src='/assets/img/logo.svg'">
          <div><b>${esc(p.name.slice(0, 60))}</b><span>${esc(p.brand || p.category || '')}${p.type === 'kit' && p.base_price_cents ? ' · ' + fmt(p.unit_price_cents) : ''}</span></div>
        </div>`).join('')
      : '<div class="search-empty">Nenhum produto encontrado</div>';
    results.hidden = false;
    results.querySelectorAll('.search-hit').forEach((h) => {
      h.addEventListener('click', () => { results.hidden = true; input.value = ''; openProduct(h.dataset.id); });
    });
  }
}

/* ---------- product modal ---------- */
let currentProduct = null;
let currentOption = 'unit';
let currentQty = 1;

function openProduct(id) {
  const p = allProducts.find((x) => x.id === id);
  if (!p) return;
  currentProduct = p;
  currentOption = 'unit';
  currentQty = 1;
  $('#pmImg').src = p.image || '/assets/img/logo.svg';
  $('#pmImg').onerror = () => { $('#pmImg').src = '/assets/img/logo.svg'; };
  $('#pmBrand').textContent = `${p.brand || ''}${p.badge ? ' · ' + p.badge : ''}`;
  $('#pmName').textContent = p.name;
  $('#pmDesc').textContent = p.description || '';
  const optBox = $('#pmOptions');
  if (p.type === 'kit' && p.base_price_cents) {
    optBox.innerHTML = `
      <div class="opt active" data-opt="unit"><b>1 Unidade</b><span>${fmt(p.unit_price_cents)}</span><small>Varejo</small></div>
      <div class="opt" data-opt="kit8"><b>Kit 8 Peças</b><span>${fmt(p.kit8_price_cents)}</span><small>Revenda</small></div>
      <div class="opt" data-opt="kit12"><b>Kit 12+ Peças</b><span>${fmt(p.kit12_price_cents)}</span><small>Atacado</small></div>`;
    optBox.querySelectorAll('.opt').forEach((o) => o.addEventListener('click', () => {
      optBox.querySelectorAll('.opt').forEach((x) => x.classList.remove('active'));
      o.classList.add('active');
      currentOption = o.dataset.opt;
      updatePmPrice();
    }));
    $('#pmQtyRow').hidden = false;
    $('#pmBuy').hidden = false;
    $('#pmPartner').hidden = true;
    $('#pmConsult').hidden = true;
  } else if (p.type === 'partner') {
    optBox.innerHTML = `<p style="color:var(--muted);font-size:13px">${esc(p.badge || 'Oferta parceira')}</p>`;
    $('#pmQtyRow').hidden = true;
    $('#pmBuy').hidden = true;
    $('#pmPartner').hidden = false;
    $('#pmPartner').href = p.partner_url || '#';
    $('#pmConsult').hidden = true;
  } else {
    optBox.innerHTML = '<p style="color:var(--muted);font-size:13px">Produto do catálogo oficial de atacado. Preços e disponibilidade liberados para revendedores cadastrados.</p>';
    $('#pmQtyRow').hidden = true;
    $('#pmBuy').hidden = true;
    $('#pmPartner').hidden = true;
    $('#pmConsult').hidden = false;
  }
  $('#qtyInput').value = 1;
  updatePmPrice();
  $('#productModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function updatePmPrice() {
  const p = currentProduct;
  if (!p || p.type !== 'kit') return;
  const price = p[`${currentOption === 'unit' ? 'unit' : currentOption === 'kit8' ? 'kit8' : 'kit12'}_price_cents`];
  const total = price * currentQty;
  const unitLabel = currentOption === 'unit' ? '1 unidade' : currentOption === 'kit8' ? '8 peças' : '12 peças';
  $('#pmPrice').textContent = fmt(total);
  const free = $('#pmFree');
  if (free) free.textContent = `🚚 Frete grátis · ${unitLabel}${currentQty > 1 ? ` × ${currentQty}` : ''} · Correios`;
}

function initProductModal() {
  $('#qtyMinus').addEventListener('click', () => { currentQty = Math.max(1, currentQty - 1); $('#qtyInput').value = currentQty; updatePmPrice(); });
  $('#qtyPlus').addEventListener('click', () => { currentQty = Math.min(999, currentQty + 1); $('#qtyInput').value = currentQty; updatePmPrice(); });
  $('#qtyInput').addEventListener('input', () => { currentQty = Math.max(1, Math.min(999, Number($('#qtyInput').value) || 1)); updatePmPrice(); });
  $('#pmConsult').addEventListener('click', () => { closeModal('productModal'); location.hash = '#revenda'; $('#revenda').scrollIntoView({ behavior: 'smooth' }); });
  $('#pmBuy').addEventListener('click', () => {
    if (!token()) { closeModal('productModal'); openAuth(() => reopenProduct()); return; }
    openCheckout();
  });
  $('#pmPartner').addEventListener('click', () => closeModal('productModal'));
}
function reopenProduct() { if (currentProduct) openProduct(currentProduct.id); }

/* ---------- checkout ---------- */
function openCheckout() {
  const p = currentProduct;
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-box" style="max-width:480px">
      <button class="modal-x">✕</button>
      <h3 style="font-family:var(--font-display);font-size:21px;margin-bottom:6px">Finalizar pedido</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:20px">${esc(p.name)} — ${currentOption === 'unit' ? '1 unidade' : currentOption === 'kit8' ? 'Kit 8 peças' : 'Kit 12+ peças'} × ${currentQty}</p>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px">
        <span style="color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase">Total</span>
        <b style="font-family:var(--font-display);font-size:26px;background:var(--grad-text);-webkit-background-clip:text;background-clip:text;color:transparent">${fmt(p[`${currentOption === 'unit' ? 'unit' : currentOption === 'kit8' ? 'kit8' : 'kit12'}_price_cents`] * currentQty)}</b>
      </div>
      <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:14px">
        CEP de entrega (frete grátis)
        <input id="ckCep" style="width:100%;margin-top:8px;background:var(--bg-3);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:14px 16px;font-size:15px" placeholder="70000-000" maxlength="9">
      </label>
      <div class="pay-methods" style="display:flex;gap:8px;margin-bottom:18px">
        <span class="pay-pill">PIX</span><span class="pay-pill">CARTÃO</span><span class="pay-pill">BOLETO</span>
      </div>
      <button class="btn btn-gold btn-lg btn-block" id="ckGo">PAGAR COM SEGURANÇA 🔒</button>
      <p id="ckErr" style="color:#f87171;font-size:12.5px;text-align:center;margin-top:12px"></p>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-backdrop').addEventListener('click', close);
  overlay.querySelector('.modal-x').addEventListener('click', close);
  overlay.querySelector('#ckGo').addEventListener('click', async () => {
    const cep = overlay.querySelector('#ckCep').value.replace(/\D/g, '');
    if (cep.length !== 8) { overlay.querySelector('#ckErr').textContent = 'Informe um CEP válido de 8 dígitos.'; return; }
    overlay.querySelector('#ckGo').disabled = true;
    overlay.querySelector('#ckGo').textContent = 'GERANDO PAGAMENTO SEGURO...';
    try {
      const data = await api('/checkout', {
        method: 'POST',
        body: JSON.stringify({ items: [{ id: p.id, qty: currentQty, option: currentOption }], cep }),
      });
      toast('Pedido criado! Redirecionando para o pagamento seguro...');
      setTimeout(() => { location.href = data.checkoutUrl; }, 700);
    } catch (e) {
      overlay.querySelector('#ckErr').textContent = e.message;
      overlay.querySelector('#ckGo').disabled = false;
      overlay.querySelector('#ckGo').textContent = 'PAGAR COM SEGURANÇA 🔒';
    }
  });
}

/* ---------- auth ---------- */
function openAuth(afterLogin) {
  $('#authModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#authModal').dataset.after = afterLogin ? '1' : '';
  switchAuthTab('login');
}
function switchAuthTab(tab) {
  $$('.auth-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  $('#loginForm').hidden = tab !== 'login';
  $('#registerForm').hidden = tab !== 'register';
}
function initAuth() {
  $$('.auth-tab').forEach((t) => t.addEventListener('click', () => switchAuthTab(t.dataset.tab)));
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginErr').textContent = '';
    const f = new FormData(e.target);
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ login: f.get('login'), password: f.get('password') }) });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      updateAccountUI();
      closeModal('authModal');
      toast(`Bem-vindo(a), ${data.user.name.split(' ')[0]}!`);
      if ($('#authModal').dataset.after === '1') { $('#authModal').dataset.after = ''; reopenProduct(); }
    } catch (err) { $('#loginErr').textContent = err.message; }
  });
  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#registerErr').textContent = '';
    const f = new FormData(e.target);
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: f.get('name'), whatsapp: f.get('whatsapp'), email: f.get('email'), password: f.get('password'), interest: f.get('interest') }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      updateAccountUI();
      closeModal('authModal');
      toast('Conta criada com sucesso! Bem-vindo(a) à DROPPFY.');
      if ($('#authModal').dataset.after === '1') { $('#authModal').dataset.after = ''; reopenProduct(); }
    } catch (err) { $('#registerErr').textContent = err.message; }
  });
}

/* ---------- account drawer ---------- */
async function openAccount() {
  const drawer = $('#cartDrawer');
  const body = $('#drawerBody');
  $('#drawerTitle').textContent = 'Minha Conta';
  drawer.hidden = false;
  document.body.style.overflow = 'hidden';
  body.innerHTML = '<div class="empty-state">Carregando...</div>';
  if (!token()) {
    body.innerHTML = `
      <div class="empty-state">Entre ou crie sua conta para acompanhar pedidos, rastreios e promoções exclusivas.</div>
      <button class="btn btn-gold btn-lg btn-block" id="drawerLogin">ENTRAR / CRIAR CONTA</button>`;
    $('#drawerLogin').addEventListener('click', () => { drawer.hidden = true; document.body.style.overflow = ''; openAuth(); });
    return;
  }
  try {
    const u = await api('/auth/me');
    const orders = (await api('/orders')).orders || [];
    body.innerHTML = `
      <div class="account-chip">
        <div class="avatar">${esc(u.user.name.slice(0, 1).toUpperCase())}</div>
        <div><b>${esc(u.user.name)}</b><small>${esc(u.user.whatsapp)} · ${esc(u.user.interest || 'Cliente')}</small></div>
      </div>
      <h4 style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:20px 0 14px">Meus pedidos</h4>
      ${orders.length ? orders.map((o) => `
        <div class="order-card">
          <div class="row"><b>${esc(o.id)}</b><span class="order-status st-${esc(o.status)}">${esc(o.status)}</span></div>
          <div class="row muted"><span>${new Date(o.created_at).toLocaleDateString('pt-BR')}</span><span>${fmt(o.total_cents)}</span></div>
          ${o.items.map((i) => `<div class="order-item"><span>${esc(i.name.slice(0, 44))} ×${i.qty}</span><b>${fmt(i.price_cents)}</b></div>`).join('')}
          ${o.status === 'pending' && o.checkout_url ? `<a class="btn btn-gold btn-sm btn-block" style="margin-top:12px" href="${esc(o.checkout_url)}" target="_blank" rel="noopener">PAGAR AGORA</a>` : ''}
          ${o.status === 'pending' ? `<button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px" data-check="${esc(o.id)}">VERIFICAR PAGAMENTO</button>` : ''}
          ${o.tracking_code ? `<div class="row muted" style="margin-top:10px"><span>Rastreio: <b style="color:var(--gold)">${esc(o.tracking_code)}</b></span><a href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener" style="color:var(--emerald);font-size:11px">Abrir ↗</a></div>` : ''}
          ${o.tracking_events?.length ? o.tracking_events.slice(0, 3).map((ev) => `<div class="track-event"><div class="dot"></div><div><p>${esc(ev.descricao)}</p><small>${esc(ev.data)} — ${esc(ev.local)}</small></div></div>`).join('') : ''}
        </div>`).join('')
      : '<div class="empty-state">Você ainda não tem pedidos. Explore os kits!</div>'}
      <button class="btn btn-ghost btn-lg btn-block" id="btnLogout" style="margin-top:20px">SAIR DA CONTA</button>`;
    body.querySelectorAll('[data-check]').forEach((b) => {
      b.addEventListener('click', async () => {
        b.textContent = 'VERIFICANDO...';
        try {
          const r = await api(`/orders/${b.dataset.check}/check`, { method: 'POST' });
          toast(r.order.status === 'paid' ? 'Pagamento confirmado! 🎉' : 'Pagamento ainda não identificado. Tente novamente em instantes.');
          openAccount();
        } catch (e) { toast(e.message, true); }
      });
    });
    $('#btnLogout').addEventListener('click', () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      updateAccountUI();
      drawer.hidden = true;
      document.body.style.overflow = '';
      toast('Você saiu da conta.');
    });
  } catch (e) {
    body.innerHTML = `<div class="empty-state">Sessão expirada. Entre novamente.</div>`;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

function updateAccountUI() {
  const u = user();
  $('#btnConta').style.borderColor = u ? 'var(--gold)' : '';
  $('#btnConta').style.color = u ? 'var(--gold)' : '';
}

/* ---------- modals helpers ---------- */
function closeModal(id) {
  $(`#${id}`).hidden = true;
  document.body.style.overflow = '';
}
function initModals() {
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.close)));
  $$('[data-close-drawer]').forEach((b) => b.addEventListener('click', () => {
    $('#cartDrawer').hidden = true;
    document.body.style.overflow = '';
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal').forEach((m) => { if (!m.hidden) closeModal(m.id); });
      if (!$('#cartDrawer').hidden) { $('#cartDrawer').hidden = true; document.body.style.overflow = ''; }
    }
  });
}

/* ---------- lead form ---------- */
function initLead() {
  $('#leadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'ENVIANDO...';
    try {
      await api('/lead', {
        method: 'POST',
        body: JSON.stringify({ name: f.get('name'), whatsapp: f.get('whatsapp'), product: f.get('product'), interest: f.get('interest') }),
      });
      toast('Cadastro recebido! Em breve nosso time falará com você no WhatsApp.');
      e.target.reset();
    } catch (err) { toast(err.message, true); }
    btn.disabled = false; btn.textContent = 'QUERO ME CADASTRAR';
  });
}

/* ---------- cep / prazo / rastreio ---------- */
function initTracking() {
  $('#cepForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cep = $('#cepInput').value.replace(/\D/g, '');
    const box = $('#cepResult');
    if (cep.length !== 8) { toast('CEP inválido', true); return; }
    box.hidden = false;
    box.innerHTML = '<p>Consultando Correios...</p>';
    try {
      const [end, prazo] = await Promise.allSettled([api(`/cep/${cep}`), api('/prazo', { method: 'POST', body: JSON.stringify({ cep }) })]);
      let html = '';
      if (end.status === 'fulfilled') {
        const a = end.value.endereco;
        html += `<p><b>${esc(a.logradouro || '')} ${esc(a.bairro || '')}</b><br>${esc(a.cidade || '')}/${esc(a.uf || '')} — ${esc(a.cep || cep)}</p>`;
      }
      if (prazo.status === 'fulfilled' && prazo.value.sedex?.prazo) {
        html += `<p style="margin-top:10px">⏱️ Entrega estimada: <b>${prazo.value.sedex.prazo} dias úteis</b> (SEDEX) · <b>${prazo.value.pac?.prazo ?? '—'} dias úteis</b> (PAC)<br><span style="color:var(--emerald)">🚚 Frete grátis em todos os kits</span></p>`;
      } else {
        html += '<p style="margin-top:10px;color:var(--emerald)">🚚 Frete grátis para todo o Brasil</p>';
      }
      box.innerHTML = html;
    } catch (err) {
      box.innerHTML = '<p style="color:var(--muted)">Não foi possível consultar agora. Frete grátis em todos os kits para todo o Brasil.</p>';
    }
  });

  $('#trackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = $('#trackInput').value.trim().toUpperCase();
    const box = $('#trackResult');
    if (!code) return;
    box.hidden = false;
    box.innerHTML = '<p>Consultando rastreio nos Correios...</p>';
    try {
      const r = await api(`/rastreio/${encodeURIComponent(code)}`);
      box.innerHTML = `<p style="margin-bottom:10px">📦 Objeto <b>${esc(r.rastreio.codigo)}</b></p>` +
        r.rastreio.eventos.map((ev) => `
          <div class="track-event"><div class="dot"></div><div><p>${esc(ev.descricao)}</p><small>${esc(ev.data)} — ${esc(ev.local)}</small></div></div>`).join('');
    } catch (err) {
      box.innerHTML = `<p style="color:var(--muted)">Código não encontrado ou ainda não disponível. Acompanhe também em <a href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener" style="color:var(--gold)">rastreamento.correios.com.br</a>.</p>`;
    }
  });
}

/* ---------- header / nav ---------- */
function initHeader() {
  $('#menuBurger').addEventListener('click', () => $('#nav').classList.toggle('open'));
  $('#nav').querySelectorAll('a').forEach((a) => a.addEventListener('click', () => $('#nav').classList.remove('open')));
  $('#btnConta').addEventListener('click', openAccount);
  $('#btnCart').addEventListener('click', openAccount);
  $('#btnRevendaTop').addEventListener('click', () => $('#revenda').scrollIntoView({ behavior: 'smooth' }));
  addEventListener('scroll', () => {
    $('#header').style.borderBottomColor = scrollY > 20 ? 'var(--line-strong)' : 'var(--line)';
  }, { passive: true });
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initFx();
  initReveal();
  initTilt();
  initHeader();
  initSearch();
  initProductModal();
  initAuth();
  initModals();
  initLead();
  initTracking();
  updateAccountUI();
  loadProducts();
});
