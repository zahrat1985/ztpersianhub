import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * محافظت در برابر SSRF: آدرس فروشگاه را کاربر وارد می‌کند و سرور به آن درخواست می‌زند.
 * فقط https و فقط آدرس‌های عمومی مجازند.
 * توسعه محلی: ALLOW_PRIVATE_STORE_URLS=1 (هرگز در production فعال نکنید).
 */

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||           // link-local و metadata ابری
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224                              // multicast و رزرو
  );
}

function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === '::' || s === '::1') return true;
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return s.startsWith('fc') || s.startsWith('fd') || /^fe[89ab]/.test(s) || s.startsWith('ff');
}

export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isPrivateIPv4(ip);
  if (v === 6) return isPrivateIPv6(ip);
  return true; // ناشناخته = رد
}

export class UnsafeUrlError extends Error {}

/** آدرس را اعتبارسنجی می‌کند و در صورت امن بودن URL را برمی‌گرداند. */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const allowPrivate = process.env.ALLOW_PRIVATE_STORE_URLS === '1' && process.env.NODE_ENV !== 'production';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('آدرس فروشگاه معتبر نیست.');
  }
  if (!allowPrivate && url.protocol !== 'https:') throw new UnsafeUrlError('آدرس فروشگاه باید با https شروع شود.');
  if (allowPrivate && url.protocol !== 'https:' && url.protocol !== 'http:') throw new UnsafeUrlError('پروتکل مجاز نیست.');
  if (url.username || url.password) throw new UnsafeUrlError('آدرس نباید شامل نام کاربری یا رمز باشد.');
  if (allowPrivate) return url;

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new UnsafeUrlError('این آدرس مجاز نیست.');
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new UnsafeUrlError('دامنه پیدا نشد.');
  if (addrs.some((a) => isPrivateIp(a.address))) throw new UnsafeUrlError('این آدرس مجاز نیست.');
  return url;
}
