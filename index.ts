import type { CanonicalOrder, Connector, OrderPage, OrderStatus } from '../types';
import { assertPublicHttpsUrl } from '@/lib/safe-url';

export interface WooCredentials {
  baseUrl: string; // مثلاً https://shop.example.ir
  consumerKey: string;
  consumerSecret: string;
}

// وضعیت‌های پیش‌فرض ووکامرس. افزونه‌ها وضعیت اضافه می‌کنند؛ ناشناخته‌ها «pending» می‌شوند.
const STATUS_MAP: Record<string, OrderStatus> = {
  processing: 'paid',
  completed: 'paid',
  'on-hold': 'pending',
  pending: 'pending',
  cancelled: 'cancelled',
  failed: 'cancelled',
  refunded: 'refunded',
};

/**
 * ضریب تبدیل کد ارز ووکامرس به ریال.
 * IRR = ریال، IRT = تومان، IRHR = هزار ریال، IRHT = هزار تومان (کدهای افزونه‌های فارسی).
 * ارز ناشناخته خطا می‌دهد تا مبلغ اشتباه بی‌صدا ذخیره نشود.
 */
const RIAL_PER_UNIT: Record<string, number> = { IRR: 1, IRT: 10, IRHR: 1000, IRHT: 10_000 };

export function toRial(amount: string | number, currency: string): bigint {
  const factor = RIAL_PER_UNIT[currency.toUpperCase()];
  if (factor === undefined) throw new Error(`ارز «${currency}» پشتیبانی نمی‌شود. فقط IRR، IRT، IRHR و IRHT.`);
  // ابتدا ضرب، سپس گرد کردن (برای مبلغ‌های اعشاری مثل 1.5 هزار تومان)
  return BigInt(Math.round((Number(amount) || 0) * factor));
}

export class WooCommerceConnector implements Connector {
  readonly platform = 'woocommerce';
  constructor(private creds: WooCredentials) {}

  private async get(path: string, params: Record<string, string>) {
    const base = await assertPublicHttpsUrl(this.creds.baseUrl);
    const url = new URL(`/wp-json/wc/v3/${path}`, base);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const auth = Buffer.from(`${this.creds.consumerKey}:${this.creds.consumerSecret}`).toString('base64');
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      redirect: 'error', // ریدایرکت می‌تواند به آدرس داخلی برود
      signal: AbortSignal.timeout(20_000), // هاست‌های کند: زمان‌بندی محدود
    });
    if (!res.ok) throw new Error(`ووکامرس پاسخ ${res.status} داد.`);
    return { json: await res.json(), totalPages: Number(res.headers.get('x-wp-totalpages') ?? 1) };
  }

  async testConnection() {
    try {
      await this.get('orders', { per_page: '1' });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'خطای ناشناخته' };
    }
  }

  async fetchOrders({ since, page = 1 }: { since?: Date; page?: number }): Promise<OrderPage> {
    const params: Record<string, string> = { per_page: '50', page: String(page), orderby: 'date', order: 'asc' };
    if (since) params.modified_after = since.toISOString();
    const { json, totalPages } = await this.get('orders', params);
    const orders: CanonicalOrder[] = json.map((o: any) => ({
      externalId: String(o.id),
      status: STATUS_MAP[o.status] ?? 'pending',
      totalRial: toRial(o.total, o.currency),
      refundedRial: (o.refunds ?? []).reduce(
        (sum: bigint, r: any) => sum + toRial(Math.abs(Number(r.total)), o.currency),
        0n,
      ),
      customerExternalId: o.customer_id ? String(o.customer_id) : null,
      placedAt: new Date(o.date_created_gmt + 'Z'),
      items: (o.line_items ?? []).map((i: any) => ({
        productExternalId: i.product_id ? String(i.product_id) : null,
        title: i.name,
        quantity: i.quantity,
        totalRial: toRial(i.total, o.currency),
      })),
    }));
    return { orders, nextPage: page < totalPages ? page + 1 : null };
  }
}
