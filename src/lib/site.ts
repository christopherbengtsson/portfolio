export type Locale = 'en' | 'sv';

export const origin = 'https://christopherbengtsson.dev';
export const email = 'hello@christopherbengtsson.dev';

export function homePath(locale: Locale): string { return locale === 'sv' ? '/sv/' : '/'; }
export function otherLocale(locale: Locale): Locale { return locale === 'en' ? 'sv' : 'en'; }
export function absolute(path: string): string { return new URL(path, origin).toString(); }
