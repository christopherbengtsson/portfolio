import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

// Native browser typesetting matches the site's system-ui font, 650 weight,
// tight heading tracking, square geometry, and neutral palette. No AI lettering.
// Set CHROME_BIN on machines without Chrome in the standard macOS location.
const root = new URL('../', import.meta.url);
const output = new URL('public/', root);
const review = new URL('artwork/previews/', root);
await mkdir(review, { recursive: true });
const monogram = await readFile(new URL('artwork/monogram.svg', root), 'utf8');
const copy = {
  en: 'Software engineering consultancy',
  sv: 'Konsult inom systemutveckling',
};
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const frames = [];
  for (const size of [16, 32, 48, 96, 180]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:100%;height:100%}</style>${monogram}`);
    const png = await page.screenshot({ type: 'png' });
    if (size <= 48) {
      frames.push({ size, png });
      await writeFile(new URL(`favicon-${size}.png`, review), png);
    } else {
      await writeFile(new URL(size === 96 ? 'favicon.png' : 'apple-touch-icon.png', output), png);
    }
  }

  // ICO directory with three independently rasterized PNG frames (32-bit RGBA).
  // Rendering each SVG at its target size avoids repeated downsampling.
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile(new URL('favicon.ico', output), Buffer.concat([header, ...frames.map(({ png }) => png)]));

  for (const [locale, subtitle] of Object.entries(copy)) {
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.setContent(`<!doctype html><html lang="${locale}"><meta charset="utf-8">
      <style>
        *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px}
        body{background:#fff;color:#181818;font-family:system-ui,sans-serif;padding:88px 96px}
        svg{display:block;width:96px;height:96px}
        .rule{height:1px;background:#d7d7d7;margin:44px 0 48px}
        h1{margin:0;font-size:72px;font-weight:650;line-height:1.06;letter-spacing:-.03em;white-space:nowrap}
        p{margin:28px 0 0;color:#626262;font-size:40px;line-height:1.5;white-space:nowrap}
      </style>${monogram}<div class="rule"></div><h1>Christopher Bengtsson</h1><p>${subtitle}</p></html>`);
    await page.evaluate(() => document.fonts.ready);
    const bounds = await page.evaluate(() => ['h1', 'p'].map((selector) => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(selector));
      const { x, y, right, bottom } = range.getBoundingClientRect();
      return { selector, x, y, right, bottom };
    }));
    assert.ok(bounds.every(({ x, y, right, bottom }) => x >= 96 && y >= 88 && right <= 1104 && bottom <= 542),
      `${locale}: text exceeds safe margins: ${JSON.stringify(bounds)}`);
    await page.screenshot({ path: fileURLToPath(new URL(`og-${locale}.png`, output)) });
    console.log(`${locale}: typography fits 96px side / 88px vertical safe margins`, bounds);
  }

  // A local review sheet: actual-size ICO frames on both browser palettes,
  // enlarged nearest-neighbor 16px samples, and 400px-wide social thumbnails.
  const data = async (url) => `data:image/png;base64,${(await readFile(url)).toString('base64')}`;
  const samples = await Promise.all(frames.map(async ({ size }) => `<figure><img width="${size}" height="${size}" src="${await data(new URL(`favicon-${size}.png`, review))}"><figcaption>${size} × ${size}</figcaption></figure>`));
  const tiny = await data(new URL('favicon-16.png', review));
  const touch = await data(new URL('apple-touch-icon.png', output));
  const cards = await Promise.all(Object.keys(copy).map(async (locale) => `<figure><img width="400" height="210" src="${await data(new URL(`og-${locale}.png`, output))}"><figcaption>${locale.toUpperCase()} · 400 × 210 thumbnail</figcaption></figure>`));
  const sheet = `<!doctype html><html lang="en"><meta charset="utf-8"><title>CB identity — local review</title><style>
    *{box-sizing:border-box}body{margin:0;padding:32px;background:#ededed;color:#181818;font:14px system-ui,sans-serif}
    h1{font-size:24px;letter-spacing:-.03em;margin:0 0 24px}h2{font-size:14px;margin:0 0 16px;font-weight:500}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.panel{padding:24px;background:#fff;border:1px solid #d7d7d7}
    .dark{background:#181818;color:#f8f8f8;border-color:#444}.samples{display:flex;align-items:center;gap:32px;height:100px}
    figure{margin:0}figcaption{margin-top:12px;font-size:12px;color:inherit}img{display:block}.zoom{image-rendering:pixelated}
    .details{display:flex;align-items:center;gap:48px;margin:24px 0}.cards{display:flex;gap:24px}.cards img{border:1px solid #d7d7d7}
  </style><h1>Christopher Bengtsson · visual identity</h1><div class="grid">
    <section class="panel"><h2>Light browser chrome · actual pixel sizes</h2><div class="samples">${samples.join('')}</div></section>
    <section class="panel dark"><h2>Dark browser chrome · actual pixel sizes</h2><div class="samples">${samples.join('')}</div></section>
    </div><div class="details"><figure><img width="180" height="180" src="${touch}"><figcaption>Apple touch icon · 180 × 180</figcaption></figure>
    <figure><img class="zoom" width="128" height="128" src="${tiny}"><figcaption>16px favicon · 8× pixel inspection</figcaption></figure></div>
    <div class="cards">${cards.join('')}</div></html>`;
  await writeFile(new URL('index.html', review), sheet);
  await page.setViewportSize({ width: 912, height: 800 });
  await page.setContent(sheet);
  await page.screenshot({ path: fileURLToPath(new URL('identity.png', review)) });
} finally {
  await browser.close();
}
console.log('Generated all five public assets and artwork/previews/ review sheet.');
