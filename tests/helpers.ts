import assert from 'node:assert/strict';
import type { Env } from '../functions/env.ts';

/** Supply the Pages context while running handlers against Node's web APIs. */
export function inPages(handler: PagesFunction<Env>) {
  return ({ request, env = {} }: { request: Request; env?: Env }) => handler({
    // Node requests have no Cloudflare edge metadata; these handlers do not read it.
    request: request as Parameters<PagesFunction<Env>>[0]['request'],
    env: { ...env, ASSETS: { fetch: async () => { throw new Error('Unexpected asset fetch'); } } },
    functionPath: new URL(request.url).pathname,
    params: {},
    data: {},
    waitUntil: () => { throw new Error('Unexpected background work'); },
    passThroughOnException: () => { throw new Error('Unexpected pass-through'); },
    next: async () => { throw new Error('Unexpected next handler'); },
  });
}

export function analyticsCollector() {
  const points: AnalyticsEngineDataPoint[] = [];
  const env = {
    ANALYTICS_ENABLED: 'true',
    SITE_ANALYTICS: {
      writeDataPoint(point?: AnalyticsEngineDataPoint) {
        assert.ok(point);
        points.push(point);
      },
    },
  };
  return { points, env };
}

export interface EmailPayload {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
}

export function emailPayload(options?: RequestInit): EmailPayload {
  assert.equal(typeof options?.body, 'string');
  const payload: unknown = JSON.parse(options!.body as string);
  assert.ok(payload && typeof payload === 'object');
  for (const key of ['from', 'reply_to', 'subject', 'text']) {
    assert.ok(key in payload && typeof Reflect.get(payload, key) === 'string');
  }
  assert.ok('to' in payload && Array.isArray(payload.to) && payload.to.every((to: unknown) => typeof to === 'string'));
  return payload as EmailPayload;
}

export function idempotencyKey(options?: RequestInit): string {
  const key = new Headers(options?.headers).get('Idempotency-Key');
  assert.ok(key);
  return key;
}
