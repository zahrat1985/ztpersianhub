import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZT Iran Hub | هاب هوش مصنوعی فروشگاه‌های آنلاین',
  description: 'تحلیل فروش و بازاریابی هوشمند برای فروشگاه‌های آنلاین ایرانی',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
