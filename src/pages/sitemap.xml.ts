import { absolute, homePath, otherLocale, type Locale } from '../lib/site';

export function GET() {
  const locales: Locale[] = ['en', 'sv'];
  const urls = locales.map((locale) => {
    const path = absolute(homePath(locale));
    const alternate = absolute(homePath(otherLocale(locale)));
    return `<url><loc>${path}</loc><xhtml:link rel="alternate" hreflang="${locale}" href="${path}"/><xhtml:link rel="alternate" hreflang="${otherLocale(locale)}" href="${alternate}"/></url>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
