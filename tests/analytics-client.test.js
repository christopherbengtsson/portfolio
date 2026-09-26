import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as events from "../src/lib/analytics-events.js";

function loadModule(path, globals, imports) {
  const code = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (id) => {
      if (!imports[id]) throw new Error(`Unexpected import ${id}`);
      return imports[id];
    },
    ...globals,
  });
  return exports;
}

class Element extends EventTarget {
  constructor() {
    super();
    this.dataset = {};
  }
  closest() {
    return this;
  }
}
class Input extends Element {}
class Textarea extends Element {}

function client({
  origin = events.ANALYTICS_ORIGIN,
  path = "/",
  locale = "en",
  beaconResult = true,
  beaconThrows = false,
} = {}) {
  const document = new EventTarget();
  const form = new Element();
  const headings = ["services", "experience", "contact"].map((id) =>
    Object.assign(new Element(), { id }),
  );
  document.documentElement = { lang: locale };
  document.querySelector = () => form;
  document.querySelectorAll = () => headings;
  const bodies = [],
    fallback = [],
    observers = [];
  class Observer {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    unobserve() {}
  }
  const api = loadModule(
    "../src/util/AnalyticsUtil.ts",
    {
      document,
      location: { origin, pathname: path },
      navigator: {
        sendBeacon: (_url, body) => {
          if (beaconThrows) throw new Error("blocked");
          if (beaconResult) bodies.push(body);
          return beaconResult;
        },
      },
      fetch: (_url, options) => {
        fallback.push(options);
        return Promise.reject(new Error("offline"));
      },
      Blob,
      Element,
      HTMLInputElement: Input,
      HTMLTextAreaElement: Textarea,
      window: { IntersectionObserver: Observer },
      IntersectionObserver: Observer,
    },
    { "../lib/analytics-events.js": events },
  );
  return { api, form, document, headings, observers, bodies, fallback };
}

test("client deduplicates each target in memory and separates languages", async () => {
  for (const locale of ["en", "sv"]) {
    const { api, bodies } = client({
      locale,
      path: locale === "sv" ? "/sv/" : "/",
    });
    for (const id of events.CAPABILITY_IDS) {
      const card = { dataset: { capabilityId: id } };
      api.AnalyticsUtil.trackCapabilityExpansion(card);
      api.AnalyticsUtil.trackCapabilityExpansion(card);
    }
    const payloads = await Promise.all(
      bodies.map(async (body) => JSON.parse(await body.text())),
    );
    assert.equal(payloads.length, 5);
    assert.equal(payloads[0].event, "section_view");
    assert.ok(
      payloads.every(
        (payload) =>
          payload.locale === locale && Object.keys(payload).length === 4,
      ),
    );
  }
});

test("client ignores local, preview, privacy paths and invalid targets", () => {
  for (const options of [
    { origin: "http://localhost:4321" },
    { origin: "https://test.portfolio-33y.pages.dev" },
    { path: "/privacy/" },
  ]) {
    const { api, bodies, observers } = client(options);
    api.AnalyticsUtil.initAnalytics();
    api.AnalyticsUtil.trackInteraction("section_view", "services");
    assert.equal(bodies.length, 0);
    assert.equal(observers.length, 0);
  }
  const { api, bodies } = client();
  api.AnalyticsUtil.trackInteraction("capability_expand", "private text");
  api.AnalyticsUtil.trackInteraction("form_success", "contact");
  assert.equal(bodies.length, 0);
});

test("client uses keepalive fallback only when a beacon cannot be queued, without retries", async () => {
  for (const options of [{ beaconResult: false }, { beaconThrows: true }]) {
    const { api, fallback } = client(options);
    api.AnalyticsUtil.trackInteraction("email_click", "contact");
    api.AnalyticsUtil.trackInteraction("email_click", "contact");
    await Promise.resolve();
    assert.equal(fallback.length, 1);
    assert.equal(fallback[0].keepalive, true);
  }
});

