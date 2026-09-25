import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.env.SITE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const output = process.env.CAPABILITY_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });

async function settled(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('.landing-capability')]
    .every((card) => card.style.overflow === '' && card.getAnimations({ subtree: true }).length === 0));
}

async function assertLayout(page) {
  const layout = await page.evaluate(() => {
    const card = document.querySelector('.landing-capability[open]');
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      clipped: card && card.scrollHeight > card.clientHeight + 1,
      open: document.querySelectorAll('.landing-capability[open]').length,
    };
  });
  assert.deepEqual(layout, { overflow: false, clipped: false, open: 1 });
}

try {
  for (const [route, locale] of [['/', 'en'], ['/sv/', 'sv']]) {
    const copy = JSON.parse(await readFile(new URL(`../src/content/web/${locale}/home.json`, import.meta.url)));
    for (const width of [320, 375, 768, 1440]) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(base + route);
        const cards = page.locator('.landing-capability');
        const summaries = cards.locator('summary');
        assert.equal(await cards.count(), 4);
        assert.equal(await page.locator('.landing-capability[open]').count(), 0);
        for (let index = 0; index < 4; index++) {
          assert.deepEqual(await cards.nth(index).locator('p').allTextContents(), copy.capabilities[index].details);
          await summaries.nth(index).click();
          await settled(page);
          assert.equal(await summaries.nth(index).getAttribute('aria-expanded'), 'true');
          await assertLayout(page);
        }
        await summaries.nth(3).focus();
        await page.keyboard.press('Space');
        await settled(page);
        assert.equal(await page.locator('.landing-capability[open]').count(), 0);
        await page.keyboard.press('Enter');
        await settled(page);
        await assertLayout(page);
        assert.ok(await summaries.nth(3).evaluate((node) => node === document.activeElement));
        if (output && [375, 1440].includes(width)) {
          await summaries.nth(1).click();
          await settled(page);
          await page.locator('#services').screenshot({ path: `${output}/${locale}-${width}-${theme}.png` });
        }
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await assertLayout(page);
        assert.deepEqual(errors, []);
        await context.close();
        console.log(`${locale} ${width}px ${theme}: copy, exclusive expansion, keyboard, layout and enlarged text OK`);
      }
    }

    const native = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    const page = await native.newPage();
    await page.goto(base + route);
    assert.deepEqual(await page.locator('.landing-capability-content p').allTextContents(), copy.capabilities.flatMap((card) => card.details));
    await page.locator('.landing-capability summary').nth(0).click();
    await page.locator('.landing-capability summary').nth(1).click();
    await assertLayout(page);
    assert.ok(await page.locator('.landing-capability').nth(1).evaluate((card) => card.open));
    await native.close();
    console.log(`${locale}: native grouping and content without JavaScript OK`);
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base);
  await page.locator('.landing-capability summary').first().scrollIntoViewIfNeeded();
  const motion = await page.evaluate(async () => {
    const card = document.querySelector('.landing-capability');
    const summary = card.querySelector('summary');
    const start = card.getBoundingClientRect().height;
    summary.click();
    await new Promise((resolve) => setTimeout(resolve, 90));
    const middle = card.getBoundingClientRect().height;
    await new Promise((resolve) => setTimeout(resolve, 330));
    const end = card.getBoundingClientRect().height;
    summary.click();
    await new Promise((resolve) => setTimeout(resolve, 90));
    const closing = card.getBoundingClientRect().height;
    summary.click();
    return { start, middle, end, closing, reversed: card.getBoundingClientRect().height };
  });
  assert.ok(motion.start < motion.middle && motion.middle < motion.end, JSON.stringify(motion));
  assert.ok(motion.closing > motion.start && motion.closing < motion.end, JSON.stringify(motion));
  assert.ok(Math.abs(motion.reversed - motion.closing) < 2, 'reversal jumped: ' + JSON.stringify(motion));
  await settled(page);
  await assertLayout(page);

  await page.evaluate(() => {
    const summaries = document.querySelectorAll('.landing-capability summary');
    summaries[1].click(); summaries[2].click(); summaries[2].click(); summaries[3].click();
  });
  await settled(page);
  await assertLayout(page);
  assert.ok(await page.locator('.landing-capability').nth(3).evaluate((card) => card.open));
  await page.locator('.landing-capability summary').nth(1).evaluate((node) => node.click());
  await pause(60);
  await page.setViewportSize({ width: 375, height: 900 });
  await settled(page);
  await assertLayout(page);

  await page.locator('.landing-capability summary').nth(2).evaluate((node) => node.click());
  await pause(60);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settled(page);
  await assertLayout(page);
  const immediate = await page.evaluate(() => {
    const card = document.querySelector('.landing-capability');
    card.querySelector('summary').click();
    return { open: card.open, animations: card.getAnimations({ subtree: true }).length };
  });
  assert.deepEqual(immediate, { open: true, animations: 0 });
  await assertLayout(page);
  await context.close();
  console.log('Height interpolation, rapid reversals, switching, resize and reduced motion OK');
} finally {
  await browser.close();
}
