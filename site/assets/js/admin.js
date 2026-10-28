const TOKEN_KEY = 'droppfy_token';

const $ = (sel) => document.querySelector(sel);
const fmtBRL = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) { showLogin(); throw new Error(data.error || 'Sessão expirada'); }
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data;
}

function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'err' : type === 'warn' ? 'warn' : ''}`;
  el.textContent = msg;
  $('#toastWrap').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 350); }, 3200);
}

const STATUS_LABEL = { pending: 'Pendente', paid: 'Pago', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' };
const statusPill = (s) => `<span class="status-pill st-${esc(s)}">${STATUS_LABEL[s] || esc(s)}</span>`;

/* ---------------- auth ---------------- */
let ME = null;

function showLogin() {
  $('#appView').hidden = true;
  $('#loginView').hidden = false;
  $('#loginError').textContent = '';
}

async function showApp() {
  $('#loginView').hidden = true;
  $('#appView').hidden = false;
  $('#adminChip').textContent = `Admin • ${ME.name}`;
  await Promise.all([loadStats(), loadOrders(''), loadUsers(), loadProducts(), loadPromos(), loadLeads()]);
  go('dashboard');
}

$('#adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: $('#loginUser').value.trim(), password: $('#loginPass').value }),
    });
    if (data.user?.role !== 'admin') throw new Error('Esta conta não tem acesso de administrador');
    localStorage.setItem(TOKEN_KEY, data.token);
    ME = data.user;
    await showApp();
  } catch (err) {
    $('#loginError').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  ME = null;
  showLogin();
});

/* ---------------- navigation ---------------- */
const TITLES = { dashboard: 'Visão Geral', orders: 'Pedidos', users: 'Usuários', products: 'Produtos', promotions: 'Promoções', leads: 'Cadastros (Leads)' };
function go(view) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');
  $('#viewTitle').textContent = TITLES[view] || view;
}
document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => go(b.dataset.goto)));

/* ---------------- dashboard ---------------- */
async function loadStats() {
  try {
    const { stats } = await api('/api/admin/stats');
    $('#stOrders').textContent = stats.orders;
    $('#stToday').textContent = `hoje: ${stats.orders_today}`;
    $('#stRevenue').textContent = fmtBRL(stats.revenue_cents);
    $('#stPending').textContent = stats.pending;
    $('#stUsers').textContent = stats.users;
    $('#stLeads').textContent = stats.leads;
    $('#stPaid').textContent = stats.paid;
    const badge = $('#badgeOrders');
    if (stats.pending > 0) { badge.textContent = stats.pending; badge.classList.add('show'); } else badge.classList.remove('show');
    const { orders } = await api('/api/admin/orders');
    $('#dashOrdersWrap').innerHTML = ordersTable(orders.slice(0, 5));
    bindOrderRows('#dashOrdersWrap');
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------------- orders ---------------- */
function orderItemsHtml(items) {
  return (items || []).map((it) => `<span class="sub">${esc(it.name)} ×${it.qty} — ${fmtBRL(it.price_cents)}</span>`).join('');
}

function ordersTable(orders) {
  if (!orders.length) return '<p class="empty">Nenhum pedido encontrado.</p>';
  const rows = orders.map((o) => `
    <tr data-id="${esc(o.id)}">
      <td class="mono">${esc(o.id)}<span class="sub">${fmtDate(o.created_at)}</span></td>
      <td class="name-cell">${esc(o.customer_name)}<span class="sub">${esc(o.customer_whatsapp)}</span></td>
      <td>${orderItemsHtml(o.items)}</td>
      <td><b>${fmtBRL(o.total_cents)}</b></td>
      <td><select class="input input-sm st-select" data-id="${esc(o.id)}">
        ${Object.keys(STATUS_LABEL).map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
      </select></td>
      <td><div class="row-actions">
        <input class="input input-sm track-input" data-id="${esc(o.id)}" placeholder="Código rastreio" value="${esc(o.tracking_code || '')}" style="width:140px">
        <button class="icon-btn save-track" data-id="${esc(o.id)}" title="Salvar rastreio">✓</button>
      </div></td>
      <td><div class="row-actions">
        ${o.status === 'pending' ? `<button class="icon-btn check-pay" data-id="${esc(o.id)}" title="Verificar pagamento">$</button>` : ''}
        <button class="icon-btn view-order" data-id="${esc(o.id)}" title="Ver pedido">👁</button>
      </div></td>
    </tr>`).join('');
  return `<table class="tbl"><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Status</th><th>Rastreio</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function bindOrderRows(scope) {
  const root = typeof scope === 'string' ? document.querySelector(scope) : scope;
  if (!root) return;
  root.querySelectorAll('.st-select').forEach((sel) => sel.addEventListener('change', async () => {
    try {
      await api(`/api/admin/orders/${sel.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
      toast(`Pedido ${sel.dataset.id} → ${STATUS_LABEL[sel.value]}`);
      loadStats();
    } catch (err) { toast(err.message, 'error'); }
  }));
  root.querySelectorAll('.save-track').forEach((btn) => btn.addEventListener('click', async () => {
    const input = root.querySelector(`.track-input[data-id="${btn.dataset.id}"]`);
    if (!input) return;
    try {
      const code = input.value.trim().toUpperCase();
      if (!code) return toast('Informe o código de rastreio', 'warn');
      await api(`/api/admin/orders/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ tracking_code: code }) });
      toast('Rastreio salvo e eventos atualizados');
      loadStats();
    } catch (err) { toast(err.message, 'error'); }
  }));
  root.querySelectorAll('.check-pay').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      const { order } = await api(`/api/orders/${btn.dataset.id}/check`, { method: 'POST' });
      toast(order.status === 'paid' ? 'Pagamento confirmado!' : 'Ainda não identificado como pago', order.status === 'paid' ? 'ok' : 'warn');
      loadStats();
    } catch (err) { toast(err.message, 'error'); }
  }));
  root.querySelectorAll('.view-order').forEach((btn) => btn.addEventListener('click', () => openOrderModal(btn.dataset.id)));
}

