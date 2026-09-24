const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;

if (!token || !zoneId) {
  console.error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to check the contact rate limit.');
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/rulesets/phases/http_ratelimit/entrypoint`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(`Cloudflare API returned ${response.status}; check the zone ID and token permissions.`);
    }

    const matchingRules = (result.result?.rules ?? []).filter((rule) =>
      rule.enabled !== false &&
      rule.action === 'block' &&
      rule.expression?.replace(/[()]/g, '').trim() === 'http.request.uri.path eq "/api/contact"' &&
      rule.ratelimit?.characteristics?.includes('ip.src') &&
      rule.ratelimit?.period === 10 &&
      rule.ratelimit?.requests_per_period === 5 &&
      rule.ratelimit?.mitigation_timeout === 10
    );

    if (matchingRules.length !== 1) {
      throw new Error('Expected one enabled Free-plan rule blocking /api/contact after 5 requests per IP per 10 seconds, with a 10-second mitigation period.');
    }
    console.log('Contact rate-limit rule is configured in the Cloudflare zone.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
