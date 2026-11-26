// True when the OS asks for reduced motion. Charts use it to skip their JS animations.
export const reducedMotion =
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
