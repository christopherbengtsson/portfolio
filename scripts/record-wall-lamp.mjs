import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// Real browser paint frames, with original timestamps. No clock or CSS overrides.
const out = resolve(process.env.EVIDENCE_DIR || 'docs/plans/wall-lamp-evidence', 'realtime');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4321');
  const lamp = page.locator('[data-lamp-toggle]');
  await lamp.waitFor({ state: 'visible' });
  const box = await lamp.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const frames = [], pending = [];
  let recording = true;
  cdp.on('Page.screencastFrame', event => {
    if (!recording) return;
    const file = `frame-${String(frames.length).padStart(4, '0')}.png`;
    frames.push({ file, timestamp: event.metadata.timestamp });
    pending.push(writeFile(`${out}/${file}`, Buffer.from(event.data, 'base64')));
    pending.push(cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }));
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await page.waitForTimeout(150);
  await page.mouse.move(box.x + 90, box.y + 49.5);
  await page.waitForTimeout(350);
  await page.mouse.move(0, 400);
  await page.waitForTimeout(350);
  await lamp.dispatchEvent('click');
  await page.waitForTimeout(30);
  await lamp.dispatchEvent('click');
  await page.waitForTimeout(700);
  await lamp.dispatchEvent('click');
  await page.waitForTimeout(750);
  recording = false;
  await cdp.send('Page.stopScreencast');
  await Promise.all(pending);
  await writeFile(`${out}/frames.json`, JSON.stringify(frames, null, 2) + '\n');
  const concat = frames.map((frame, index) => `file '${frame.file}'\nduration ${index + 1 < frames.length ? Math.max(.001, frames[index + 1].timestamp - frame.timestamp).toFixed(6) : '0.5'}`).join('\n');
  await writeFile(`${out}/frames.txt`, concat + `\nfile '${frames.at(-1).file}'\n`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${out}/frames.txt`, '-vf', `crop=128:72:${box.x}:${Math.max(0, box.y)},scale=768:432:flags=lanczos`, '-fps_mode', 'vfr', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', `${out}/interaction-realtime.mp4`]);
  console.log(`Saved ${frames.length} actual browser paint frames and timestamp-preserving real-time video to ${out}`);
} finally { await browser.close(); }
