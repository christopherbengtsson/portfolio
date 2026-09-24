export type Locale = 'en' | 'sv';

export const origin = 'https://christopherbengtsson.dev';
export const email = 'hello@christopherbengtsson.dev';

// Keep visible identity links and Person.sameAs in sync.
export const profiles = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/christopherbengtsson-dev' },
  { name: 'GitHub', url: 'https://github.com/christopherbengtsson' },
] as const;

export function homePath(locale: Locale): string { return locale === 'sv' ? '/sv/' : '/'; }
export function privacyPath(locale: Locale): string { return locale === 'sv' ? '/sv/privacy/' : '/privacy/'; }
export function otherLocale(locale: Locale): Locale { return locale === 'en' ? 'sv' : 'en'; }
export function absolute(path: string): string { return new URL(path, origin).toString(); }
