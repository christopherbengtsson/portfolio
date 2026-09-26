import { ANALYTICS_ORIGIN } from '../../src/lib/analytics-events.ts';

import type { Env } from '../env.ts';
import type { AnalyticsEvent } from '../../src/lib/analytics-events.ts';

/** Best effort: analytics must never affect contact delivery. */
export function writeAnalytics(env: Env | undefined, request: Request, event: AnalyticsEvent) {
  if (new URL(request.url).origin !== ANALYTICS_ORIGIN || env?.ANALYTICS_ENABLED !== 'true' || !env?.SITE_ANALYTICS) return;
  try {
    env.SITE_ANALYTICS.writeDataPoint({
      indexes: [new URL(ANALYTICS_ORIGIN).hostname],
      // v1: version, event, locale, page path, target. Timestamp is supplied by Cloudflare.
      blobs: ['1', event.event, event.locale, event.path, event.target],
      doubles: [],
    });
  } catch {
    console.warn('Analytics write failed');
  }
}
