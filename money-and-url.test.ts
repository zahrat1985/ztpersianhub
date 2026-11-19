import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRial } from '../src/integrations/woocommerce';
import { assertPublicHttpsUrl, isPrivateIp } from '../src/lib/safe-url';

test('toRial: IRR/IRT/IRHR/IRHT', () => {
  assert.equal(toRial('1000', 'IRR'), 1000n);
  assert.equal(toRial('1000', 'IRT'), 10000n);
  assert.equal(toRial('2', 'IRHR'), 2000n);
  assert.equal(toRial('2', 'IRHT'), 20000n);
  assert.equal(toRial('1.5', 'IRHT'), 15000n); // ۱٫۵ هزار تومان
});

test('toRial: ارز ناشناخته خطا می‌دهد', () => {
  assert.throws(() => toRial('10', 'USD'));
});

test('isPrivateIp', () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1'])
    assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111'])
    assert.equal(isPrivateIp(ip), false, ip);
});

test('assertPublicHttpsUrl: رد آدرس‌های ناامن', async () => {
  for (const u of ['http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://169.254.169.254/latest', 'https://user:pw@example.com', 'ftp://example.com', 'نامعتبر'])
    await assert.rejects(() => assertPublicHttpsUrl(u), u);
});

test('assertPublicHttpsUrl: آدرس عمومی IP پذیرفته می‌شود', async () => {
  const u = await assertPublicHttpsUrl('https://8.8.8.8');
  assert.equal(u.hostname, '8.8.8.8');
});
