const enc = new TextEncoder();
const dec = new TextDecoder();
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToB64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2] + B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[b2 & 63] : '=';
  }
  return out;
}

function b64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const clean = s.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n0 = B64.indexOf(clean[i]);
    const n1 = B64.indexOf(clean[i + 1] ?? 'A');
    const n2 = B64.indexOf(clean[i + 2] ?? 'A');
    const n3 = B64.indexOf(clean[i + 3] ?? 'A');
    out.push((n0 << 2) | (n1 >> 4));
    if (clean[i + 2] !== undefined) out.push(((n1 & 15) << 4) | (n2 >> 2));
    if (clean[i + 3] !== undefined) out.push(((n2 & 3) << 6) | n3);
  }
  const arr = new Uint8Array(new ArrayBuffer(out.length));
  arr.set(out);
  return arr;
}

const b64u = (buf: ArrayBuffer | Uint8Array) =>
  bytesToB64(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 60000, hash: 'SHA-256' },
    key,
    256
  );
  return `${b64u(salt)}.${b64u(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split('.');
  if (!saltB64 || !hashB64) return false;
  const salt = b64ToBytes(saltB64);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 60000, hash: 'SHA-256' },
    key,
    256
  );
  const a = b64u(bits);
  if (a.length !== hashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return diff === 0;
}

export async function signJWT(payload: Record<string, unknown>, secret: string, ttlSeconds = 86400 * 7): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64u(enc.encode(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds })));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64u(sig)}`;
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, b64ToBytes(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(b64ToBytes(parts[1])));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sanitizePhone(v: string): string {
  return (v || '').replace(/\D/g, '').replace(/^0+/, '');
}
