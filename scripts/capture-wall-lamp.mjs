import { chromium } from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Evidence harness only: Playwright's clock controls the real shipped controller.
const out = resolve(process.env.EVIDENCE_DIR || 'docs/plans/wall-lamp-evidence');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const base = process.env.SITE_URL || 'http://127.0.0.1:4321';
const records = [];
try {
  for (const [locale, route] of [['en', '/'], ['sv', '/sv/']]) {
    for (const [size, width, height] of [['desktop', 1440, 900], ['mobile', 375, 812]]) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme });
        const page = await context.newPage();
        await page.clock.install();
        // Both illustration and palette now use the clock-controlled JS timeline.
        const shot = (options) => page.screenshot(options);
        await page.goto(`${base}${route}`);
        await page.clock.runFor(800);
        await page.locator('[data-lamp-toggle]').waitFor({ state: 'visible' });
        await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now())));
        const name = `${locale}-${size}-${theme}`;
        await shot({ path: `${out}/${name}.png` });
        await shot({ path: `${out}/${name}-full.png`, fullPage: true });
        if (locale === 'en') {
          const button = page.locator('[data-lamp-toggle]');
          const box = await button.boundingBox();
          const snap = async (pose) => {
            await shot({ path: `${out}/scene-${size}-${theme}-${pose}.png`, clip: box });
            records.push({ size, theme, pose, box, state: await button.evaluate(el => ({
              theme: document.documentElement.dataset.theme,
              on: el.getAttribute('data-lamp-on'),
              arm: el.querySelector('[data-lamp-arm]').getAttribute('d'),
              cord: el.querySelector('[data-lamp-scene="' + (matchMedia('(min-width: 1024px)').matches ? 'desktop' : 'mobile') + '"] [data-lamp-knob]').getAttribute('cy'),
              light: el.style.getPropertyValue('--lamp-light'),
            })) });
          };
          await snap('idle');
          if (size === 'desktop') {
            // Geometry source maps proximity around x=.65w,y=.65h, radius34+145.
            await page.mouse.move(box.x + box.width * .65 - 106.5, box.y + box.height * .65);
            await page.clock.runFor(800);
            await snap('half-reach');
            await page.mouse.move(box.x + 90, box.y + 49.5);
            await page.clock.runFor(800);
            await snap('full-reach');
          }
          await button.dispatchEvent('click');
          await page.clock.runFor(144);
          await snap('maximum-pull');
          await page.mouse.move(0, 400);
          await page.clock.runFor(800);
          await snap('settled');
          // Full forward pull, retreat, and repeated activation at a normal 60Hz timeline.
          await button.evaluate(el => el.blur());
          await page.mouse.move(0, 400);
          await page.clock.runFor(800);
          await button.dispatchEvent('click');
          for (let frame = 0; frame < 40; frame++) {
            await page.clock.runFor(16);
            if (frame % 2 === 0) await shot({ path: `${out}/motion-${size}-${theme}-${String(frame).padStart(2, '0')}.png`, clip: box });
          }
          if (size === 'desktop' && theme === 'light') {
            await page.mouse.move(0, 400);
            await page.clock.runFor(800);
            for (let frame = 0; frame < 110; frame++) {
              if (frame === 0) await page.mouse.move(box.x + 90, box.y + 49.5);
              if (frame === 20) await page.mouse.move(0, 400);
              if ([40, 42, 56].includes(frame)) await button.dispatchEvent('click');
              await page.clock.runFor(16);
              if (frame % 2 === 0) await shot({ path: `${out}/interaction-${String(frame).padStart(3, '0')}.png`, clip: box });
            }
          }
        }
        if (locale === 'en') {
          await page.evaluate(value => localStorage.setItem('theme', value), theme);
          await page.reload();
          await page.clock.runFor(800);
          await page.keyboard.press('Tab');
          await page.locator('[data-lamp-toggle]').focus();
          await page.clock.runFor(800);
          const header = await page.locator('.landing-header').boundingBox();
          await shot({ path: `${out}/focus-${size}-${theme}.png`, clip: { x: Math.max(0, width - 375), y: 0, width: Math.min(375, width), height: header.height + 12 } });
        }
        await context.close();
      }
    }
  }
  // Render reference canvas in the same Chromium and DPR; inject pose access in this harness only.
  const context = await browser.newContext({ viewport: { width: 1056, height: 660 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const reference = (await readFile('docs/plans/wall-lamp-reference/reference.fragment.html', 'utf8'))
    .replace('sync();new ResizeObserver', 'window.__reference={scenes,draw,state,sync};sync();new ResizeObserver');
  await page.setContent(reference);
  await page.addStyleTag({ content: 'body{margin:16px}#edge-wall-lamp .page,#edge-wall-lamp .page *{transition:none!important}.desktop .scene{width:128px!important}.mobile .scene{width:54px!important}' });
  for (const theme of ['light', 'dark']) {
    for (const size of ['desktop', 'mobile']) {
      for (const [pose, reach, press] of [['idle', 0, 0], ['half-reach', .5, 0], ['full-reach', 1, 0], ['maximum-pull', 1, 1]]) {
        await page.evaluate(({ theme, size, reach, press }) => {
          const r = window.__reference;
          r.state.themes.wall = theme === 'dark'; r.sync();
          const s = r.scenes.find(s => s.mobile === (size === 'mobile'));
          s.reach = reach; s.press = press; r.draw(s);
        }, { theme, size, reach, press });
        await page.locator(`.${size} .scene`).screenshot({ path: `${out}/reference-${size}-${theme}-${pose}.png` });
      }
    }
  }
  // Browser canvas produces aligned comparisons without adding project dependencies.
  for (const size of ['desktop', 'mobile']) for (const theme of ['light', 'dark']) {
    for (const pose of ['idle', 'full-reach']) {
      if (size === 'mobile' && pose !== 'idle') continue;
      const actual = await readFile(`${out}/scene-${size}-${theme}-${pose}.png`);
      const ref = await readFile(`${out}/reference-${size}-${theme}-${pose}.png`);
      const png = await page.evaluate(async ({ a, b }) => {
        const load = src => new Promise(resolve => { const i = new Image(); i.onload = () => resolve(i); i.src = src; });
        const [actual, reference] = await Promise.all([load(a), load(b)]);
        const c = document.createElement('canvas'); c.width = actual.width * 4; c.height = actual.height;
        const x = c.getContext('2d');
        x.drawImage(reference, 0, 0); x.drawImage(actual, actual.width, 0);
        x.drawImage(reference, actual.width * 2, 0); x.globalAlpha = .5; x.drawImage(actual, actual.width * 2, 0); x.globalAlpha = 1;
        x.drawImage(reference, actual.width * 3, 0); x.globalCompositeOperation = 'difference'; x.drawImage(actual, actual.width * 3, 0);
        return c.toDataURL('image/png').split(',')[1];
      }, { a: `data:image/png;base64,${actual.toString('base64')}`, b: `data:image/png;base64,${ref.toString('base64')}` });
      await writeFile(`${out}/compare-${size}-${theme}-${pose}.png`, Buffer.from(png, 'base64'));
    }
  }
  await writeFile(`${out}/capture-state.json`, JSON.stringify(records, null, 2) + '\n');
  await writeFile(`${out}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Wall lamp evidence</title><style>body{font:16px system-ui;margin:32px;background:#eee;color:#181818}section{margin:32px 0}img{max-width:100%;height:auto}figure{margin:16px 0}button{font:inherit;padding:10px}#motion{display:block;width:512px;image-rendering:auto;border:1px solid #888}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}.grid img{width:100%}</style><h1>Wall-lamp verification evidence</h1><p>Chromium, device scale 2. Full-size source captures are linked. See README.md and validation.log for test scope.</p><section><h2>Real-time browser recording</h2><p>Original Chromium paint frames and timestamps, without clock or CSS overrides.</p><video controls preload="metadata" style="width:768px;max-width:100%" src="realtime/interaction-realtime.mp4"></video></section><section><h2>Controlled interaction frames</h2><p>Approach, retreat, pull, coalesced repeat, second pull. Frames at 32ms intervals; 1× playback.</p><button id="play">Play interaction</button><img id="motion" src="interaction-000.png" alt="Recorded lamp interaction"><p id="status">Paused</p></section><section><h2>Reference comparisons</h2><p>Each strip: reference · actual · 50% overlay · absolute difference. Stroke-edge antialiasing can differ between canvas and SVG.</p>${['desktop','mobile'].flatMap(size=>['light','dark'].map(theme=>`<figure><figcaption>${size} ${theme} idle</figcaption><img src="compare-${size}-${theme}-idle.png"></figure>`)).join('')}</section><section><h2>Integrated pages</h2><div class="grid">${['en','sv'].flatMap(locale=>['desktop','mobile'].flatMap(size=>['light','dark'].map(theme=>`<figure><figcaption>${locale} ${size} ${theme} · <a href="${locale}-${size}-${theme}-full.png">Full page</a></figcaption><a href="${locale}-${size}-${theme}.png"><img src="${locale}-${size}-${theme}.png"></a></figure>`))).join('')}</div></section><script>let timer;const images=Array.from({length:55},(_,i)=>{const a=new Image();a.src='interaction-'+String(i*2).padStart(3,'0')+'.png';return a});document.querySelector('#play').onclick=()=>{clearInterval(timer);let i=0;document.querySelector('#status').textContent='Playing at 1×';timer=setInterval(()=>{document.querySelector('#motion').src=images[i++].src;if(i===images.length){clearInterval(timer);document.querySelector('#status').textContent='Finished'}},32)};</script></html>`);
  await context.close();
} finally { await browser.close(); }
console.log(`Saved viewport/full-page images, deterministic poses, 16ms motion frame sequences and reference overlays to ${out}`);
