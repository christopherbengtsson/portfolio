import registry from './page-registry.json' with { type: 'json' };

export const PAGES = registry;
export const LOCALES = ['en', 'sv'] as const;
export type Locale = (typeof LOCALES)[number];

export function getPage(id: string) {
  const page = PAGES.find((page) => page.id === id && page.published);
  if (!page) throw new Error(`Unknown published page: ${id}`);
  return page;
}

export function pagePath(id: string, locale: Locale): string { return getPage(id).paths[locale]; }

export function isAnalyticsPath(path: unknown, locale: unknown): boolean {
  return (locale === 'en' || locale === 'sv') && PAGES.some((page) =>
    page.published && page.indexable && page.paths[locale] === path);
}

/** Accept only exact, localized form pages. Never use arbitrary redirect URLs. */
export function contactPath(path: unknown, locale: Locale): string {
  return PAGES.find((page) => page.published &&
    ['home', 'service'].includes(page.type) && page.paths[locale] === path)?.paths[locale]
    ?? pagePath('home', locale);
}
