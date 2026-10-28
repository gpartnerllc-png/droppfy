import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { buscarCep, calcularPrazo, rastrear } from './correios';
import { createCheckoutLink, paymentCheck } from './infinitepay';
import { ensureSchema, seedProducts, ensureAdmin, type SeedProduct } from './schema';
import { hashPassword, verifyPassword, signJWT, verifyJWT, sanitizePhone } from './auth';
import seedData from '../../data/produtos.json';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ASSETS: Fetcher;
  JWT_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASS?: string;
  CORREIOS_CWS?: string;
  CORREIOS_CARTAO?: string;
  INFINITEPAY_KEY?: string;
  STORE_HANDLE?: string;
  SITE_URL?: string;
  ORIGIN_CEP?: string;
  ADMIN_WHATSAPP?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

const MARKUP = 1.3;

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));

let initialized = false;
async function init(env: Env) {
  if (initialized) return;
  await ensureSchema(env.DB);
  await seedProducts(env.DB, (seedData as any).products as SeedProduct[]);
  await ensureAdmin(env.DB, env.ADMIN_EMAIL, env.ADMIN_PASS ? await hashPassword(env.ADMIN_PASS) : undefined);
  initialized = true;
}

const secret = (env: Env) => env.JWT_SECRET || env.ADMIN_PASS || 'droppfy-dev-secret';

async function authUser(env: Env, header: string | undefined) {
  if (!header?.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(header.slice(7), secret(env));
  if (!payload?.uid) return null;
  const { results } = await env.DB.prepare('SELECT * FROM users WHERE id = ? AND active = 1').bind(payload.uid as string).run();
  return (results?.[0] as any) || null;
}

async function requireUser(env: Env, header: string | undefined) {
  const user = await authUser(env, header);
  if (!user) return null;
  return user;
}

async function requireAdmin(env: Env, header: string | undefined) {
  const user = await authUser(env, header);
  if (!user || user.role !== 'admin') return null;
  return user;
}

async function telegramNotify(env: Env, text: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
    });
  } catch {}
}

const unitPrice = (base: number, option: string, qty: number): number | null => {
  if (option === 'unit') return Math.round(base * MARKUP);
  if (option === 'kit8') return Math.round(base * 8 * MARKUP);
  if (option === 'kit12') return Math.round(base * 12 * MARKUP);
  return null;
};

const withPrices = (p: any) => ({
  ...p,
  base_price_cents: p.base_price_cents ?? null,
  kit8_price_cents: p.base_price_cents ? Math.round(p.base_price_cents * 8 * MARKUP) : null,
  kit12_price_cents: p.base_price_cents ? Math.round(p.base_price_cents * 12 * MARKUP) : null,
  unit_price_cents: p.base_price_cents ? Math.round(p.base_price_cents * MARKUP) : null,
});

// ---------- health ----------
app.get('/api/health', (c) => c.json({ ok: true, name: 'DROPPFY API', time: new Date().toISOString() }));

