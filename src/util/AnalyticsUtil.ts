import {
  ANALYTICS_ORIGIN,
  validBrowserEvent,
} from "../lib/analytics-events.js";

const seen = new Set<string>();
let initialized = false;

function trackInteraction(event: string, target: string) {
  if (
    location.origin !== ANALYTICS_ORIGIN ||
    !["/", "/sv/"].includes(location.pathname)
  )
    return;
  const payload = {
    event,
    target,
    locale: document.documentElement.lang,
    path: location.pathname,
  };
  const key = `${event}:${target}`;
  if (seen.has(key) || !validBrowserEvent(payload)) return;
  seen.add(key);
  const body = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
  try {
    if (navigator.sendBeacon?.("/api/analytics", body)) return;
  } catch {
    /* Fall back only when the browser could not queue the beacon. */
  }
  try {
    void fetch("/api/analytics", {
      method: "POST",
      body,
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  } catch {
    /* Analytics never blocks the interaction. */
  }
}

function trackCapabilityExpansion(card: HTMLDetailsElement) {
  if (!card.dataset.capabilityId) return;
  trackInteraction("section_view", "services");
  trackInteraction("capability_expand", card.dataset.capabilityId);
}

function initAnalytics() {
  if (
    initialized ||
    location.origin !== ANALYTICS_ORIGIN ||
    !["/", "/sv/"].includes(location.pathname)
  )
    return;
  initialized = true;
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
          const section = entry.target.closest("section")?.id;
          if (section) trackInteraction("section_view", section);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 },
    );
    document
      .querySelectorAll("#services h2, #experience h2, #contact h2")
      .forEach((heading) => observer.observe(heading));
  }
  const trackLink = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>(
      "a[data-analytics-event]",
    );
    if (link)
      trackInteraction(
        link.dataset.analyticsEvent!,
        link.dataset.analyticsTarget!,
      );
  };
  document.addEventListener("click", trackLink);
  document.addEventListener("auxclick", (event) => {
    if (event.button === 1) trackLink(event);
  });
  document
    .querySelector(".landing-form")
    ?.addEventListener("input", (event) => {
      const input = event.target;
      if (
        (input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement) &&
        ["name", "email", "message"].includes(input.name)
      ) {
        trackInteraction("form_start", "contact");
      }
    });
}

export const AnalyticsUtil = {
  trackInteraction,
  trackCapabilityExpansion,
  initAnalytics,
};
