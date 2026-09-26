import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/analytics.js';
import { onRequestPost } from '../functions/api/contact.js';
import { parseOptions, buildQuery, renderReport, queryAnalytics } from '../scripts/analytics-report.mjs';

const origin = 'https://christopherbengtsson.dev';
const event = { event: 'capability_expand', target: 'build-extend', locale: 'en', path: '/' };
const makeRequest = (body = event, headers = {}, url = `${origin}/api/analytics`) => new Request(url, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
});
const collector = () => {
  const points = [];
  return { points, env: { ANALYTICS_ENABLED: 'true', SITE_ANALYTICS: { writeDataPoint: (point) => points.push(point) } } };
};

test('records only fixed analytics dimensions and never request metadata', async () => {
  const { points, env } = collector();
  const result = await onRequest({ request: makeRequest(event, { 'User-Agent': 'private-agent', 'CF-Connecting-IP': '192.0.2.1' }), env });
  assert.equal(result.status, 204);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(points, [{ indexes: ['christopherbengtsson.dev'], blobs: ['1', 'capability_expand', 'en', '/', 'build-extend'], doubles: [] }]);
});

test('rejects malformed events, untrusted dimensions and client success events', async () => {
  const { points, env } = collector();
  for (const body of ['{', null, [], { ...event, email: 'private@example.com' }, { ...event, event: 'form_success', target: 'contact' }, { ...event, target: 'unknown' }, { ...event, locale: 'sv' }, { ...event, path: '/?secret=1' }, { ...event, event: ['capability_expand'] }, { ...event, event: '__proto__' }]) {
    assert.equal((await onRequest({ request: makeRequest(body), env })).status, 400);
  }
  assert.deepEqual(points, []);
});

test('bounds streamed body size even without a Content-Length header', async () => {
  const { points, env } = collector();
  assert.equal((await onRequest({ request: makeRequest(' '.repeat(1025)), env })).status, 413);
  assert.equal((await onRequest({ request: makeRequest(event, { 'Content-Length': '1025' }), env })).status, 413);
  assert.deepEqual(points, []);
});

test('rejects other origins, non-JSON, and unsupported methods', async () => {
  const { points, env } = collector();
  for (const headers of [{ Origin: 'https://elsewhere.example' }, { Origin: '' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await onRequest({ request: makeRequest(event, headers), env })).status, 403);
  }
  assert.equal((await onRequest({ request: makeRequest(event, { 'Content-Type': 'text/plain' }), env })).status, 415);
  assert.equal((await onRequest({ request: new Request(`${origin}/api/analytics`), env })).status, 405);
  assert.deepEqual(points, []);
});

test('preview, disabled and missing bindings never write, and write failures do not break ingestion', async () => {
  const { points, env } = collector();
  for (const url of ['http://localhost:4321/api/analytics', 'https://preview.portfolio-33y.pages.dev/api/analytics']) {
    assert.equal((await onRequest({ request: makeRequest(event, {}, url), env })).status, 204);
  }
  for (const config of [{}, { ...env, ANALYTICS_ENABLED: 'false' }, { ANALYTICS_ENABLED: 'true', SITE_ANALYTICS: { writeDataPoint() { throw new Error('offline'); } } }]) {
    assert.equal((await onRequest({ request: makeRequest(), env: config })).status, 204);
  }
  assert.deepEqual(points, []);
});

test('contact records only Resend-accepted requests, including no-JS forms', async () => {
  const { points, env } = collector();
  Object.assign(env, { RESEND_API_KEY: 'test', RESEND_FROM_EMAIL: 'test@example.com' });
  const values = { name: 'Test', email: 'test@example.com', message: 'A test inquiry for analytics.', locale: 'sv' };
  const request = (fields = values, host = origin) => new Request(`${host}/api/contact?locale=sv`, { method: 'POST', body: new URLSearchParams(fields) });
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{}', { status: 200 });
    assert.equal((await onRequestPost({ request: request(), env })).status, 303);
    assert.deepEqual(points[0].blobs, ['1', 'form_success', 'sv', '/sv/', 'contact']);
    await onRequestPost({ request: request({ ...values, company_site: 'bot' }), env });
    await onRequestPost({ request: request({ ...values, email: 'invalid' }), env });
    await onRequestPost({ request: request(values, 'https://preview.portfolio-33y.pages.dev'), env });
    globalThis.fetch = async () => new Response('failed', { status: 503 });
    await onRequestPost({ request: request(), env });
    globalThis.fetch = async () => { throw new Error('network failure'); };
    await onRequestPost({ request: request(), env });
    assert.equal(points.length, 1);
    globalThis.fetch = async () => new Response('{}', { status: 200 });
    env.SITE_ANALYTICS.writeDataPoint = () => { throw new Error('analytics failure'); };
    assert.equal((await onRequestPost({ request: request(), env })).status, 303);
  } finally { globalThis.fetch = original; }
});

test('report validates options, weights SQL counts and handles empty data', () => {
  assert.deepEqual(parseOptions([]), { days: 30, locale: null });
  assert.deepEqual(parseOptions(['--days', '7', '--locale', 'sv']), { days: 7, locale: 'sv' });
  for (const args of [['--days', '0'], ['--days', '91'], ['--days'], ['--locale', 'xx'], ['--days', "1' OR 1=1"]]) assert.throws(() => parseOptions(args));
  assert.match(buildQuery({ days: 7, locale: 'sv' }), /SUM\(_sample_interval\)/);
  assert.match(buildQuery({ days: 7, locale: 'sv' }), /formatDateTime\(timestamp, '%Y-%m-%d', 'Etc\/UTC'\)/);
  assert.match(buildQuery({ days: 7, locale: 'sv' }), /blob3 = 'sv'/);
  assert.match(renderReport([], { days: 30, locale: null }), /No events in this period/);
  const rows = [
    { day: '2026-09-26', event: 'section_view', target: 'services', locale: 'en', count: '10' },
    { day: '2026-09-26', event: 'capability_expand', target: 'build-extend', locale: 'en', count: '2' },
    { day: '2026-09-26', event: 'capability_expand', target: 'build-extend', locale: 'sv', count: '3' },
  ];
  assert.match(renderReport(rows, { days: 30, locale: null }), /build-extend \| 5 \| 2 \| 3 \| 50.0%/);
  assert.match(renderReport(rows, { days: 30, locale: 'en' }), /build-extend \| 2 \| 2 \| 0 \| 20.0%/);
});

test('report reports missing credentials and API failures without exposing secrets', async () => {
  const options = { days: 30, locale: null };
  await assert.rejects(queryAnalytics(options, {}), /CLOUDFLARE_ACCOUNT_ID/);
  const env = { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_ANALYTICS_READ_TOKEN: 'secret' };
  await assert.rejects(queryAnalytics(options, env, async () => new Response('secret', { status: 403 })), /HTTP 403/);
  assert.deepEqual(await queryAnalytics(options, env, async () => Response.json({ data: [] })), []);
});