// ---------- products ----------
app.get('/api/products', async (c) => {
  const env = c.env;
  await init(env);
  const q = (c.req.query('q') || '').trim();
  const category = c.req.query('category') || '';
  const type = c.req.query('type') || '';
  const sql: string[] = ['active = 1'];
  const params: any[] = [];
  if (q) {
    sql.push('(name LIKE ? OR brand LIKE ? OR category LIKE ? OR description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) { sql.push('category = ?'); params.push(category); }
  if (type) { sql.push('type = ?'); params.push(type); }
  const { results } = await env.DB.prepare(
    `SELECT * FROM products WHERE ${sql.join(' AND ')} ORDER BY sort ASC, featured DESC, name ASC`
  ).bind(...params).run();
  return c.json({ products: (results || []).map(withPrices) });
});

app.get('/api/products/:id', async (c) => {
  await init(c.env);
  const { results } = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND active = 1').bind(c.req.param('id')).run();
  if (!results?.length) return c.json({ error: 'Produto não encontrado' }, 404);
  return c.json({ product: withPrices(results[0]) });
});

// ---------- correios ----------
app.get('/api/cep/:cep', async (c) => {
  const r = await buscarCep(c.env, c.req.param('cep'));
  if ('error' in r) return c.json(r, (r as any).status || 502);
  return c.json({ endereco: r });
});

app.post('/api/prazo', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const cep = String(body?.cep || '').replace(/\D/g, '');
  if (cep.length !== 8) return c.json({ error: 'CEP inválido' }, 400);
  const sedex = await calcularPrazo(c.env, cep, 'SEDEX', c.env.ORIGIN_CEP);
  const pac = await calcularPrazo(c.env, cep, 'PAC', c.env.ORIGIN_CEP);
  return c.json({ frete_gratis: true, sedex, pac });
});

app.get('/api/rastreio/:codigo', async (c) => {
  const r = await rastrear(c.env, c.req.param('codigo'));
  if (!r) return c.json({ error: 'Objeto não encontrado ou rastreamento indisponível' }, 404);
  return c.json({ rastreio: r });
});

// ---------- lead (cadastro revenda) ----------
app.post('/api/lead', async (c) => {
  await init(c.env);
  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const whatsapp = sanitizePhone(body?.whatsapp || '');
  if (!name || whatsapp.length < 10) return c.json({ error: 'Nome e WhatsApp são obrigatórios' }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO leads (id, name, whatsapp, product, interest, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, name, whatsapp, String(body?.product || ''), String(body?.interest || ''), new Date().toISOString()).run();
  await telegramNotify(c.env, `🔔 *NOVO CADASTRO DROPPFY*\n\n👤 Nome: ${name}\n📱 WhatsApp: ${whatsapp}\n📦 Produto: ${body?.product || '-'}\n🎯 Interesse: ${body?.interest || '-'}`);
  return c.json({ ok: true, id });
});

// ---------- auth ----------
app.post('/api/auth/register', async (c) => {
  await init(c.env);
  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const whatsapp = sanitizePhone(body?.whatsapp || '');
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const interest = String(body?.interest || '');
  if (!name || whatsapp.length < 10) return c.json({ error: 'Nome e WhatsApp são obrigatórios' }, 400);
  if (password.length < 6) return c.json({ error: 'Senha deve ter ao menos 6 caracteres' }, 400);
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE whatsapp = ? OR (email != \'\' AND email = ?)').bind(whatsapp, email).run();
  if (exists.results?.length) return c.json({ error: 'Cadastro já existe com este WhatsApp ou e-mail' }, 409);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO users (id, name, whatsapp, email, password_hash, role, interest, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
  ).bind(id, name, whatsapp, email, await hashPassword(password), 'user', interest, new Date().toISOString()).run();
  const token = await signJWT({ uid: id, role: 'user' }, secret(c.env));
  await telegramNotify(c.env, `🆕 *NOVO USUÁRIO*\n\n👤 ${name}\n📱 ${whatsapp}\n💼 Interesse: ${interest || '-'}`);
  return c.json({ token, user: { id, name, whatsapp, email, role: 'user', interest } });
});

app.post('/api/auth/login', async (c) => {
  await init(c.env);
  const body = await c.req.json().catch(() => ({}));
  const login = String(body?.login || '').trim();
  const password = String(body?.password || '');
  if (!login || !password) return c.json({ error: 'Informe e-mail/WhatsApp e senha' }, 400);
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM users WHERE (email = ? OR whatsapp = ?) AND active = 1'
  ).bind(login.toLowerCase(), sanitizePhone(login)).run();
  const user = results?.[0] as any;
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }
  const token = await signJWT({ uid: user.id, role: user.role }, secret(c.env));
  return c.json({ token, user: { id: user.id, name: user.name, whatsapp: user.whatsapp, email: user.email, role: user.role, interest: user.interest } });
});

