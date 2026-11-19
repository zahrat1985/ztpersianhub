/** مدل استاندارد تجارت: کانکتورها داده هر پلتفرم را به این شکل ترجمه می‌کنند. */
export type OrderStatus = 'paid' | 'pending' | 'cancelled' | 'refunded';

export interface CanonicalOrder {
  externalId: string;
  status: OrderStatus;
  totalRial: bigint;
  refundedRial: bigint;
  customerExternalId: string | null;
  placedAt: Date;
  items: { productExternalId: string | null; title: string; quantity: number; totalRial: bigint }[];
}

export interface OrderPage {
  orders: CanonicalOrder[];
  nextPage: number | null;
}

export interface Connector {
  readonly platform: string;
  /** بررسی صحت اطلاعات اتصال */
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  /** دریافت صفحه‌ای سفارش‌ها؛ `since` برای همگام‌سازی تدریجی */
  fetchOrders(opts: { since?: Date; page?: number }): Promise<OrderPage>;
}
