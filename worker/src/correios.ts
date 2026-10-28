export interface CorreiosEnv {
  CORREIOS_CWS?: string;
  CORREIOS_CARTAO?: string;
  KV: KVNamespace;
}

interface CachedToken {
  token: string;
  exp: number;
}

function decodeJwtExp(token: string): number {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

async function getToken(env: CorreiosEnv): Promise<string | null> {
  if (!env.CORREIOS_CWS) return null;
  const cached = await env.KV.get('correios:token', 'json') as CachedToken | null;
  if (cached && cached.exp > Math.floor(Date.now() / 1000) + 120) return cached.token;

  const cartao = env.CORREIOS_CARTAO || '0078269687';
  const res = await fetch('https://api.correios.com.br/token/v1/autentica/cartaov2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${env.CORREIOS_CWS}`,
    },
    body: JSON.stringify({ numero: cartao }),
  });
  if (!res.ok) {
    console.error('correios token error', res.status, await res.text());
    return null;
  }
  const data = await res.json() as { token?: string };
  if (!data.token) return null;
  const exp = decodeJwtExp(data.token);
  if (exp > 0) await env.KV.put('correios:token', JSON.stringify({ token: data.token, exp }), { expirationTtl: Math.max(60, exp - Math.floor(Date.now() / 1000) - 60) });
  return data.token;
}

export async function buscarCep(env: CorreiosEnv, cep: string) {
  const token = await getToken(env);
  if (!token) return { error: 'Serviço dos Correios indisponível (credencial inválida ou não configurada)', status: 503 } as const;
  const res = await fetch(`https://api.correios.com.br/cep/v2/enderecos/${cep.replace(/\D/g, '')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { error: 'CEP não encontrado', status: res.status === 404 ? 404 : 502 } as const;
  const d = await res.json() as any;
  return {
    cep: d.cep,
    uf: d.estado?.uf || d.uf,
    cidade: d.cidade?.nome || d.localidade,
    bairro: d.bairro,
    logradouro: d.logradouro,
    complemento: d.complemento || '',
  };
}

export interface PrazoResult {
  prazo: number | null;
  dataMaxima: string | null;
  servico: string;
}

export async function calcularPrazo(env: CorreiosEnv, cepDestino: string, servico: 'SEDEX' | 'PAC' = 'SEDEX', origem?: string): Promise<PrazoResult> {
  const token = await getToken(env);
  const coProduto = servico === 'PAC' ? '03298' : '03220';
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dtEvento = `${dd}-${mm}-${today.getFullYear()}`;
  if (!token) return { prazo: null, dataMaxima: null, servico };
  try {
    const res = await fetch(`https://api.correios.com.br/prazo/v1/nacional/${cepDestino.replace(/\D/g, '')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ coProduto, cepOrigem: (origem || '70002900').replace(/\D/g, ''), nuRequisicao: String(Date.now() % 100000), dtEvento }),
    });
    if (!res.ok) return { prazo: null, dataMaxima: null, servico };
    const d = await res.json() as any;
    return { prazo: d.prazoEntrega ?? null, dataMaxima: d.dataMaxima ?? null, servico };
  } catch {
    return { prazo: null, dataMaxima: null, servico };
  }
}

export async function rastrear(env: CorreiosEnv, codigo: string) {
  const token = await getToken(env);
  if (!token) return null;
  try {
    const res = await fetch(`https://api.correios.com.br/rastreamento/v1/objetos/${codigo.trim()}?resultado=T&coResultado=T`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const d = await res.json() as any;
    const obj = d?.objetos?.[0];
    if (!obj) return null;
    return {
      codigo: obj.codObjeto || codigo,
      eventos: (obj.eventos || []).map((e: any) => ({
        status: e.tipo || e.status || '',
        descricao: e.descricao || '',
        data: e.dtHrCriado || '',
        local: e.unidade?.endereco?.cidade ? `${e.unidade.endereco.cidade}/${e.unidade.endereco.uf}` : e.unidade?.nome || '',
      })).reverse(),
    };
  } catch {
    return null;
  }
}
