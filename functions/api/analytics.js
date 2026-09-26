import { ANALYTICS_ORIGIN, validBrowserEvent } from '../../src/lib/analytics-events.js';
import { writeAnalytics } from '../lib/analytics.js';

const MAX_BYTES = 1024;
const reply = (status) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
  if (new URL(request.url).origin !== ANALYTICS_ORIGIN) return reply(204);
  if (request.headers.get('origin') !== ANALYTICS_ORIGIN) return reply(403);
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return reply(403);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return reply(415);
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return reply(413);
  const reader = request.body?.getReader();
  if (!reader) return reply(400);
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return reply(413);
      }
      chunks.push(value);
    }
    const event = JSON.parse(await new Blob(chunks).text());
    if (!validBrowserEvent(event)) return reply(400);
    writeAnalytics(env, request, event);
    return reply(204);
  } catch {
    return reply(400);
  }
}