app.get('/api/auth/me', async (c) => {
  const user = await requireUser(c.env, c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Não autenticado' }, 401);
  return c.json({ user: { id: user.id, name: user.name, whatsapp: user.whatsapp, email: user.email, role: user.role, interest: user.interest, created_at: user.created_at } });
});

// ---------- checkout ----------
app.post('/api/checkout', async (c) => {
  await init(c.env);
  const user = await requireUser(c.env, c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Faça login para finalizar o pedido' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const items: Array<{ id: string; qty: number; option: string }> = Array.isArray(body?.items) ? body.items : [];
  const cep = String(body?.cep || '').replace(/\D/g, '').slice(0, 8);
  if (!items.length) return c.json({ error: 'Carrinho vazio' }, 400);
  if (cep.length !== 8) return c.json({ error: 'Informe um CEP válido (frete grátis)' }, 400);

  const lines: Array<{ id: string; name: string; qty: number; option: string; price_cents: number }> = [];
  let total = 0;
  for (const item of items) {
    const qty = Math.max(1, Math.min(999, Number(item.qty) || 1));
    const { results } = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND active = 1').bind(item.id).run();
    const p = results?.[0] as any;
    if (!p) return c.json({ error: `Produto ${item.id} indisponível` }, 400);
    if (p.type !== 'kit' || !p.base_price_cents) return c.json({ error: `Produto "${p.name}" indisponível para compra online` }, 400);
    const price = unitPrice(p.base_price_cents, item.option, qty);
    if (price == null) return c.json({ error: 'Opção de kit inválida' }, 400);
    const label = item.option === 'unit' ? '1 unidade' : item.option === 'kit8' ? 'Kit 8 peças' : 'Kit 12+ peças';
    lines.push({ id: p.id, name: p.name, qty, option: item.option, price_cents: price * qty });
    total += price * qty;
  }

  const orderId = `DPF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const customer = {
    name: body?.name || user.name,
    email: body?.email || user.email || '',
    phone_number: `+55${body?.whatsapp || user.whatsapp}`,
  };

  const link = await createCheckoutLink(c.env, {
    orderNsu: orderId,
    items: lines.map((l) => ({ quantity: l.qty, price: l.price_cents, description: `${l.name} — ${l.option === 'unit' ? 'Unidade' : l.option === 'kit8' ? 'Kit 8 peças' : 'Kit 12 peças'}` })),
    customer: { name: customer.name, email: customer.email || undefined, phone_number: customer.phone_number },
    singlePayment: lines.length === 1,
  });

  const address = cep ? `${cep}` : '';
  await c.env.DB.prepare(
    `INSERT INTO orders (id, user_id, customer_name, customer_whatsapp, customer_email, cep, address, items, total_cents, status, checkout_url, tracking_code, tracking_events, gateway_payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, '', '[]', '', ?, ?)`
  ).bind(
    orderId, user.id, customer.name, customer.phone_number.replace('+55', ''), customer.email || '', cep, address,
    JSON.stringify(lines), total, link.url || '', new Date().toISOString(), new Date().toISOString()
  ).run();

  if (link.error) return c.json({ error: `Erro no gateway: ${link.error}`, orderId }, 502);
  return c.json({ orderId, checkoutUrl: link.url, total_cents: total });
});

// ---------- orders ----------
app.get('/api/orders', async (c) => {
  const user = await requireUser(c.env, c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Não autenticado' }, 401);
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
  ).bind(user.id).run();
  return c.json({ orders: (results || []).map((o: any) => ({ ...o, items: JSON.parse(o.items || '[]'), tracking_events: JSON.parse(o.tracking_events || '[]') })) });
});

app.get('/api/orders/:id', async (c) => {
  const user = await requireUser(c.env, c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Não autenticado' }, 401);
  const { results } = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run();
  const o = results?.[0] as any;
  if (!o) return c.json({ error: 'Pedido não encontrado' }, 404);
  return c.json({ order: { ...o, items: JSON.parse(o.items || '[]'), tracking_events: JSON.parse(o.tracking_events || '[]') } });
});

app.post('/api/orders/:id/check', async (c) => {
  const user = await requireUser(c.env, c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Não autenticado' }, 401);
  const { results } = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run();
  const o = results?.[0] as any;
  if (!o) return c.json({ error: 'Pedido não encontrado' }, 404);
  if (o.status === 'pending' && o.checkout_url) {
    const check = await paymentCheck(c.env, { orderNsu: o.id });
    if (check.paid) {
      await c.env.DB.prepare("UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), o.id).run();
      await telegramNotify(c.env, `💰 *PEDIDO PAGO*\n\n🧾 ${o.id}\n👤 ${o.customer_name}\n💵 R$ ${(o.total_cents / 100).toFixed(2)}`);
    }
  }
  const { results: updated } = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(o.id).run();
  const u = updated?.[0] as any;
  return c.json({ order: { ...u, items: JSON.parse(u.items || '[]'), tracking_events: JSON.parse(u.tracking_events || '[]') } });
});

// ---------- webhook gateway ----------
app.post('/api/webhook/infinitepay', async (c) => {
  await init(c.env);
  const body = await c.req.json().catch(() => ({}));
  const orderNsu = String(body?.order_nsu || '');
  if (!orderNsu) return c.json({ ok: false }, 400);
  const { results } = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderNsu).run();
  const o = results?.[0] as any;
  if (!o) return c.json({ ok: false, error: 'order not found' }, 404);
  const amount = Number(body?.paid_amount ?? body?.amount ?? 0);
  if (o.status === 'pending' && amount > 0) {
    await c.env.DB.prepare(
      "UPDATE orders SET status = 'paid', gateway_payload = ?, updated_at = ? WHERE id = ?"
    ).bind(JSON.stringify(body), new Date().toISOString(), orderNsu).run();
    await telegramNotify(c.env, `💰 *PEDIDO PAGO (webhook)*\n\n🧾 ${orderNsu}\n👤 ${o.customer_name}\n📱 ${o.customer_whatsapp}\n💵 R$ ${(amount / 100).toFixed(2)}`);
  }
  return c.json({ ok: true });
});

// ---------- admin ----------
app.get('/api/admin/stats', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000).toISOString();
  const q = async (sql: string, ...params: any[]) => (await c.env.DB.prepare(sql).bind(...params).run()).results;
  const orders = await q('SELECT COUNT(*) AS c, COALESCE(SUM(CASE WHEN status IN (\'paid\',\'shipped\',\'delivered\') THEN total_cents ELSE 0 END),0) AS revenue FROM orders');
  const ordersToday = await q("SELECT COUNT(*) AS c FROM orders WHERE created_at >= ?", dayAgo);
  const pending = await q("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'");
  const paid = await q("SELECT COUNT(*) AS c FROM orders WHERE status IN ('paid','shipped','delivered')");
  const users = await q('SELECT COUNT(*) AS c FROM users WHERE role = \'user\'');
  const leads = await q('SELECT COUNT(*) AS c FROM leads');
  return c.json({ stats: { orders: (orders?.[0] as any)?.c || 0, revenue_cents: (orders?.[0] as any)?.revenue || 0, orders_today: (ordersToday?.[0] as any)?.c || 0, pending: (pending?.[0] as any)?.c || 0, paid: (paid?.[0] as any)?.c || 0, users: (users?.[0] as any)?.c || 0, leads: (leads?.[0] as any)?.c || 0 } });
});

app.get('/api/admin/orders', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const status = c.req.query('status') || '';
  const sql = status ? "SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200" : 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 200';
  const { results } = await c.env.DB.prepare(sql).bind(...(status ? [status] : [])).run();
  return c.json({ orders: (results || []).map((o: any) => ({ ...o, items: JSON.parse(o.items || '[]'), tracking_events: JSON.parse(o.tracking_events || '[]'), gateway_payload: undefined })) });
});

app.patch('/api/admin/orders/:id', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const body = await c.req.json().catch(() => ({}));
  const { results } = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(c.req.param('id')).run();
  const o = results?.[0] as any;
  if (!o) return c.json({ error: 'Pedido não encontrado' }, 404);
  const status = body?.status ? String(body.status) : o.status;
  const tracking = body?.tracking_code !== undefined ? String(body.tracking_code).trim().toUpperCase() : o.tracking_code;
  let events = JSON.parse(o.tracking_events || '[]');
  if (tracking && tracking !== o.tracking_code) {
    const r = await rastrear(c.env, tracking);
    if (r) events = r.eventos;
  }
  await c.env.DB.prepare('UPDATE orders SET status = ?, tracking_code = ?, tracking_events = ?, updated_at = ? WHERE id = ?')
    .bind(status, tracking, JSON.stringify(events), new Date().toISOString(), o.id).run();
  return c.json({ ok: true, order: { ...o, status, tracking_code: tracking, tracking_events: events } });
});

app.get('/api/admin/users', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const { results } = await c.env.DB.prepare('SELECT id, name, whatsapp, email, role, interest, active, created_at FROM users ORDER BY created_at DESC LIMIT 500').run();
  return c.json({ users: results || [] });
});

app.patch('/api/admin/users/:id', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const body = await c.req.json().catch(() => ({}));
  if (body?.active !== undefined) {
    await c.env.DB.prepare('UPDATE users SET active = ? WHERE id = ?').bind(body.active ? 1 : 0, c.req.param('id')).run();
  }
  return c.json({ ok: true });
});

app.get('/api/admin/leads', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const { results } = await c.env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500').run();
  return c.json({ leads: results || [] });
});

app.get('/api/admin/products', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const { results } = await c.env.DB.prepare('SELECT * FROM products ORDER BY sort ASC, name ASC LIMIT 1000').run();
  return c.json({ products: (results || []).map(withPrices) });
});

app.post('/api/admin/products', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  if (!name) return c.json({ error: 'Nome obrigatório' }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO products (id, slug, name, description, brand, category, type, image, gallery, base_price_cents, partner_url, badge, featured, active, sort, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90),
    name, String(body?.description || ''), String(body?.brand || ''), String(body?.category || ''),
    String(body?.type || 'kit'), String(body?.image || ''), body?.base_price_cents ?? null,
    String(body?.partner_url || ''), String(body?.badge || ''), body?.featured ? 1 : 0,
    Number(body?.sort || 0), new Date().toISOString()
  ).run();
  return c.json({ ok: true, id });
});

app.patch('/api/admin/products/:id', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const body = await c.req.json().catch(() => ({}));
  const { results } = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(c.req.param('id')).run();
  const p = results?.[0] as any;
  if (!p) return c.json({ error: 'Produto não encontrado' }, 404);
  const name = body?.name !== undefined ? String(body.name) : p.name;
  await c.env.DB.prepare(
    `UPDATE products SET name = ?, description = ?, brand = ?, category = ?, type = ?, image = ?, base_price_cents = ?, partner_url = ?, badge = ?, featured = ?, active = ?, sort = ? WHERE id = ?`
  ).bind(
    name,
    body?.description !== undefined ? String(body.description) : p.description,
    body?.brand !== undefined ? String(body.brand) : p.brand,
    body?.category !== undefined ? String(body.category) : p.category,
    body?.type !== undefined ? String(body.type) : p.type,
    body?.image !== undefined ? String(body.image) : p.image,
    body?.base_price_cents !== undefined ? (body.base_price_cents == null ? null : Number(body.base_price_cents)) : p.base_price_cents,
    body?.partner_url !== undefined ? String(body.partner_url) : p.partner_url,
    body?.badge !== undefined ? String(body.badge) : p.badge,
    body?.featured !== undefined ? (body.featured ? 1 : 0) : p.featured,
    body?.active !== undefined ? (body.active ? 1 : 0) : p.active,
    body?.sort !== undefined ? Number(body.sort) : p.sort,
    c.req.param('id')
  ).run();
  return c.json({ ok: true });
});

app.delete('/api/admin/products/:id', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

app.post('/api/admin/promotions', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body?.title || '').trim();
  const message = String(body?.message || '').trim();
  if (!title) return c.json({ error: 'Título obrigatório' }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO promotions (id, title, message, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, title, message, new Date().toISOString()).run();
  const { results } = await c.env.DB.prepare("SELECT whatsapp, name FROM users WHERE role = 'user' AND active = 1").run();
  const adminWa = c.env.ADMIN_WHATSAPP || '';
  const links = (results || []).map((u: any) => ({
    name: u.name,
    whatsapp: u.whatsapp,
    link: `https://wa.me/55${u.whatsapp}?text=${encodeURIComponent(`*${title}*\n\n${message}`)}`,
  }));
  return c.json({ ok: true, id, total: links.length, links });
});

app.get('/api/admin/promotions', async (c) => {
  if (!(await requireAdmin(c.env, c.req.header('Authorization')))) return c.json({ error: 'Acesso negado' }, 403);
  const { results } = await c.env.DB.prepare('SELECT * FROM promotions ORDER BY created_at DESC LIMIT 100').run();
  return c.json({ promotions: results || [] });
});

// ---------- 404 ----------
app.notFound((c) => c.json({ error: 'Rota não encontrada' }, 404));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('DROPPFY', { headers: { 'content-type': 'text/plain;charset=utf-8' } });
  },
};
