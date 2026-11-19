/** قالب‌بندی فارسی: تقویم جلالی، ارقام فارسی، پول و نرمال‌سازی متن. */

export const TIMEZONE = 'Asia/Tehran';

const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'medium',
  timeZone: TIMEZONE,
});
const jalaliDateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIMEZONE,
});

export const formatJalali = (d: Date | string) => jalaliDate.format(new Date(d));
export const formatJalaliDateTime = (d: Date | string) => jalaliDateTime.format(new Date(d));

const faNumber = new Intl.NumberFormat('fa-IR');
export const formatNumber = (n: number | bigint) => faNumber.format(n);

/** مبالغ در دیتابیس ریال (عدد صحیح) هستند. 1 تومان = 10 ریال. */
export function formatMoney(rial: number | bigint, unit: 'toman' | 'rial' = 'toman'): string {
  if (unit === 'rial') return `${faNumber.format(rial)} ریال`;
  return `${faNumber.format(BigInt(rial) / 10n)} تومان`;
}

const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
/** تبدیل ارقام فارسی و عربی به لاتین (برای ورودی کاربر). */
export const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (c) => String(FA.indexOf(c))).replace(/[٠-٩]/g, (c) => String(AR.indexOf(c)));

/** نرمال‌سازی متن فارسی برای جستجو: ی/ک عربی، نیم‌فاصله، ارقام. */
export function normalizeFa(s: string): string {
  return toLatinDigits(s)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
