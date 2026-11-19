import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/** کلید اختصاصی هر تننت از روی کلید اصلی مشتق می‌شود. */
function tenantKey(tenantId: string): Buffer {
  const master = process.env.APP_ENCRYPTION_KEY;
  if (!master) throw new Error('APP_ENCRYPTION_KEY تنظیم نشده است.');
  const raw = Buffer.from(master, 'base64');
  if (raw.length !== 32) throw new Error('APP_ENCRYPTION_KEY باید ۳۲ بایت (base64) باشد.');
  return Buffer.from(hkdfSync('sha256', raw, Buffer.alloc(0), `zt-hub:tenant:${tenantId}`, 32));
}

/** رمزنگاری AES-256-GCM. خروجی: base64(iv.tag.ciphertext) */
export function encryptSecret(tenantId: string, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tenantKey(tenantId), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function decryptSecret(tenantId: string, payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', tenantKey(tenantId), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}
