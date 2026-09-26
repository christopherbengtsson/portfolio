import registry from './page-registry.json' with { type: 'json' };

export const PAGES = registry;
export const LOCALES = /** @type {const} */ (['en', 'sv']);

/** @param {string} id */
export function getPage(id) {
  const page = PAGES.find((page) => page.id === id && page.published);
  if (!page) throw new Error(`Unknown published page: ${id}`);
  return page;
}

/** @param {string} id @param {'en' | 'sv'} locale */
export function pagePath(id, locale) { return getPage(id).paths[locale]; }

/** @param {unknown} path @param {unknown} locale */
export function isAnalyticsPath(path, locale) {
  return (locale === 'en' || locale === 'sv') && PAGES.some((page) =>
    page.published && page.indexable && page.paths[locale] === path);
}

/** Accept only exact, localized form pages. Never use arbitrary redirect URLs.
 * @param {unknown} path @param {'en' | 'sv'} locale
 */
export function contactPath(path, locale) {
  return PAGES.find((page) => page.published &&
    ['home', 'service'].includes(page.type) && page.paths[locale] === path)?.paths[locale]
    ?? pagePath('home', locale);
}
