import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.SITE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const cases = [
  ['small-mobile', 320, 700], ['mobile', 375, 812], ['tablet', 768, 1024],
  ['small-desktop', 1024, 768], ['desktop', 1440, 900], ['wide-desktop', 1920, 1080],
];
const routes = [['/', 'en', 'Dark mode'], ['/sv/', 'sv', 'Mörkt läge']];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function assertTheme(page, expected, description) {
  assert.equal(await page.locator('html').getAttribute('data-theme'), expected, description);
  assert.equal(await page.locator('html').evaluate((element) => element.style.colorScheme), expected, description + ': color-scheme');
  assert.equal(await page.locator('[data-lamp-toggle]').getAttribute('aria-pressed'), String(expected === 'dark'), description + ': pressed state');
}

async function assertLayout(page, description, width) {
  const state = await page.evaluate(() => {
    const rect = (selector) => {
      const { left, right, width, height } = document.querySelector(selector).getBoundingClientRect();
      return { left, right, width, height };
    };
    return {
      scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
      header: rect('.landing-header'), scene: rect('.landing-scene'),
      brand: rect('.landing-brand'), language: rect('.landing-language summary'),
      button: rect('[data-lamp-toggle]'),
      nav: rect('.landing-section-nav'),
      position: getComputedStyle(document.querySelector('.landing-header')).position,
    };
  });
  assert.ok(state.scroll <= state.client + 1, description + ': horizontal overflow ' + JSON.stringify(state));
  assert.equal(state.position, 'relative', description + ': header in document flow');
  assert.ok(state.scene.right <= width + 1 && state.scene.right >= width - 2, description + ': scene viewport edge ' + JSON.stringify(state));
  assert.ok(state.scene.left >= state.language.right + 4, description + ': language overlaps scene ' + JSON.stringify(state));
  assert.ok(state.scene.left >= state.brand.right + 4, description + ': brand overlaps scene ' + JSON.stringify(state));
  if (width >= 1024) assert.ok(state.scene.left >= state.nav.right + 4, description + ': navigation overlaps scene ' + JSON.stringify(state));
  assert.ok(state.button.width >= 44 && state.button.height >= 44, description + ': lamp target ' + JSON.stringify(state));
  assert.ok(state.header.height >= (width < 640 ? 60 : 72), description + ': header height ' + JSON.stringify(state));
  const usability = await page.evaluate(() => {
    const touchSelectors = '.landing-brand, .landing-section-nav a, .landing-language summary, .landing-language a, .landing-button, .landing-email, .landing-form input[name="name"], .landing-form input[name="email"], .landing-form textarea';
    const smallTargets = [...document.querySelectorAll(touchSelectors)].filter((element) => {
      if (element.getClientRects().length === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).map((element) => element.tagName.toLowerCase() + ': ' + Math.round(element.getBoundingClientRect().width) + '×' + Math.round(element.getBoundingClientRect().height));
    const textSelectors = '.landing-intro, .landing-section-head > p:last-child, .landing-capabilities p, .landing-job-description, .landing-facts dd, .landing-success, .landing-button, .landing-email, .landing-form input[name="name"], .landing-form input[name="email"], .landing-form textarea';
    const smallText = [...document.querySelectorAll(textSelectors)].filter((element) => parseFloat(getComputedStyle(element).fontSize) < 16).map((element) => element.tagName.toLowerCase() + ': ' + getComputedStyle(element).fontSize);
    return { smallTargets, smallText };
  });
  assert.deepEqual(usability, { smallTargets: [], smallText: [] }, description + ': small targets or text');
}

try {
  for (const [name, width, height] of cases) {
    for (const [route, locale, label] of routes) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light' });
      const page = await context.newPage();
      const description = name + ' ' + route;
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(base + route, { waitUntil: 'load' });
      assert.equal(await page.locator('html').getAttribute('lang'), locale, description + ': language');
      assert.equal(await page.locator('main h1').count(), 1, description + ': main heading');
      const lamp = page.locator('[data-lamp-toggle]');
      await lamp.waitFor({ state: 'visible' });
      assert.equal(await lamp.getAttribute('aria-label'), label, description + ': localized label');
      await assertTheme(page, 'light', description + ': initial light');
      await assertLayout(page, description, width);

      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), '#main', description + ': skip link');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), '#top', description + ': brand keyboard order');
      const languageSummary = page.locator('.landing-language summary');
      assert.ok((await languageSummary.boundingBox()).width < 88, description + ': language selector width');
      await languageSummary.focus();
      await page.keyboard.press('Enter');
      assert.ok(await page.locator('.landing-language details').evaluate((element) => element.open), description + ': language menu keyboard');
      assert.ok(await page.locator('.landing-language a[aria-current="page"]').isVisible(), description + ': current language shown');

      await lamp.click();
      await pause(230);
      await assertTheme(page, 'dark', description + ': click at pull');
      assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'dark', description + ': explicit preference');
      await page.reload({ waitUntil: 'load' });
      await lamp.waitFor({ state: 'visible' });
      await assertTheme(page, 'dark', description + ': reload persistence');
      await assertLayout(page, description + ' dark', width);
      const contrast = await page.evaluate(() => {
        const rgb = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const luminance = (color) => rgb(color).map((component) => {
          const value = component / 255;
          return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const body = getComputedStyle(document.body);
        return ['.landing-intro', '.landing-button', '.landing-form input[name="name"]', '.landing-language [aria-current]'].map((selector) => {
          const style = getComputedStyle(document.querySelector(selector));
          const foreground = luminance(style.color);
          const background = luminance(style.backgroundColor === 'rgba(0, 0, 0, 0)' ? body.backgroundColor : style.backgroundColor);
          return { selector, ratio: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) };
        });
      });
      assert.ok(contrast.every((entry) => entry.ratio >= 4.5), description + ': dark theme contrast ' + JSON.stringify(contrast));
      await page.locator('.landing-language summary').click();
      await page.locator('.landing-language a[href="' + (locale === 'en' ? '/sv/' : '/') + '"]').click();
      await lamp.waitFor({ state: 'visible' });
      await assertTheme(page, 'dark', description + ': language persistence');

      await page.goto(base + route + '#contact-success', { waitUntil: 'load' });
      assert.ok(await page.locator('#contact-success').isVisible(), description + ': confirmation visibility');
      assert.ok(await page.locator('#contact-success').evaluate((element) => document.activeElement === element), description + ': confirmation focus');
      assert.equal(await page.locator('.landing-capabilities li').count(), 4, description + ': capabilities');
      for (const id of ['services', 'experience', 'contact']) {
        assert.equal(await page.locator('#' + id).count(), 1, description + ': section ' + id);
      }
      assert.deepEqual(errors, [], description + ': script errors');
      console.log(description + ': layout, accessibility, theme, persistence, navigation OK');
      await page.close();
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'load' });
  await page.locator('[data-lamp-toggle]').waitFor({ state: 'visible' });
  await assertTheme(page, 'dark', 'system preference');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await assertTheme(page, 'light', 'system preference change');
  await page.locator('[data-lamp-toggle]').focus();
  await page.keyboard.press('Enter');
  await pause(230);
  await assertTheme(page, 'dark', 'keyboard Enter');
  await pause(450);
  await page.keyboard.press('Space');
  await pause(230);
  await assertTheme(page, 'light', 'keyboard Space');
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: null })));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'light' })));
  await assertTheme(page, 'light', 'external saved preference');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await assertTheme(page, 'light', 'explicit preference overrides system change');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await assertLayout(page, '200% text', 375);
  await page.locator('.landing-language summary').click();
  const zoom = await page.evaluate(() => {
    const rect = document.querySelector('.landing-language ul').getBoundingClientRect();
    return { left: rect.left, right: rect.right, client: document.documentElement.clientWidth };
  });
  assert.ok(zoom.left >= 0 && zoom.right <= zoom.client, '200% text: language menu clipped ' + JSON.stringify(zoom));
  await context.close();

  for (const width of [320, 1024]) {
    const zoomContext = await browser.newContext({ viewport: { width, height: 900 } });
    const zoomPage = await zoomContext.newPage();
    await zoomPage.goto(base, { waitUntil: 'load' });
    await zoomPage.locator('[data-lamp-toggle]').waitFor({ state: 'visible' });
    await zoomPage.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await assertLayout(zoomPage, '200% text at ' + width, width);
    await zoomContext.close();
  }

  const motionContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const motionPage = await motionContext.newPage();
  await motionPage.goto(base, { waitUntil: 'load' });
  const motionLamp = motionPage.locator('[data-lamp-toggle]');
  await motionLamp.waitFor({ state: 'visible' });
  await motionPage.mouse.move(0, 0);
  await pause(160);
  const scene = await motionLamp.boundingBox();
  await motionPage.mouse.move(scene.x + scene.width * .65, scene.y + scene.height * .65);
  await pause(250);
  const handPosition = () => motionLamp.locator('[data-lamp-arm]').evaluate(arm => {
    const { x, y } = arm.getPointAtLength(arm.getTotalLength());
    return { x, y };
  });
  const restingHand = { x: 65, y: 69 };
  const readyHand = await handPosition();
  assert.ok(Math.hypot(readyHand.x - 90, readyHand.y - 49.5) < 2, 'proximity: hand did not approach cord');
  await assertTheme(motionPage, 'light', 'proximity does not toggle');
  const connection = await motionPage.evaluate(async () => {
    const lamp = document.querySelector('[data-lamp-toggle]');
    const arm = lamp.querySelector('[data-lamp-arm]');
    const knob = lamp.querySelector('.lamp-scene-desktop [data-lamp-knob]');
    const restingCordY = Number(knob.getAttribute('cy'));
    let maxDistance = 0;
    let samples = 0;
    lamp.click();
    const started = performance.now();
    while (performance.now() - started < 430) {
      await new Promise(requestAnimationFrame);
      if (Number(knob.getAttribute('cy')) - restingCordY < .4) continue;
      const end = arm.getPointAtLength(arm.getTotalLength());
      const hand = new DOMPoint(end.x, end.y).matrixTransform(arm.getScreenCTM());
      const cord = new DOMPoint(Number(knob.getAttribute('cx')), Number(knob.getAttribute('cy'))).matrixTransform(knob.getScreenCTM());
      maxDistance = Math.max(maxDistance, Math.hypot(hand.x - cord.x, hand.y - cord.y));
      samples++;
    }
    return { maxDistance, samples };
  });
  assert.ok(connection.samples > 2 && connection.maxDistance <= 1, 'hand/cord connection during pull ' + JSON.stringify(connection));
  await motionPage.mouse.move(0, 0);
  await pause(650);
  const returnedHand = await handPosition();
  assert.ok(Math.hypot(returnedHand.x - restingHand.x, returnedHand.y - restingHand.y) < 1, 'pointer retreat: arm stayed raised');
  await assertTheme(motionPage, 'dark', 'proximity then pull');
  await motionPage.evaluate(() => {
    const lamp = document.querySelector('[data-lamp-toggle]');
    lamp.click(); lamp.click(); lamp.click();
  });
  await pause(230);
  await assertTheme(motionPage, 'light', 'rapid pre-pull coalescing');
  await motionPage.evaluate(() => document.querySelector('[data-lamp-toggle]').click());
  await pause(230);
  await assertTheme(motionPage, 'dark', 'post-pull second activation');
  await pause(650);
  const idleMutations = await motionPage.evaluate(async () => {
    const lamp = document.querySelector('[data-lamp-toggle]');
    let count = 0;
    const observer = new MutationObserver((entries) => { count += entries.length; });
    observer.observe(lamp, { attributes: true });
    await new Promise((resolve) => setTimeout(resolve, 250));
    observer.disconnect();
    return count;
  });
  assert.equal(idleMutations, 0, 'idle scene continues mutating');
  // Isolate header positioning from the site's smooth anchor scrolling.
  await motionPage.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  assert.ok(await motionPage.locator('.landing-header').evaluate((node) => node.getBoundingClientRect().bottom < 0), 'header remained sticky');
  await motionContext.close();

  const blocked = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage blocked'); } });
  });
  const blockedPage = await blocked.newPage();
  const blockedErrors = [];
  blockedPage.on('pageerror', (error) => blockedErrors.push(error.message));
  await blockedPage.goto(base, { waitUntil: 'load' });
  await blockedPage.locator('[data-lamp-toggle]').click();
  await pause(230);
  await assertTheme(blockedPage, 'dark', 'blocked storage activation');
  assert.deepEqual(blockedErrors, [], 'blocked storage script errors');
  await blocked.close();

  const firstPaint = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: 'light' });
  await firstPaint.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    requestAnimationFrame(() => {
      window.__firstFrameTheme = document.documentElement.dataset.theme;
      window.__firstFrameBackground = getComputedStyle(document.body).backgroundColor;
    });
  });
  const firstPaintPage = await firstPaint.newPage();
  await firstPaintPage.goto(base, { waitUntil: 'load' });
  await firstPaintPage.waitForFunction(() => window.__firstFrameTheme);
  const firstFrame = await firstPaintPage.evaluate(() => ({ theme: window.__firstFrameTheme, background: window.__firstFrameBackground }));
  assert.deepEqual(firstFrame, { theme: 'dark', background: 'rgb(24, 24, 24)' }, 'saved preference was not applied by first frame');
  await firstPaint.close();

  const touch = await browser.newContext({
    viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
  });
  await touch.addInitScript(() => {
    window.__layoutShifts = [];
    try {
      new PerformanceObserver((list) => window.__layoutShifts.push(...list.getEntries()))
        .observe({ type: 'layout-shift', buffered: true });
    } catch { /* Older browsers may not expose layout-shift entries. */ }
  });
  const touchPage = await touch.newPage();
  await touchPage.goto(base, { waitUntil: 'load' });
  await touchPage.locator('[data-lamp-toggle]').waitFor({ state: 'visible' });
  const beforeTap = await touchPage.evaluate(() => ({
    mark: performance.now(),
    headerHeight: document.querySelector('.landing-header').getBoundingClientRect().height,
    mainTop: document.querySelector('main').getBoundingClientRect().top,
  }));
  await touchPage.locator('[data-lamp-toggle]').tap();
  await pause(700);
  await assertTheme(touchPage, 'dark', 'touch tap');
  const afterTap = await touchPage.evaluate((mark) => ({
    headerHeight: document.querySelector('.landing-header').getBoundingClientRect().height,
    mainTop: document.querySelector('main').getBoundingClientRect().top,
    shifts: window.__layoutShifts.filter((entry) => entry.startTime >= mark && !entry.hadRecentInput)
      .reduce((sum, entry) => sum + entry.value, 0),
  }), beforeTap.mark);
  assert.equal(afterTap.headerHeight, beforeTap.headerHeight, 'touch tap shifted header');
  assert.equal(afterTap.mainTop, beforeTap.mainTop, 'touch tap shifted page content');
  assert.equal(afterTap.shifts, 0, 'touch tap caused layout shift');
  await touch.close();

  const reduced = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(base, { waitUntil: 'load' });
  await reducedPage.locator('[data-lamp-toggle]').click();
  await assertTheme(reducedPage, 'dark', 'reduced motion activation');
  await reduced.close();

  const noJS = await browser.newContext({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false, colorScheme: 'dark' });
  const noJSPage = await noJS.newPage();
  await noJSPage.goto(base, { waitUntil: 'load' });
  assert.ok(!await noJSPage.locator('[data-lamp-toggle]').isVisible(), 'no-JavaScript control hidden');
  assert.equal(await noJSPage.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(24, 24, 24)', 'no-JavaScript system palette');
  await noJS.close();
  console.log('System preference, keyboard, proximity, pull, rapid clicks, touch, reduced motion, 200% text, storage, first frame, and no-JavaScript OK');
} finally {
  await browser.close();
}
