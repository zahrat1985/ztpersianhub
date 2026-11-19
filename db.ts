import { Pool, type PoolClient } from 'pg';

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;

/**
 * اجرای کوئری‌ها داخل یک تراکنش با تننت مشخص.
 * مقدار app.tenant_id فقط برای همین تراکنش تنظیم می‌شود و RLS بر اساس آن عمل می‌کند.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}
