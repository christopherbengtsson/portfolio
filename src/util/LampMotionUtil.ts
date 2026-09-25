type Theme = "light" | "dark";

interface Activation {
  target: Theme;
  startedAt: number;
  startReach: number;
  startPress: number;
  committedAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
}

interface Illumination {
  startedAt: number;
  from: number;
  to: number;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

/** Owns illustration motion only. The caller owns document theme and persistence. */
function initLampMotion(
  root: HTMLButtonElement,
  getTheme: () => Theme,
  setTheme: (theme: Theme) => void,
): { sync(): void; cleanup(): void } {
  const scenes = [
    ...root.querySelectorAll<SVGSVGElement>("[data-lamp-scene]"),
  ].map((svg) => ({
    cordX: svg.dataset.lampScene === "desktop" ? 90 : 16,
    cordY: svg.dataset.lampScene === "desktop" ? 48 : 45,
    string: svg.querySelector<SVGPathElement>("[data-lamp-string]")!,
    knob: svg.querySelector<SVGEllipseElement>("[data-lamp-knob]")!,
  }));
  const head = root.querySelector<SVGGElement>("[data-lamp-head]")!;
  const arm = root.querySelector<SVGPathElement>("[data-lamp-arm]")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const desktop = matchMedia("(min-width: 1024px)");
  const listeners = new AbortController();
  const { signal } = listeners;

  let reach = 0;
  let press = 0;
  let light = getTheme() === "light" ? 1 : 0;
  let pointer: { x: number; y: number } | null = null;
  let pointerDirty = false;
  let pointerReach = 0;
  let keyboardReady = false;
  let inView = true;
  let frame = 0;
  let lastFrame = 0;
  let activation: Activation | null = null;
  let illumination: Illumination | null = null;
  let destroyed = false;

  function visible() {
    const bounds = root.getBoundingClientRect();
    return (
      !root.hidden &&
      bounds.width > 0 &&
      bounds.height > 0 &&
      bounds.bottom > 0 &&
      bounds.top < innerHeight &&
      bounds.right > 0 &&
      bounds.left < innerWidth
    );
  }

  function draw() {
    const pull = press * 4;
    // These are the draw(s) coordinates from the bundled reference, in SVG units.
    for (const { cordX, cordY, string, knob } of scenes) {
      string.setAttribute(
        "d",
        `M ${cordX} 29 C ${cordX - 0.5} 36 ${cordX + 0.4} ${cordY - 5 + pull} ${cordX} ${cordY + pull}`,
      );
      knob.setAttribute("cy", String(cordY + 1.5 + pull));
    }
    head.setAttribute("transform", `translate(${reach * 1.2} 0)`);
    const handX = 65 + 25 * reach;
    const handY = 69 - 19.5 * reach + pull;
    arm.setAttribute(
      "d",
      `M 49 48 C 60 ${52 - 5 * reach} ${handX - 12} ${handY + 3 * reach} ${handX} ${handY}`,
    );
    root.style.setProperty("--lamp-light", String(light));
    root.dataset.lampOn = String(getTheme() === "light");
  }

  function requestFrame() {
    if (!frame && !destroyed) frame = requestAnimationFrame(tick);
  }

  function cancelMotion(keepIllumination = false) {
    if (activation && activation.timer !== null) clearTimeout(activation.timer);
    activation = null;
    if (!keepIllumination) illumination = null;
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
  }

  function passiveReach() {
    return desktop.matches ? Math.max(pointerReach, keyboardReady ? 1 : 0) : 0;
  }

  function updateLight(now: number) {
    if (!illumination) return;
    const elapsed = now - illumination.startedAt;
    // The shade switches at the pull; its rim/glow follow 20ms later over 100ms.
    light = mix(illumination.from, illumination.to, ease((elapsed - 20) / 100));
    if (elapsed >= 120) illumination = null;
  }

  /** External theme updates invalidate a pending pull; no stale setter may run later. */
  function sync() {
    if (destroyed) return;
    cancelMotion();
    pointerReach = 0;
    pointerDirty = false;
    reach =
      !reduced.matches && desktop.matches && keyboardReady && visible() ? 1 : 0;
    press = 0;
    light = getTheme() === "light" ? 1 : 0;
    draw();
  }

  function commit(current: Activation, now: number) {
    if (activation !== current || current.committedAt !== null) return;
    if (current.timer !== null) clearTimeout(current.timer);
    current.timer = null;
    current.committedAt = now;
    updateLight(now);
    reach = 1;
    press = 1;
    draw();
    // Mark committed before the callback so even synchronous re-entry cannot toggle twice.
    setTheme(current.target);
    if (activation === current) {
      root.dataset.lampOn = String(getTheme() === "light");
      illumination = {
        startedAt: now,
        from: light,
        to: current.target === "light" ? 1 : 0,
      };
      requestFrame();
    }
  }

  function finishImmediately() {
    const pending = activation?.committedAt === null ? activation.target : null;
    cancelMotion();
    if (pending) setTheme(pending);
    sync();
  }

  function updatePointer() {
    if (!pointerDirty) return;
    pointerDirty = false;
    if (!pointer || !desktop.matches || !finePointer.matches) {
      pointerReach = 0;
      return;
    }
    const bounds = root.getBoundingClientRect();
    const distance = Math.hypot(
      pointer.x - (bounds.left + bounds.width * 0.65),
      pointer.y - (bounds.top + bounds.height * 0.65),
    );
    pointerReach = clamp(1 - (distance - 34) / 145);
  }

  function tick(now: number) {
    frame = 0;
    if (destroyed) return;
    if (reduced.matches || document.hidden || !inView) {
      finishImmediately();
      return;
    }
    updateLight(now);
    updatePointer();
    const current = activation;
    if (current) {
      const elapsed = now - current.startedAt;
      if (current.committedAt === null && elapsed >= 140) commit(current, now);
      // sync() may be called by an external theme update during the setter.
      if (activation !== current) return;
      if (current.committedAt === null) {
        reach = mix(current.startReach, 1, ease(elapsed / 90));
        press =
          elapsed < 90
            ? mix(current.startPress, 0, ease(elapsed / 90))
            : ease((elapsed - 90) / 50);
        draw();
      } else {
        const sincePull = now - current.committedAt;
        press = 1 - ease(sincePull / 160);
        // Keep the hand attached until the cord has returned, then lower the arm.
        reach = mix(1, passiveReach(), ease((sincePull - 160) / 300));
        draw();
        if (sincePull >= 460) {
          activation = null;
          lastFrame = 0;
          draw();
          return;
        }
      }
      requestFrame();
      return;
    }

    const target = passiveReach();
    const dt = lastFrame ? Math.min(now - lastFrame, 64) : 16;
    lastFrame = now;
    reach = mix(reach, target, 1 - Math.exp(-dt / 65));
    if (Math.abs(target - reach) < 0.002) reach = target;
    press = 0;
    draw();
    if (reach !== target || illumination) requestFrame();
    else lastFrame = 0;
  }

  function activate() {
    // Repeated activation before the pull belongs to the same pending choice.
    if (activation?.committedAt === null) return;
    const target = getTheme() === "light" ? "dark" : "light";
    // A second pull can begin while the first lamp response finishes independently.
    updateLight(performance.now());
    cancelMotion(true);
    if (reduced.matches || document.hidden || !visible()) {
      setTheme(target);
      sync();
      return;
    }
    inView = true;
    const current: Activation = {
      target,
      startedAt: performance.now(),
      startReach: reach,
      startPress: press,
      committedAt: null,
      timer: null,
    };
    activation = current;
    current.timer = setTimeout(() => commit(current, performance.now()), 140);
    requestFrame();
  }

  function clearPointer() {
    pointer = null;
    pointerDirty = true;
    if (reach !== 0 || activation) requestFrame();
    else pointerReach = 0;
  }

  root.addEventListener("click", activate, { signal });
  root.addEventListener(
    "focus",
    () => {
      keyboardReady = root.matches(":focus-visible");
      if (keyboardReady && !reduced.matches) requestFrame();
    },
    { signal },
  );
  root.addEventListener(
    "blur",
    () => {
      keyboardReady = false;
      if (reach !== 0 && !reduced.matches) requestFrame();
    },
    { signal },
  );
  root.addEventListener(
    "pointerdown",
    () => {
      keyboardReady = false;
    },
    { signal },
  );
  root.addEventListener(
    "keydown",
    () => {
      keyboardReady = root.matches(":focus-visible");
      if (keyboardReady && !reduced.matches) requestFrame();
    },
    { signal },
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        event.pointerType === "touch" ||
        reduced.matches ||
        !desktop.matches ||
        !finePointer.matches ||
        !inView
      )
        return;
      pointer = { x: event.clientX, y: event.clientY };
      pointerDirty = true;
      requestFrame();
    },
    { signal, passive: true },
  );
  document.addEventListener("pointerleave", clearPointer, { signal });
  window.addEventListener("blur", clearPointer, { signal });
  window.addEventListener(
    "scroll",
    () => {
      if (!visible()) {
        if (!inView && !activation) return;
        inView = false;
        clearPointer();
        finishImmediately();
      } else {
        inView = true;
        if (pointer) {
          pointerDirty = true;
          requestFrame();
        }
      }
    },
    { signal, passive: true },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) finishImmediately();
    },
    { signal },
  );
  reduced.addEventListener("change", finishImmediately, { signal });
  finePointer.addEventListener("change", clearPointer, { signal });
  desktop.addEventListener("change", clearPointer, { signal });

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) {
      clearPointer();
      finishImmediately();
    }
  });
  observer.observe(root);
  sync();

  return {
    sync,
    cleanup() {
      cancelMotion();
      destroyed = true;
      listeners.abort();
      observer.disconnect();
    },
  };
}

export const LampMotionUtil = {
  initLampMotion,
};
