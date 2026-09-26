import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, LOCALES, pagePath, getPage, isAnalyticsPath, contactPath } from '../src/lib/page-registry.ts';

test('rejecting an analytics path preserves its possible string type', () => {
  function rejectedPath(path: string | undefined) {
    if (!isAnalyticsPath(path, 'en')) return path;
    return undefined;
  }

  // A false result may still be a string. An incorrect type predicate would
  // infer only undefined here and make this assignment fail type checking.
  const rejected: ReturnType<typeof rejectedPath> = '/unknown/';
  assert.equal(rejectedPath(rejected), rejected);
  assert.equal(rejectedPath('/sv/'), '/sv/');
  assert.equal(rejectedPath(undefined), undefined);
  assert.equal(rejectedPath('/'), undefined);
});

test('published routes have unique localized paths and stable page identities', () => {
  assert.equal(new Set(PAGES.map((p) => p.id)).size, PAGES.length);
  const paths = PAGES.flatMap((p) => LOCALES.map((locale) => p.paths[locale]));
  assert.equal(new Set(paths).size, 10);
  for (const page of PAGES) {
    for (const locale of LOCALES) {
      const path = pagePath(page.id, locale);
      assert.match(path, /^\/(?:[a-z0-9-]+\/)*$/);
      assert.equal(path.startsWith('/sv/'), locale === 'sv');
      assert.equal(isAnalyticsPath(path, locale), page.indexable);
      assert.equal(isAnalyticsPath(path, locale === 'en' ? 'sv' : 'en'), false);
      assert.equal(contactPath(path, locale), ['home', 'service'].includes(page.type) ? path : pagePath('home', locale));
    }
  }
  assert.throws(() => getPage('unpublished-draft'));
});

test('untrusted or non-form paths cannot become redirect destinations', () => {
  for (const locale of LOCALES) {
    for (const path of [null, {}, '/privacy/', '/sv/privacy/', '//example.org/', 'https://example.org/', '/services/api-integrations/?token=secret', '/services/api-integrations/#fragment', '/services/../', '/services/api-integrations/\r\nLocation: https://example.org', '/unknown/']) {
      assert.equal(contactPath(path, locale), pagePath('home', locale));
    }
  }
});


test('removed work routes have no published page, analytics path or contact destination', () => {
  for (const id of ['kyc-salesforce-integration', 'change-request-portal']) assert.throws(() => getPage(id));
  for (const [locale, path] of [
    ['en', '/work/kyc-salesforce-integration/'],
    ['en', '/work/change-request-portal/'],
    ['sv', '/sv/projekt/kyc-salesforce-integration/'],
    ['sv', '/sv/projekt/portal-for-andringsarenden/'],
  ] as const) {
    assert.equal(isAnalyticsPath(path, locale), false);
    assert.equal(contactPath(path, locale), pagePath('home', locale));
  }
});
