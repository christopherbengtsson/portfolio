import { absolute } from '../lib/site';
import { PAGES, LOCALES } from '../lib/page-registry.ts';

export function GET() {
  const urls = PAGES.filter((page) => page.published && page.indexable).flatMap((page) => LOCALES.map((locale) => {
    const alternates = LOCALES.map((language) => `<xhtml:link rel="alternate" hreflang="${language}" href="${absolute(page.paths[language])}"/>`).join('');
    return `<url><loc>${absolute(page.paths[locale])}</loc>${alternates}</url>`;
  }));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
