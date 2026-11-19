/**
 * لایه هوش مصنوعی مستقل از ارائه‌دهنده (فاز ۵).
 * هیچ ارائه‌دهنده‌ای پیش‌فرض نیست؛ پیاده‌سازی‌ها (داخلی، میزبانی‌شده روی سرور خودتان،
 * یا خارجی در صورت مجاز بودن از نظر حقوقی) اینجا ثبت می‌شوند.
 */
export interface AiRequest {
  tenantId: string;
  task: 'product_copy' | 'ad_copy' | 'weekly_summary';
  prompt: string;
  locale?: 'fa';
}

export interface AiResult {
  text: string;
  /** برای اندازه‌گیری هزینه و سهمیه هر تننت */
  usage?: { inputTokens: number; outputTokens: number };
}

export interface AiProvider {
  readonly name: string;
  generate(req: AiRequest): Promise<AiResult>;
}

const providers = new Map<string, AiProvider>();
export const registerAiProvider = (p: AiProvider) => providers.set(p.name, p);
export const getAiProvider = (name: string) => {
  const p = providers.get(name);
  if (!p) throw new Error(`ارائه‌دهنده هوش مصنوعی «${name}» ثبت نشده است.`);
  return p;
};