test("section threshold, click placements, form starts and initialization are deduplicated", async () => {
  const { api, bodies, document, form, headings, observers } = client();
  api.AnalyticsUtil.initAnalytics();
  api.AnalyticsUtil.initAnalytics();
  assert.equal(observers.length, 1);
  observers[0].callback([
    { target: headings[0], isIntersecting: true, intersectionRatio: 0.49 },
  ]);
  assert.equal(bodies.length, 0);
  observers[0].callback([
    { target: headings[0], isIntersecting: true, intersectionRatio: 0.5 },
  ]);
  const dispatch = (owner, type, target) => {
    const event = new Event(type);
    Object.defineProperty(event, "target", { value: target });
    owner.dispatchEvent(event);
  };
  for (const [event, targets] of Object.entries(events.EVENT_TARGETS)) {
    if (!["contact_click", "email_click", "profile_click"].includes(event))
      continue;
    for (const target of targets) {
      const link = new Element();
      link.dataset = { analyticsEvent: event, analyticsTarget: target };
      dispatch(document, "click", link);
      dispatch(document, "click", link);
    }
  }
  const hidden = new Input();
  hidden.name = "company_site";
  hidden.value = "private";
  dispatch(form, "input", hidden);
  const input = new Textarea();
  input.name = "message";
  input.value = "Sensitive text must not be collected";
  dispatch(form, "input", input);
  dispatch(form, "input", input);
  const payloads = await Promise.all(
    bodies.map(async (body) => JSON.parse(await body.text())),
  );
  assert.equal(payloads.filter((p) => p.event === "form_start").length, 1);
  assert.equal(payloads.filter((p) => p.event === "contact_click").length, 3);
  assert.equal(payloads.filter((p) => p.event === "profile_click").length, 2);
  assert.ok(!JSON.stringify(payloads).includes("Sensitive"));
});

test("middle-button profile activation counts once and right-click does not count", async () => {
  const { api, document, bodies } = client();
  api.AnalyticsUtil.initAnalytics();
  const link = new Element();
  link.dataset = { analyticsEvent: "profile_click", analyticsTarget: "github" };
  for (const button of [2, 1, 1]) {
    const event = new Event("auxclick", { cancelable: true });
    Object.defineProperties(event, {
      target: { value: link },
      button: { value: button },
    });
    document.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    if (button === 2) assert.equal(bodies.length, 0);
  }
  assert.equal(bodies.length, 1);
  assert.equal(JSON.parse(await bodies[0].text()).target, "github");
});

function motion({ reduced = false, native = false } = {}) {
  const expansions = [],
    timers = [];
  const cards = events.CAPABILITY_IDS.map((id) => {
    const card = Object.assign(new Element(), {
      open: false,
      dataset: { capabilityId: id },
      style: { removeProperty() {} },
      getBoundingClientRect: () => ({ height: 100 }),
      removeAttribute() {},
    });
    const summary = Object.assign(new Element(), {
      setAttribute() {},
      getBoundingClientRect: () => ({ height: 40 }),
    });
    const content = Object.assign(new Element(), { setAttribute() {} });
    const animate = () => ({ cancel() {}, onfinish: null });
    if (!native) {
      card.animate = animate;
      content.animate = animate;
    }
    card.querySelector = (selector) =>
      selector === "summary" ? summary : content;
    return { card, summary };
  });
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: {},
    querySelectorAll: () => cards.map(({ card }) => card),
  });
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const api = loadModule(
    "../src/util/CapabilityMotionUtil.ts",
    {
      document,
      window: new EventTarget(),
      setTimeout: (fn) => timers.push(fn),
      getComputedStyle: () => ({
        getPropertyValue: () => "ease",
        opacity: "1",
        transform: "none",
      }),
    },
    {
      "./AnalyticsUtil": {
        AnalyticsUtil: {
          trackCapabilityExpansion: (card) =>
            expansions.push(card.dataset.capabilityId),
        },
      },
    },
  );
  api.CapabilityMotionUtil.initCapabilityMotion(media);
  return { cards, expansions, timers };
}

test("card motion reports user openings, never closing animations or automatic sibling collapse", () => {
  for (const reduced of [false, true]) {
    const { cards, expansions } = motion({ reduced });
    const activate = (index) =>
      cards[index].summary.dispatchEvent(
        new Event("click", { cancelable: true }),
      );
    activate(0);
    activate(0);
    activate(0);
    activate(1);
    activate(1);
    assert.deepEqual(expansions, [
      "build-extend",
      "build-extend",
      "improve-maintain",
    ]);
    // Programmatic native disclosure (e.g. find-in-page) must not count.
    cards[2].card.open = true;
    cards[2].card.dispatchEvent(new Event("toggle"));
    assert.equal(expansions.length, 3);
    assert.equal(cards[0].card.dataset.expanded, "false");
  }
});

test("native disclosure fallback counts only an activation that actually opens", () => {
  const { cards, expansions, timers } = motion({ native: true });
  const { card, summary } = cards[0];
  summary.dispatchEvent(new Event("click"));
  card.open = true;
  timers.shift()();
  summary.dispatchEvent(new Event("click"));
  card.open = false;
  timers.shift()();
  summary.dispatchEvent(new Event("click"));
  timers.shift()(); // canceled default action
  assert.deepEqual(expansions, ["build-extend"]);
});
