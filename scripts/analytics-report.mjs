import { pathToFileURL } from 'node:url';
import { CAPABILITY_IDS, EVENT_TARGETS } from '../src/lib/analytics-events.js';

export function parseOptions(args) {
  const options = { days: 30, locale: null };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = args[++i];
    if (flag === '--days' && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 90) options.days = Number(value);
    else if (flag === '--locale' && ['en', 'sv'].includes(value)) options.locale = value;
    else throw new Error('Usage: pnpm analytics:report [--days 1–90] [--locale en|sv]');
  }
  return options;
}

export function buildQuery({ days, locale }) {
  // Validate even when called outside the CLI; only allowlisted values enter SQL.
  parseOptions(['--days', String(days), ...(locale === null ? [] : ['--locale', locale])]);
  return `SELECT formatDateTime(timestamp, '%Y-%m-%d', 'Etc/UTC') AS day, blob2 AS event, blob3 AS locale, blob5 AS target,
SUM(_sample_interval) AS count
FROM portfolio_interactions
WHERE index1 = 'christopherbengtsson.dev' AND blob1 = '1'
AND timestamp >= NOW() - INTERVAL '${days}' DAY${locale ? ` AND blob3 = '${locale}'` : ''}
GROUP BY day, event, locale, target
ORDER BY day ASC
FORMAT JSON`;
}

export async function queryAnalytics(options, env = process.env, fetcher = fetch) {
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_ANALYTICS_READ_TOKEN;
  if (!account || !token) throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_READ_TOKEN in your environment or ignored .dev.vars file.');
  if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error('CLOUDFLARE_ACCOUNT_ID must be a 32-character account ID.');
  const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: buildQuery(options), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Analytics query failed (HTTP ${response.status}). Check the account, Account Analytics Read permission, and that the dataset has received its first event.`);
  const result = await response.json();
  if (!Array.isArray(result.data)) throw new Error('Cloudflare returned an unexpected analytics response.');
  return result.data;
}

export function renderReport(rows, { days, locale }) {
  const totals = new Map();
  const daily = new Map();
  for (const row of rows) {
    const targets = row.event === 'form_success' ? ['contact'] : EVENT_TARGETS[row.event];
    if (!targets?.includes(row.target) || !['en', 'sv'].includes(row.locale) || (locale && row.locale !== locale)) continue;
    const count = Number(row.count);
    if (!Number.isFinite(count) || count < 0) throw new Error('Invalid count in analytics response.');
    const key = `${row.event}:${row.target}:${row.locale}`;
    totals.set(key, (totals.get(key) || 0) + count);
    const day = String(row.day).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid date in analytics response.');
    daily.set(day, (daily.get(day) || 0) + count);
  }
  const sum = (event, target, language = locale) => (language ? [language] : ['en', 'sv']).reduce((n, lang) => n + (totals.get(`${event}:${target}:${lang}`) || 0), 0);
  const table = (title, headers, values) => [`## ${title}`, '', `| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...values.map((value) => `| ${value.join(' | ')} |`), ''].join('\n');
  const sections = ['# Website interactions', '', `Last ${days} days (rolling window, UTC); language: ${locale || 'all'}.`, '',
    'Counts are sampling-weighted events, not unique visitors. Browser events are counted once per target per page load. Successful submission requests are recorded separately on the server; these totals are not a visitor funnel.', '',
    ...(totals.size ? [] : ['No events in this period.', '']),
    table('Daily activity', ['Date (UTC)', 'Events'], [...daily].sort(([a], [b]) => a.localeCompare(b))),
    table('Section reach', ['Section', 'Events'], EVENT_TARGETS.section_view.map((id) => [id, sum('section_view', id)])),
    table('Capability interest', ['Capability', 'Expansions', 'EN', 'SV', 'Expansions / services reach'], CAPABILITY_IDS.map((id) => {
      const count = sum('capability_expand', id);
      const reached = sum('section_view', 'services');
      return [id, count, sum('capability_expand', id, 'en'), sum('capability_expand', id, 'sv'), reached ? `${(100 * count / reached).toFixed(1)}%` : '—'];
    })),
    table('Contact actions', ['Action', 'Events'], [
      ...EVENT_TARGETS.contact_click.map((id) => [`Contact click: ${id}`, sum('contact_click', id)]),
      ['Email click', sum('email_click', 'contact')], ['Form started', sum('form_start', 'contact')], ['Successful submission requests', sum('form_success', 'contact')],
    ]),
    table('Profile clicks', ['Profile', 'Events'], EVENT_TARGETS.profile_click.map((id) => [id, sum('profile_click', id)])),
    'Expansion percentages compare aggregate events and can be affected by blocked requests, sampling, and period boundaries. Web Analytics traffic counts are available separately in Cloudflare.',
  ];
  return sections.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseOptions(process.argv.slice(2));
    console.log(renderReport(await queryAnalytics(options), options));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
