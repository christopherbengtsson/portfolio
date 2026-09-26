export const LOCALES = ['en', 'sv'] as const;
export type Locale = (typeof LOCALES)[number];

interface PageDefinition {
  readonly id: string;
  readonly type: 'home' | 'privacy' | 'service';
  readonly paths: Readonly<Record<Locale, string>>;
  readonly published: boolean;
  readonly indexable: boolean;
}

// Keep the registry in TypeScript: Node and the hosted Pages bundler both read
// this source directly, without requiring support for JSON import attributes.
export const PAGES: readonly PageDefinition[] = [
  {
    "id": "home",
    "type": "home",
    "paths": {
      "en": "/",
      "sv": "/sv/"
    },
    "published": true,
    "indexable": true
  },
  {
    "id": "privacy",
    "type": "privacy",
    "paths": {
      "en": "/privacy/",
      "sv": "/sv/privacy/"
    },
    "published": true,
    "indexable": false
  },
  {
    "id": "app-improvements",
    "type": "service",
    "paths": {
      "en": "/services/app-improvements/",
      "sv": "/sv/tjanster/forbattra-befintlig-app/"
    },
    "published": true,
    "indexable": true
  },
  {
    "id": "api-integrations",
    "type": "service",
    "paths": {
      "en": "/services/api-integrations/",
      "sv": "/sv/tjanster/api-integrationer/"
    },
    "published": true,
    "indexable": true
  },
  {
    "id": "code-review",
    "type": "service",
    "paths": {
      "en": "/services/code-review/",
      "sv": "/sv/tjanster/kodgranskning/"
    },
    "published": true,
    "indexable": true
  }
];

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
