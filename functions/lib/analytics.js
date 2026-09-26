import { ANALYTICS_ORIGIN } from '../../src/lib/analytics-events.js';

/** Best effort: analytics must never affect contact delivery. */
export function writeAnalytics(env, request, event) {
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
