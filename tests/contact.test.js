import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/contact.js';

const valid = { locale: 'en', name: 'Alex Example', email: 'alex@example.com', message: 'I would like to discuss a software project.' };
const requestFor = (values) => new Request(`https://christopherbengtsson.dev/api/contact?locale=${values.locale}`, {
  method: 'POST', body: new URLSearchParams(values),
});
const env = { RESEND_API_KEY: 'test-key', RESEND_FROM_EMAIL: 'Christopher <inquiries@example.com>' };

test('valid inquiry sends to the public mailbox and redirects', async () => {
  const originalFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return new Response('{"id":"test"}', { status: 200 });
  };
  try {
    const result = await onRequestPost({ request: requestFor(valid), env });
    assert.equal(result.status, 303);
    assert.equal(result.headers.get('location'), '/#contact-success');
    assert.deepEqual(payload.to, ['hello@christopherbengtsson.dev']);
    assert.equal(payload.reply_to, valid.email);
    assert.match(payload.text, /I would like to discuss/);
  } finally { globalThis.fetch = originalFetch; }
});

test('a project inquiry needs no predefined service category', async () => {
  const originalFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return new Response('{"id":"test"}', { status: 200 });
  };
  try {
    const result = await onRequestPost({ request: requestFor({ ...valid, locale: 'sv' }), env });
    assert.equal(result.status, 303);
    assert.equal(payload.subject, 'Project inquiry');
    assert.doesNotMatch(payload.text, /Service:/);
  } finally { globalThis.fetch = originalFetch; }
});

test('separate submissions with identical details get distinct Resend keys', async () => {
  const originalFetch = globalThis.fetch;
  const keys = [];
  globalThis.fetch = async (_url, options) => {
    const key = options.headers['Idempotency-Key'];
    assert.match(key, /^contact\/[0-9a-f-]{36}\/[0-9a-f]{64}$/);
    keys.push(key);
    return new Response('{"id":"test"}', { status: 200 });
  };
  try {
    for (let i = 0; i < 2; i++) {
      const result = await onRequestPost({ request: requestFor(valid), env });
      assert.equal(result.status, 303);
    }
    assert.equal(keys.length, 2);
    assert.notEqual(keys[0], keys[1]);
  } finally { globalThis.fetch = originalFetch; }
});

test('a retry from the error form keeps its key until the inquiry changes', async () => {
  const originalFetch = globalThis.fetch;
  const keys = [];
  let fail = true;
  globalThis.fetch = async (_url, options) => {
    keys.push(options.headers['Idempotency-Key']);
    return new Response(fail ? 'failed' : '{"id":"test"}', { status: fail ? 500 : 200 });
  };
  try {
    const failed = await onRequestPost({ request: requestFor(valid), env });
    assert.equal(failed.status, 503);
    const html = await failed.text();
    const submissionId = html.match(/name="submission_id" value="([^"]+)"/)?.[1];
    assert.match(submissionId, /^[0-9a-f-]{36}$/);
    fail = false;
    const retry = await onRequestPost({ request: requestFor({ ...valid, submission_id: submissionId }), env });
    assert.equal(retry.status, 303);
    assert.equal(keys[0], keys[1]);
    const edited = await onRequestPost({ request: requestFor({ ...valid, submission_id: submissionId, message: `${valid.message} One more detail.` }), env });
    assert.equal(edited.status, 303);
    assert.notEqual(keys[1], keys[2]);
  } finally { globalThis.fetch = originalFetch; }
});

test('invalid fields get a localized 400', async () => {
  const result = await onRequestPost({ request: requestFor({ ...valid, locale: 'sv', email: 'wrong' }), env });
  assert.equal(result.status, 400);
  const html = await result.text();
  assert.match(html, /Kontrollera namn/);
  assert.match(html, /name="message"[^>]*>I would like to discuss a software project\.<\/textarea>/);
});

test('control characters in a name cannot forge inquiry email fields', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('should not send'); };
  try {
    const result = await onRequestPost({ request: requestFor({ ...valid, name: 'Alice\nEmail: ceo@example.com' }), env });
    assert.equal(result.status, 400);
    assert.match(await result.text(), /name on one line/);
  } finally { globalThis.fetch = originalFetch; }
});

