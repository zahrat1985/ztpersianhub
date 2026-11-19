// اجرای ساده مایگریشن‌ها با نقش مالک
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const url = process.env.DATABASE_ADMIN_URL;
if (!url) throw new Error('DATABASE_ADMIN_URL تنظیم نشده است (فایل .env را بارگذاری کنید).');
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('create table if not exists _migrations (name text primary key, applied_at timestamptz default now())');
const dir = path.resolve('db/migrations');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  const done = await client.query('select 1 from _migrations where name = $1', [f]);
  if (done.rowCount) continue;
  await client.query('begin');
  try {
    await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    await client.query('insert into _migrations(name) values ($1)', [f]);
    await client.query('commit');
    console.log('اعمال شد:', f);
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}
await client.end();
