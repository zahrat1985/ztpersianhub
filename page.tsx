import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing">
      <h1>هوش مصنوعی، شریک رشد فروشگاه آنلاین شما</h1>
      <p>
        فروشگاه خود را وصل کنید، تحلیل فروش را در داشبورد خصوصی خود ببینید و به‌تدریج
        از ابزارهای بازاریابی و اتوماسیون هوشمند استفاده کنید.
      </p>
      <div className="actions">
        <Link className="btn" href="/dashboard">ورود به داشبورد</Link>
        <a className="btn btn-outline" href="https://github.com/zahrat1985/ztpersianhub">مستندات پروژه</a>
      </div>
    </main>
  );
}