async function openOrderModal(id) {
  try {
    const { order } = await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({}) });
    const events = (order.tracking_events || []).slice().reverse().map((ev) =>
      `<div class="promo-link-card"><b>${esc(ev.status || '')}</b><span class="sub" style="flex:1">${esc(ev.descricao || '')}</span><span class="mono">${esc(ev.data || '')}</span></div>`).join('') || '<p class="empty">Sem eventos de rastreio.</p>';
    openModal(`
      <button class="modal-x" onclick="closeModal()">✕</button>
      <h3>Pedido ${esc(order.id)}</h3>
      <div class="field"><label>Cliente</label><div>${esc(order.customer_name)} — ${esc(order.customer_whatsapp)}</div></div>
      <div class="field"><label>Endereço (CEP)</label><div>${esc(order.cep || '—')} • ${esc(order.address || '')}</div></div>
      <div class="field"><label>Itens</label><div>${orderItemsHtml(order.items)}</div></div>
      <div class="field"><label>Total</label><div><b>${fmtBRL(order.total_cents)}</b> ${statusPill(order.status)}</div></div>
      <div class="field"><label>Rastreio</label><div>${order.tracking_code ? `<span class="track-code">${esc(order.tracking_code)}</span>` : '—'}</div></div>
      <div class="field"><label>Eventos</label><div>${events}</div></div>
    `);
  } catch (err) { toast(err.message, 'error'); }
}

