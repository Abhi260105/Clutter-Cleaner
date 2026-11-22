import { useEffect, useRef, useState } from 'react';

// Smoothly animates a number toward `target` (ease-out).
export default function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      from.current = target;
      setValue(target);
      return undefined;
    }
    const begin = from.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(begin + (target - begin) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
