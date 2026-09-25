/** Native disclosures without JS; interruptible, exclusive expansion with JS. */
export function initCapabilityMotion(reduced: MediaQueryList) {
  const cards = [...document.querySelectorAll<HTMLDetailsElement>('.landing-capability')];
  if (!cards.length || typeof cards[0].animate !== 'function') return;

  const easing = getComputedStyle(document.documentElement).getPropertyValue('--land-ease').trim();
  const states = cards.map((card) => ({
    card,
    summary: card.querySelector('summary')!,
    content: card.querySelector<HTMLElement>('.landing-capability-content')!,
    expanded: card.open,
    heightAnimation: undefined as Animation | undefined,
    textAnimation: undefined as Animation | undefined,
  }));
  type State = (typeof states)[number];

  function settle(state: State) {
    state.heightAnimation?.cancel();
    state.textAnimation?.cancel();
    state.heightAnimation = undefined;
    state.textAnimation = undefined;
    state.card.open = state.expanded;
    state.card.style.removeProperty('overflow');
  }

  function setExpanded(state: State, expanded: boolean, animate = true) {
    if (state.expanded === expanded) return;
    const startHeight = state.card.getBoundingClientRect().height;
    const textStyle = getComputedStyle(state.content);
    const opacity = state.textAnimation ? textStyle.opacity : state.expanded ? '1' : '0';
    const transform = state.textAnimation ? textStyle.transform : state.expanded ? 'translateY(0)' : 'translateY(4px)';
    state.heightAnimation?.cancel();
    state.textAnimation?.cancel();
    state.expanded = expanded;
    state.card.dataset.expanded = String(expanded);
    state.summary.setAttribute('aria-expanded', String(expanded));
    state.content.inert = !expanded;
    state.content.setAttribute('aria-hidden', String(!expanded));

    if (!animate || reduced.matches || document.hidden) {
      settle(state);
      return;
    }

    // Keep closing content rendered until the height animation finishes.
    state.card.open = true;
    const endHeight = expanded ? state.card.getBoundingClientRect().height : state.summary.getBoundingClientRect().height;
    state.card.style.overflow = 'hidden';
    state.heightAnimation = state.card.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: 360, easing, fill: 'both' },
    );
    state.textAnimation = state.content.animate(
      [
        { opacity, transform },
        { opacity: expanded ? 1 : 0, transform: expanded ? 'translateY(0)' : 'translateY(4px)' },
      ],
      { duration: 220, easing, fill: 'both' },
    );
    state.heightAnimation.onfinish = () => settle(state);
  }

  function activate(state: State, expanded: boolean, animate = true) {
    if (expanded) {
      for (const other of states) {
        if (other !== state) setExpanded(other, false, animate);
      }
    }
    setExpanded(state, expanded, animate);
  }

  for (const state of states) {
    // Native grouping would hide the previous card before it can animate closed.
    state.card.removeAttribute('name');
    state.summary.addEventListener('click', (event) => {
      event.preventDefault();
      activate(state, !state.expanded);
    });
    // Synchronize native changes, such as a browser find-in-page disclosure.
    state.card.addEventListener('toggle', () => {
      if (!state.heightAnimation && state.expanded !== state.card.open) {
        activate(state, state.card.open, false);
      }
    });
  }

  const settleAll = () => states.forEach(settle);
  window.addEventListener('resize', settleAll);
  reduced.addEventListener('change', () => {
    if (reduced.matches) settleAll();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) settleAll();
  });
}
