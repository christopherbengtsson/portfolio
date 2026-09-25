import { initCapabilityMotion } from './CapabilityMotionUtil';

/** Progressive motion: content stays readable before initialization and without JS. */
function initSiteInteractions() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  initCapabilityMotion(reduced);
  const running = new Map<HTMLElement, Animation>();
  const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
  let observer: IntersectionObserver | undefined;

  const finish = (element: HTMLElement) => {
    running.get(element)?.cancel();
    running.delete(element);
  };

  if (!reduced.matches && "IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer?.unobserve(element);
          if (reduced.matches || element.contains(document.activeElement))
            continue;
          const animation = element.animate(
            [
              { opacity: 0.35, transform: "translateY(16px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 650, easing: "cubic-bezier(.22, 1, .36, 1)" },
          );
          running.set(element, animation);
          animation.onfinish = () => finish(element);
        }
      },
      { threshold: 0 },
    );

    // Leave the initial viewport and deep-linked section immediately readable.
    const anchor = document.getElementById(location.hash.slice(1));
    const destination = anchor?.closest("section");
    for (const element of targets) {
      if (
        element.getBoundingClientRect().top >= innerHeight &&
        !destination?.contains(element)
      ) {
        observer.observe(element);
      }
    }
  }

  document.addEventListener("focusin", (event) => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest<HTMLElement>("[data-reveal]");
    if (element) {
      observer?.unobserve(element);
      finish(element);
    }
  });
  const settle = () => {
    if (!reduced.matches && !document.hidden) return;
    for (const element of running.keys()) finish(element);
    if (reduced.matches) observer?.disconnect();
  };
  reduced.addEventListener("change", settle);
  document.addEventListener("visibilitychange", settle);

  const language = document.querySelector<HTMLDetailsElement>(
    ".landing-language details",
  );
  if (!language) return;
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !language.open) return;
    const focusInMenu = language.contains(document.activeElement);
    language.open = false;
    if (focusInMenu) language.querySelector("summary")?.focus();
  });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !language.contains(event.target))
      language.open = false;
  });
  document.addEventListener("focusin", (event) => {
    if (event.target instanceof Node && !language.contains(event.target))
      language.open = false;
  });
}

export const SiteAnimationUtil = {
  initSiteInteractions,
};
