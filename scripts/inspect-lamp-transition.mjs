import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.SITE_URL ?? 'http://127.0.0.1:4321';
const output = resolve(process.env.TRANSITION_AUDIT_DIR ?? '/tmp/wall-lamp-consistent-transition');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const trace = { browser: 'Chrome', method: 'in-page requestAnimationFrame and MutationObserver', directions: [] };

const progress = (value, before, after) => (value - before) / (after - before);
const nearest = (samples, at) => samples.reduce((best, sample) =>
  Math.abs(sample.ms - at) < Math.abs(best.ms - at) ? sample : best);
const close = (value, expected, tolerance) => Math.abs(value - expected) <= tolerance;

try {
  for (const initial of ['light', 'dark']) {
    const target = initial === 'light' ? 'dark' : 'light';
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: initial,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(base + '#contact-success', { waitUntil: 'load' });
    await page.locator('[data-lamp-toggle]').waitFor({ state: 'visible' });
    await page.evaluate(async () => {
      document.querySelector('.landing-language details').open = true;
      document.querySelector('.landing-form input[name="name"]').focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    const record = await page.evaluate(async () => {
      const html = document.documentElement;
      const lamp = document.querySelector('[data-lamp-toggle]');
      const glow = lamp.querySelector('.lamp-scene-desktop [data-lamp-glow]');
      const rim = lamp.querySelector('.lamp-scene-desktop .lamp-rim');
      const interior = lamp.querySelector('.lamp-scene-desktop [data-lamp-interior]');
      const knob = lamp.querySelector('.lamp-scene-desktop [data-lamp-knob]');
      const restingCordY = Number(knob.getAttribute('cy'));
      if (!interior) throw new Error('Lamp interior cue missing from desktop SVG');
      const selectors = {
        brand: '.landing-brand', availability: '.landing-availability',
        nav: '.landing-section-nav a', languageSummary: '.landing-language summary',
        menu: '.landing-language a:not([aria-current])',
        menuCurrent: '.landing-language [aria-current]', kicker: '.landing-kicker',
        heading: '.landing-hero h1', intro: '.landing-intro',
        action: '.landing-actions .landing-button:not(.landing-button-secondary)',
        secondaryAction: '.landing-button-secondary', facts: '.landing-facts dt',
        services: '.landing-capabilities p', jobs: '.landing-job-description',
        tags: '.landing-tags li', email: '.landing-email', formLabel: '.landing-form label',
        field: '.landing-form input[name="name"]', formButton: '.landing-form button',
        success: '.landing-success',
        footer: '.landing-footer',
      };
      const parseColor = (value) => {
        const components = (value.match(/[\d.]+/g) ?? []).map(Number);
        return [components[0] ?? 0, components[1] ?? 0, components[2] ?? 0, components[3] ?? 1];
      };
      const background = (element) => {
        const chain = [];
        for (let node = element; node; node = node.parentElement) chain.push(node);
        let color = [255, 255, 255];
        for (const node of chain.reverse()) {
          const [r, g, b, alpha] = parseColor(getComputedStyle(node).backgroundColor);
          color = [r, g, b].map((channel, index) => channel * alpha + color[index] * (1 - alpha));
        }
        return color;
      };
      const luminance = (channels) => channels.slice(0, 3).map((channel) => {
        const linear = channel / 255;
        return linear <= .04045 ? linear / 12.92 : ((linear + .055) / 1.055) ** 2.4;
      }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      const contrast = (foreground, surface) => {
        const a = luminance(foreground);
        const b = luminance(surface);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      };
      const contrastState = () => {
        const values = Object.entries(selectors).map(([name, selector]) => {
          const element = document.querySelector(selector);
          return [name, contrast(parseColor(getComputedStyle(element).color), background(element))];
        });
        for (const [name, selector, pseudo, property] of [
          ['availabilityDot', '.landing-availability', '::before', 'color'],
          ['jobDot', '.landing-job-period', '::before', 'backgroundColor'],
          ['placeholder', '.landing-form textarea', '::placeholder', 'color'],
        ]) {
          const element = document.querySelector(selector);
          values.push([name, contrast(parseColor(getComputedStyle(element, pseudo)[property]), background(element))]);
        }
        const focusedField = document.querySelector('.landing-form input[name="name"]');
        if (focusedField.matches(':focus-visible')) {
          values.push(['focusOutline', contrast(parseColor(getComputedStyle(focusedField).outlineColor), background(document.body))]);
        }
        return Object.fromEntries(values);
      };
      const read = () => ({
        theme: html.dataset.theme,
        colorScheme: html.style.colorScheme,
        pressed: lamp.getAttribute('aria-pressed'),
        on: lamp.dataset.lampOn,
        pull: (Number(knob.getAttribute('cy')) - restingCordY) / 4,
        body: Number(getComputedStyle(document.body).backgroundColor.match(/[\d.]+/)[0]),
        glow: Number(getComputedStyle(glow).opacity),
        rim: Number(getComputedStyle(rim).opacity),
        interior: getComputedStyle(interior).fill,
        contrast: contrastState(),
        colors: {
          brand: getComputedStyle(document.querySelector('.landing-brand')).color,
          intro: getComputedStyle(document.querySelector('.landing-intro')).color,
          email: getComputedStyle(document.querySelector('.landing-email')).color,
          field: getComputedStyle(document.querySelector('.landing-form input[name="name"]')).color,
          placeholder: getComputedStyle(document.querySelector('.landing-form textarea'), '::placeholder').color,
          footer: getComputedStyle(document.querySelector('.landing-footer')).color,
        },
      });
      const initialState = read();
      const samples = [];
      let committed;
      let clickAt;
      const observer = new MutationObserver(() => {
        if (!committed && html.dataset.theme !== initialState.theme) {
          committed = { at: performance.now(), ...read() };
        }
      });
      observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Theme did not commit')), 5000);
        const tick = () => {
          const now = performance.now();
          const state = read();
          samples.push({ ms: committed ? now - committed.at : null, clickMs: now - clickAt, ...state });
          if (committed && now - committed.at >= 520) {
            clearTimeout(timeout);
            resolve({ initial: initialState, commit: committed, clickToCommit: committed.at - clickAt, samples });
          } else {
            requestAnimationFrame(tick);
          }
        };
        clickAt = performance.now();
        lamp.click();
        requestAnimationFrame(tick);
      });
      observer.disconnect();
      return result;
    });

    assert.equal(record.initial.theme, initial, initial + ': initial theme');
    assert.equal(record.commit.theme, target, initial + ': logical theme at pull');
    assert.equal(record.commit.pressed, String(target === 'dark'), initial + ': accessible state at pull');
    assert.equal(record.commit.on, String(target === 'light'), initial + ': lamp power at pull');
    assert.ok(record.commit.pull > .9, initial + ': cord not at bottom pull');
    assert.ok(record.clickToCommit >= 115 && record.clickToCommit <= 185, initial + ': pull timing ' + record.clickToCommit);
    for (const sample of [record.initial, record.commit, ...record.samples]) {
      for (const [name, ratio] of Object.entries(sample.contrast)) {
        assert.ok(ratio >= 4.5, initial + ': unreadable ' + name + ' at ' + sample.ms + 'ms (' + ratio + ':1)');
      }
    }

    const oldBody = initial === 'light' ? 255 : 24;
    const newBody = target === 'light' ? 255 : 24;
    const oldLight = initial === 'light' ? 1 : 0;
    const newLight = target === 'light' ? 1 : 0;
    const pageAt = (sample) => progress(sample.body, oldBody, newBody);
    const glowAt = (sample) => progress(sample.glow, oldLight, newLight);
    const rimAt = (sample) => progress(sample.rim, oldLight * .5, newLight * .5);
    assert.ok(close(pageAt(record.commit), 0, .03), initial + ': page changed at commit');
    assert.ok(close(glowAt(record.commit), 0, .05), initial + ': glow changed before delay');
    assert.ok(close(rimAt(record.commit), 0, .05), initial + ': rim changed before delay');
    assert.equal(record.commit.interior, target === 'light' ? 'rgb(233, 233, 233)' : 'none', initial + ': interior did not switch at power commit');
    const samples = record.samples.filter((sample) => sample.ms !== null);
    const checkpoints = [0, 20, 60, 120, 460].map((at) => {
      const sample = nearest(samples, at);
      assert.ok(Math.abs(sample.ms - at) <= 20, initial + ': missed timeline checkpoint ' + at + 'ms');
      return {
        requestedMs: at, actualMs: Number(sample.ms.toFixed(2)),
        theme: sample.theme, on: sample.on, pull: sample.pull,
        body: sample.body, glow: sample.glow, rim: sample.rim, interior: sample.interior,
        pageProgress: pageAt(sample), glowProgress: glowAt(sample), rimProgress: rimAt(sample),
      };
    });
    const at20 = checkpoints[1];
    const at60 = checkpoints[2];
    const at120 = checkpoints[3];
    const at460 = checkpoints[4];
    assert.ok(at20.pageProgress <= .05, initial + ': page began before +60ms');
    assert.ok(at20.glowProgress <= .3 && at20.rimProgress <= .3, initial + ': rim/glow began before +20ms');
    assert.ok(at60.pageProgress <= .1, initial + ': page advanced during delay');
    assert.ok(at60.glowProgress > .1 && at60.rimProgress > .1, initial + ': lamp light did not lead page');
    assert.ok(at120.pageProgress > .03 && at120.pageProgress < .5, initial + ': page fade not underway at +120ms');
    assert.ok(at120.glowProgress >= .85 && at120.rimProgress >= .85, initial + ': lamp light not settled by +120ms');
    assert.ok(at460.pageProgress >= .95, initial + ': page fade not settled at +460ms');
    const firstGlow = samples.find((sample) => glowAt(sample) > .05);
    const firstPage = samples.find((sample) => pageAt(sample) > .02);
    assert.ok(firstGlow && firstPage && firstGlow.ms < firstPage.ms, initial + ': page began before lamp illumination');
    await page.waitForTimeout(550);
    const lateColors = await page.evaluate(() => ({
      brand: getComputedStyle(document.querySelector('.landing-brand')).color,
      intro: getComputedStyle(document.querySelector('.landing-intro')).color,
      email: getComputedStyle(document.querySelector('.landing-email')).color,
      field: getComputedStyle(document.querySelector('.landing-form input[name="name"]')).color,
      placeholder: getComputedStyle(document.querySelector('.landing-form textarea'), '::placeholder').color,
      footer: getComputedStyle(document.querySelector('.landing-footer')).color,
    }));
    assert.deepEqual(lateColors, samples.at(-1).colors, initial + ': descendant colors restarted after page completion');
    trace.directions.push({
      direction: initial + ' to ' + target,
      clickToCommitMs: Number(record.clickToCommit.toFixed(2)),
      initial: record.initial,
      commit: record.commit,
      checkpoints,
      firstGlowMs: Number(firstGlow.ms.toFixed(2)),
      firstPageMs: Number(firstPage.ms.toFixed(2)),
      samples,
    });
    console.log(initial + ' → ' + target + ': power at pull, lamp light first, page +60ms/400ms OK');
    await context.close();
  }

  const rapid = await browser.newContext({
    viewport: { width: 1440, height: 900 }, colorScheme: 'light',
  });
  const rapidPage = await rapid.newPage();
  await rapidPage.goto(base, { waitUntil: 'load' });
  await rapidPage.locator('[data-lamp-toggle]').waitFor({ state: 'visible' });
  const rapidState = await rapidPage.evaluate(async () => {
    const lamp = document.querySelector('[data-lamp-toggle]');
    const glow = lamp.querySelector('.lamp-scene-desktop [data-lamp-glow]');
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const read = () => ({
      theme: document.documentElement.dataset.theme,
      on: lamp.dataset.lampOn,
      glow: Number(getComputedStyle(glow).opacity),
      body: getComputedStyle(document.body).backgroundColor,
    });
    lamp.click();
    await wait(180);
    const first = read();
    lamp.click();
    await wait(70);
    const duringNextReach = read();
    await wait(100);
    const second = read();
    await wait(510);
    return { first, duringNextReach, second, settled: read() };
  });
  assert.equal(rapidState.first.theme, 'dark', 'rapid: first logical commit');
  assert.equal(rapidState.duringNextReach.theme, 'dark', 'rapid: second activation changed theme before pull');
  assert.ok(rapidState.duringNextReach.glow < rapidState.first.glow - .1, 'rapid: first illumination froze during second reach');
  assert.equal(rapidState.second.theme, 'light', 'rapid: second logical commit');
  assert.equal(rapidState.second.on, 'true', 'rapid: second lamp power');
  assert.equal(rapidState.settled.glow, 1, 'rapid: glow did not finish lit');
  assert.equal(rapidState.settled.body, 'rgb(255, 255, 255)', 'rapid: palette did not return to light');
  trace.rapid = rapidState;
  console.log('Rapid second activation: first light fade continues during reach; final state settles');
  await rapid.close();

  const reduced = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
    colorScheme: 'light',
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(base, { waitUntil: 'load' });
  await reducedPage.locator('[data-lamp-toggle]').waitFor({ state: 'visible' });
  const reducedState = await reducedPage.evaluate(() => {
    const lamp = document.querySelector('[data-lamp-toggle]');
    const before = getComputedStyle(document.body).backgroundColor;
    lamp.click();
    return {
      before,
      after: getComputedStyle(document.body).backgroundColor,
      theme: document.documentElement.dataset.theme,
      on: lamp.dataset.lampOn,
      glow: getComputedStyle(lamp.querySelector('.lamp-scene-mobile [data-lamp-glow]')).opacity,
      duration: getComputedStyle(document.body).transitionDuration,
    };
  });
  assert.equal(reducedState.theme, 'dark', 'reduced motion logical state');
  assert.equal(reducedState.on, 'false', 'reduced motion lamp power');
  assert.equal(reducedState.after, 'rgb(24, 24, 24)', 'reduced motion palette should switch immediately');
  assert.equal(reducedState.glow, '0', 'reduced motion glow should switch immediately');
  assert.equal(reducedState.duration, '0s', 'reduced motion should remove page transition');
  trace.reducedMotion = reducedState;
  await reduced.close();
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'timing-trace.json'), JSON.stringify(trace, null, 2) + '\n');
  console.log('Reduced motion immediate; timing trace written');
} finally {
  await browser.close();
}