$('#orderFilter').addEventListener('change', async () => {
  await loadOrders($('#orderFilter').value);
});
async function loadOrders(status) {
  try {
    const { orders } = await api(`/api/admin/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`);
    $('#ordersWrap').innerHTML = ordersTable(orders);
    bindOrderRows('#ordersWrap');
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------------- users ---------------- */
async function loadUsers() {
  try {
    const { users } = await api('/api/admin/users');
    if (!users.length) { $('#usersWrap').innerHTML = '<p class="empty">Nenhum usuário cadastrado.</p>'; return; }
    $('#usersWrap').innerHTML = `<table class="tbl"><thead><tr><th>Usuário</th><th>WhatsApp</th><th>E-mail</th><th>Interesse</th><th>Cadastro</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      ${users.map((u) => `<tr>
        <td class="name-cell">${esc(u.name)}${u.role === 'admin' ? ' <span class="status-pill st-delivered">ADMIN</span>' : ''}</td>
        <td class="mono">${esc(u.whatsapp)}</td>
        <td>${esc(u.email || '—')}</td>
        <td>${esc(u.interest || '—')}</td>
        <td class="sub">${fmtDate(u.created_at)}</td>
        <td>${u.active ? '<span class="status-pill st-paid">Ativo</span>' : '<span class="status-pill st-cancelled">Bloqueado</span>'}</td>
        <td>${u.role === 'admin' ? '—' : `<button class="btn btn-ghost btn-sm toggle-user" data-id="${esc(u.id)}" data-active="${u.active ? 1 : 0}">${u.active ? 'Bloquear' : 'Ativar'}</button>`}</td>
      </tr>`).join('')}
    </tbody></table>`;
    $('#usersWrap').querySelectorAll('.toggle-user').forEach((b) => b.addEventListener('click', async () => {
      try {
        await api(`/api/admin/users/${b.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ active: b.dataset.active === '0' }) });
        toast('Usuário atualizado');
        loadUsers();
      } catch (err) { toast(err.message, 'error'); }
    }));
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------------- products ---------------- */
const TYPE_LABEL = { kit: 'Kit (venda online)', catalog: 'Catálogo (consulta)', partner: 'Parceiro' };
let allProducts = [];

async function loadProducts() {
  try {
    const { products } = await api('/api/admin/products');
    allProducts = products || [];
    if (!allProducts.length) { $('#productsWrap').innerHTML = '<p class="empty">Nenhum produto.</p>'; return; }
    $('#productsWrap').innerHTML = `<table class="tbl"><thead><tr><th>Produto</th><th>Tipo</th><th>Preço base</th><th>Parceiro</th><th>Destaque</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      ${allProducts.map((p) => `<tr>
        <td><img class="thumb" src="${esc(p.image || '/assets/img/logo.svg')}" alt="" onerror="this.style.visibility='hidden'"><span class="name-cell" style="margin-left:10px">${esc(p.name)}</span><span class="sub">${esc(p.brand || '')} • ${esc(p.category || '')}</span></td>
        <td>${TYPE_LABEL[p.type] || esc(p.type)}</td>
        <td>${p.base_price_cents ? fmtBRL(p.base_price_cents) : '—'}</td>
        <td>${p.partner_url ? `<span class="sub">${esc(p.badge || '')}</span>` : '—'}</td>
        <td>${p.featured ? '★' : '—'}</td>
        <td>${p.active ? '<span class="status-pill st-paid">Ativo</span>' : '<span class="status-pill st-cancelled">Oculto</span>'}</td>
        <td><div class="row-actions">
          <button class="icon-btn edit-product" data-id="${esc(p.id)}" title="Editar">✎</button>
          <button class="icon-btn danger del-product" data-id="${esc(p.id)}" title="Excluir">✕</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table>`;
    $('#productsWrap').querySelectorAll('.edit-product').forEach((b) => b.addEventListener('click', () => openProductModal(b.dataset.id)));
    $('#productsWrap').querySelectorAll('.del-product').forEach((b) => b.addEventListener('click', async () => {
      const p = allProducts.find((x) => x.id === b.dataset.id);
      if (!confirm(`Excluir "${p?.name}"?`)) return;
      try {
        await api(`/api/admin/products/${b.dataset.id}`, { method: 'DELETE' });
        toast('Produto excluído');
        loadProducts();
      } catch (err) { toast(err.message, 'error'); }
    }));
  } catch (err) { toast(err.message, 'error'); }
}

$('#newProductBtn').addEventListener('click', () => openProductModal(null));

function openProductModal(id) {
  const p = id ? allProducts.find((x) => x.id === id) : {};
  const price = p.base_price_cents ? (p.base_price_cents / 100) : '';
  openModal(`
    <button class="modal-x" onclick="closeModal()">✕</button>
    <h3>${id ? 'Editar produto' : 'Novo produto'}</h3>
    <form id="productForm">
      <div class="field"><label>Nome *</label><input class="input" name="name" value="${esc(p.name || '')}" required></div>
      <div class="field"><label>Descrição</label><textarea class="input" name="description" rows="2">${esc(p.description || '')}</textarea></div>
      <div class="field"><label>Marca</label><input class="input" name="brand" value="${esc(p.brand || '')}"></div>
      <div class="field"><label>Categoria</label><input class="input" name="category" value="${esc(p.category || '')}"></div>
      <div class="field"><label>Tipo</label><select class="input" name="type">
        ${Object.keys(TYPE_LABEL).map((t) => `<option value="${t}" ${(p.type || 'kit') === t ? 'selected' : ''}>${TYPE_LABEL[t]}</option>`).join('')}
      </select></div>
      <div class="field"><label>Imagem (URL)</label><input class="input" name="image" value="${esc(p.image || '')}"></div>
      <div class="field"><label>Preço base (R$)</label><input class="input" name="price" type="number" step="0.01" min="0" value="${price}"></div>
      <div class="field"><label>URL do parceiro</label><input class="input" name="partner_url" value="${esc(p.partner_url || '')}"></div>
      <div class="field"><label>Selo/Badge</label><input class="input" name="badge" value="${esc(p.badge || '')}"></div>
      <div class="field"><label>Ordem</label><input class="input" name="sort" type="number" value="${p.sort ?? 0}"></div>
      <div class="field"><label style="display:flex;gap:10px;align-items:center">
        <input type="checkbox" name="featured" ${p.featured ? 'checked' : ''} style="width:auto"> Destaque
        <input type="checkbox" name="active" ${p.active === 0 ? '' : 'checked'} style="width:auto;margin-left:14px"> Ativo
      </label></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-gold">SALVAR</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `);
  $('#productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      name: f.get('name'), description: f.get('description'), brand: f.get('brand'),
      category: f.get('category'), type: f.get('type'), image: f.get('image'),
      base_price_cents: f.get('price') === '' ? null : Math.round(parseFloat(f.get('price')) * 100),
      partner_url: f.get('partner_url'), badge: f.get('badge'),
      featured: !!f.get('featured'), active: !!f.get('active'), sort: Number(f.get('sort') || 0),
    };
    try {
      if (id) await api(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
      toast('Produto salvo');
      closeModal();
      loadProducts();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ---------------- promotions ---------------- */
$('#promoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await api('/api/admin/promotions', {
      method: 'POST',
      body: JSON.stringify({ title: $('#promoTitle').value.trim(), message: $('#promoMsg').value.trim() }),
    });
    $('#promoResult').textContent = `✓ ${res.total} link(s) gerado(s)`;
    $('#promoLinks').innerHTML = res.links.map((l) =>
      `<div class="promo-link-card"><span class="pl-name">${esc(l.name)}</span><a href="${esc(l.link)}" target="_blank" rel="noopener">${esc(l.whatsapp)} ↗</a></div>`).join('');
    loadPromos();
  } catch (err) { toast(err.message, 'error'); }
});

async function loadPromos() {
  try {
    const { promotions } = await api('/api/admin/promotions');
    if (!promotions.length) { $('#promosWrap').innerHTML = '<p class="empty">Nenhuma promoção enviada ainda.</p>'; return; }
    $('#promosWrap').innerHTML = `<table class="tbl"><thead><tr><th>Título</th><th>Mensagem</th><th>Data</th></tr></thead><tbody>
      ${promotions.map((pr) => `<tr><td class="name-cell">${esc(pr.title)}</td><td class="sub">${esc(pr.message)}</td><td class="sub">${fmtDate(pr.created_at)}</td></tr>`).join('')}
    </tbody></table>`;
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------------- leads ---------------- */
async function loadLeads() {
  try {
    const { leads } = await api('/api/admin/leads');
    if (!leads.length) { $('#leadsWrap').innerHTML = '<p class="empty">Nenhum cadastro de interesse.</p>'; return; }
    $('#leadsWrap').innerHTML = `<table class="tbl"><thead><tr><th>Nome</th><th>WhatsApp</th><th>Produto</th><th>Interesse</th><th>Data</th><th>Ação</th></tr></thead><tbody>
      ${leads.map((l) => `<tr>
        <td class="name-cell">${esc(l.name)}</td>
        <td class="mono">${esc(l.whatsapp)}</td>
        <td>${esc(l.product || '—')}</td>
        <td>${esc(l.interest || '—')}</td>
        <td class="sub">${fmtDate(l.created_at)}</td>
        <td><a class="btn btn-emerald btn-sm" href="https://wa.me/55${esc(l.whatsapp)}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp ↗</a></td>
      </tr>`).join('')}
    </tbody></table>`;
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------------- modal helpers ---------------- */
function openModal(html) {
  $('#modalCard').innerHTML = html;
  $('#modal').hidden = false;
}
function closeModal() {
  $('#modal').hidden = true;
  $('#modalCard').innerHTML = '';
}
$('#modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
window.closeModal = closeModal;

/* ---------------- boot ---------------- */
(async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return showLogin();
  try {
    const { user } = await api('/api/auth/me');
    if (user.role !== 'admin') throw new Error('Acesso negado');
    ME = user;
    await showApp();
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
  }
})();
