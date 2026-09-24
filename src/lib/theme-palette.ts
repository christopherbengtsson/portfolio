export type Theme = 'light' | 'dark';

type Surfaces = { background: number; card: number };

const endpoints: Record<Theme, Surfaces> = {
  light: { background: 255, card: 248 },
  dark: { background: 24, card: 34 },
};
const properties = [
  '--land-bg', '--land-card', '--land-ink', '--land-muted', '--land-line',
  '--land-accent', '--land-action-ink', '--land-field-ink',
  '--land-placeholder', '--land-focus',
];

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const luminance = (channel: number) => {
  const value = channel / 255;
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
};
const channelFromLuminance = (value: number, direction: 'floor' | 'ceil') => {
  const linear = clamp(value);
  const channel = 255 * (linear <= .0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - .055);
  return direction === 'floor' ? Math.floor(channel) : Math.ceil(channel);
};
const gray = (value: number) => {
  const rounded = Math.round(value);
  return 'rgb(' + rounded + ' ' + rounded + ' ' + rounded + ')';
};
const parseGray = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    return parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
  }
  const channel = trimmed.match(/[\d.]+/);
  return channel ? Number(channel[0]) : 255;
};

// Both black and white reach 4.5:1 at this crossing on a neutral surface.
// Interpolating the text itself through grey would make it disappear.
const lightInk = (background: number) => luminance(background) < .179;

function readableText(background: number, lightValue: number, darkValue: number) {
  const surface = luminance(background);
  if (!lightInk(background)) {
    const darkestAllowed = channelFromLuminance((surface + .05) / 4.5 - .05, 'floor');
    return Math.min(lightValue, darkestAllowed);
  }
  const lightestRequired = channelFromLuminance(4.5 * (surface + .05) - .05, 'ceil');
  return Math.max(darkValue, lightestRequired);
}

function visibleLine(background: number) {
  const surface = luminance(background);
  if (!lightInk(background)) {
    return Math.min(215, channelFromLuminance((surface + .05) / 1.4 - .05, 'floor'));
  }
  return Math.max(68, channelFromLuminance(1.4 * (surface + .05) - .05, 'ceil'));
}

export function createThemePalette(root: HTMLElement) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let timer = 0;
  let frame = 0;
  let activeTarget: Theme | null = null;

  const cancel = () => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    timer = 0;
    frame = 0;
  };
  const clearOverrides = () => {
    for (const name of properties) root.style.removeProperty(name);
  };
  const snapshot = (): Surfaces => {
    const style = getComputedStyle(root);
    return {
      background: parseGray(style.getPropertyValue('--land-bg')),
      card: parseGray(style.getPropertyValue('--land-card')),
    };
  };
  const paint = ({ background, card }: Surfaces) => {
    background = Math.round(background);
    // The two surfaces differ by only a few greys at their crossing. Meeting
    // briefly lets page and field text reverse polarity in the same frame.
    const proximity = clamp(1 - Math.abs(background - 118) / 18);
    card = Math.round(mix(card, background, proximity));
    const pageLightInk = lightInk(background);
    const values = [
      gray(background),
      gray(card),
      gray(readableText(background, 24, 248)),
      gray(readableText(background, 98, 181)),
      gray(visibleLine(background)),
      gray(readableText(background, 34, 248)),
      gray(pageLightInk ? 24 : 255),
      gray(readableText(card, 24, 248)),
      gray(readableText(card, 98, 181)),
      gray(readableText(background, 24, 248)),
    ];
    // These writes occur in one task before the browser paints the next frame.
    properties.forEach((name, index) => root.style.setProperty(name, values[index]));
  };
  const finish = () => {
    cancel();
    activeTarget = null;
    clearOverrides();
  };
  const settleIfReducedOrHidden = () => {
    if (activeTarget && (motion.matches || document.hidden)) finish();
  };

  function apply(theme: Theme, animate: boolean) {
    const currentTheme = root.dataset.theme === 'dark' ? 'dark' : 'light';
    if (theme === currentTheme && activeTarget === null) {
      root.style.colorScheme = theme;
      return;
    }
    const from = snapshot();
    cancel();
    if (animate && !motion.matches && !document.hidden) {
      paint(from);
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      activeTarget = theme;
      const to = endpoints[theme];
      const started = performance.now();
      const tick = (now: number) => {
        frame = 0;
        if (activeTarget !== theme) return;
        const progress = (now - started - 60) / 400;
        if (progress >= 1) {
          finish();
          return;
        }
        const amount = ease(progress);
        paint({
          background: mix(from.background, to.background, amount),
          card: mix(from.card, to.card, amount),
        });
        frame = requestAnimationFrame(tick);
      };
      timer = window.setTimeout(() => {
        timer = 0;
        frame = requestAnimationFrame(tick);
      }, 60);
      return;
    }
    activeTarget = null;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    clearOverrides();
  }

  motion.addEventListener('change', settleIfReducedOrHidden);
  document.addEventListener('visibilitychange', settleIfReducedOrHidden);

  return {
    apply,
    cleanup() {
      cancel();
      motion.removeEventListener('change', settleIfReducedOrHidden);
      document.removeEventListener('visibilitychange', settleIfReducedOrHidden);
    },
  };
}