test('a body over 64 KB is rejected without Content-Length or delivery in the form language', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('should not send'); };
  try {
    const request = requestFor({ ...valid, locale: 'sv', extra: 'x'.repeat(70_000) });
    assert.equal(request.headers.get('content-length'), null);
    const result = await onRequestPost({ request, env });
    assert.equal(result.status, 400);
    assert.match(await result.text(), /Formuläret är för stort/);
  } finally { globalThis.fetch = originalFetch; }
});

test('a 5,000-character Swedish message is accepted despite URL encoding overhead', async () => {
  const originalFetch = globalThis.fetch;
  let deliveries = 0;
  globalThis.fetch = async () => { deliveries++; return new Response('{"id":"test"}', { status: 200 }); };
  try {
    const request = requestFor({ ...valid, locale: 'sv', message: 'å'.repeat(5_000) });
    assert.ok((await request.clone().arrayBuffer()).byteLength > 20_000);
    const result = await onRequestPost({ request, env });
    assert.equal(result.status, 303);
    assert.equal(result.headers.get('location'), '/sv/#contact-success');
    assert.equal(deliveries, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('the Content-Length fast rejection is localized from the form action', async () => {
  const request = requestFor({ ...valid, locale: 'sv' });
  request.headers.set('content-length', '64001');
  const result = await onRequestPost({ request, env });
  assert.equal(result.status, 400);
  assert.match(await result.text(), /Formuläret är för stort/);
});

test('an unreadable submission links back to the landing contact section', async () => {
  const request = new Request('https://christopherbengtsson.dev/api/contact?locale=sv', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'invalid',
  });
  const result = await onRequestPost({ request, env });
  assert.equal(result.status, 400);
  assert.match(await result.text(), /href="\/sv\/#contact"/);
});

test('multipart form data remains supported', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"id":"test"}', { status: 200 });
  try {
    const form = new FormData();
    for (const [name, value] of Object.entries(valid)) form.append(name, value);
    const request = new Request('https://christopherbengtsson.dev/api/contact', { method: 'POST', body: form });
    const result = await onRequestPost({ request, env });
    assert.equal(result.status, 303);
  } finally { globalThis.fetch = originalFetch; }
});

test('honeypot avoids delivery', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('should not send'); };
  try {
    const result = await onRequestPost({ request: requestFor({ ...valid, company_site: 'spam' }), env });
    assert.equal(result.status, 303);
  } finally { globalThis.fetch = originalFetch; }
});

test('provider failure gets a 503', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('failed', { status: 500 });
  try {
    const inquiry = { ...valid, name: 'Alex "Example"', message: 'Please review <script>alert("x")</script> & contact me.' };
    const result = await onRequestPost({ request: requestFor(inquiry), env });
    assert.equal(result.status, 503);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    const html = await result.text();
    assert.match(html, /could not be delivered/);
    assert.match(html, /<form method="post" action="\/api\/contact\?locale=en"/);
    assert.match(html, /value="Alex &quot;Example&quot;"/);
    assert.doesNotMatch(html, /name="service"/);
    assert.match(html, /Please review &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; contact me\./);
    assert.doesNotMatch(html, /<script>alert/);
    assert.doesNotMatch(html, /Return to the homepage/);
  } finally { globalThis.fetch = originalFetch; }
});

test('missing delivery credentials preserves a Swedish inquiry for retry', async () => {
  const inquiry = { ...valid, locale: 'sv', message: 'Jag vill diskutera löpande utveckling.' };
  const result = await onRequestPost({ request: requestFor(inquiry), env: {} });
  assert.equal(result.status, 503);
  const html = await result.text();
  assert.match(html, /lang="sv"/);
  assert.match(html, /action="\/api\/contact\?locale=sv"/);
  assert.doesNotMatch(html, /name="service"/);
  assert.match(html, /Jag vill diskutera löpande utveckling\.<\/textarea>/);
});
