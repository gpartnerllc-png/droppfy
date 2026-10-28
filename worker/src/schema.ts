export const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  interest TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  category TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'kit',
  image TEXT DEFAULT '',
  gallery TEXT DEFAULT '[]',
  base_price_cents INTEGER,
  partner_url TEXT DEFAULT '',
  badge TEXT DEFAULT '',
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type, active);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  address TEXT DEFAULT '',
  items TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  checkout_url TEXT DEFAULT '',
  tracking_code TEXT DEFAULT '',
  tracking_events TEXT DEFAULT '[]',
  gateway_payload TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  product TEXT DEFAULT '',
  interest TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export async function ensureSchema(db: D1Database) {
  const statements = DDL.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) await db.prepare(stmt).run();
}

export interface SeedProduct {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  type: 'kit' | 'catalog' | 'partner';
  image?: string;
  base_price_cents?: number | null;
  partner_url?: string;
  badge?: string;
  featured?: number;
  sort?: number;
}

export async function seedProducts(db: D1Database, products: SeedProduct[]) {
  const { results } = await db.prepare('SELECT COUNT(*) AS c FROM products').run();
  if ((results?.[0] as any)?.c > 0) return false;
  const now = new Date().toISOString();
  const stmts: D1PreparedStatement[] = [];
  for (const p of products) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO products (id, slug, name, description, brand, category, type, image, gallery, base_price_cents, partner_url, badge, featured, active, sort, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 1, ?, ?)`
        )
        .bind(
          p.id,
          p.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90),
          p.name,
          p.description || '',
          p.brand || '',
          p.category || '',
          p.type,
          p.image || '',
          p.base_price_cents ?? null,
          p.partner_url || '',
          p.badge || '',
          p.featured || 0,
          p.sort || 0,
          now
        )
    );
  }
  await db.batch(stmts);
  return true;
}

export async function ensureAdmin(db: D1Database, email: string | undefined, passwordHash: string | undefined) {
  if (!email || !passwordHash) return;
  const { results } = await db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').bind('admin').run();
  if (results && results.length > 0) return;
  await db
    .prepare(
      `INSERT INTO users (id, name, whatsapp, email, password_hash, role, interest, active, created_at)
       VALUES (?, ?, ?, ?, ?, 'admin', '', 1, ?)`
    )
    .bind(crypto.randomUUID(), 'Administrador', '', email, passwordHash, new Date().toISOString())
    .run();
}
