export interface InfinitepayEnv {
  INFINITEPAY_KEY?: string;
  STORE_HANDLE?: string;
  SITE_URL?: string;
}

export interface CheckoutItem {
  quantity: number;
  price: number; // centavos
  description: string;
}

export async function createCheckoutLink(
  env: InfinitepayEnv,
  opts: {
    orderNsu: string;
    items: CheckoutItem[];
    customer?: { name?: string; email?: string; phone_number?: string };
    redirectUrl?: string;
    singlePayment?: boolean;
  }
): Promise<{ url?: string; error?: string }> {
  if (!env.INFINITEPAY_KEY) return { error: 'Gateway não configurado' };
  const body: Record<string, unknown> = {
    handle: env.STORE_HANDLE || 'droppfy',
    order_nsu: opts.orderNsu,
    redirect_url: opts.redirectUrl || `${env.SITE_URL}/#/pedido/${opts.orderNsu}`,
    webhook_url: `${env.SITE_URL}/api/webhook/infinitepay`,
    items: opts.items,
    options: {
      assured_installments: 0,
      require_delivery_address: true,
      single_payment: opts.singlePayment ?? false,
      valid_until: new Date(Date.now() + 3600 * 1000).toISOString(),
      payment_methods_enabled: ['credit_card', 'pix'],
    },
  };
  if (opts.customer?.name) body.customer = opts.customer;
  try {
    const res = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': env.INFINITEPAY_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json() as any;
    if (!res.ok) return { error: data?.message || data?.error || `HTTP ${res.status}` };
    return { url: data.url || data.checkout_url || null };
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

export async function paymentCheck(
  env: InfinitepayEnv,
  opts: { orderNsu: string; transactionNsu?: string; slug?: string }
): Promise<{ paid: boolean; data?: any }> {
  if (!env.INFINITEPAY_KEY) return { paid: false };
  try {
    const res = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': env.INFINITEPAY_KEY },
      body: JSON.stringify({
        handle: env.STORE_HANDLE || 'droppfy',
        order_nsu: opts.orderNsu,
        transaction_nsu: opts.transactionNsu || '',
        slug: opts.slug || '',
      }),
    });
    const data = await res.json() as any;
    return { paid: !!(res.ok && data?.success && data?.paid), data };
  } catch {
    return { paid: false };
  }
}
