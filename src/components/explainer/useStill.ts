/**
 * True when the visitor prefers reduced motion. It reads the preference after mount,
 * so the first client render matches the server's HTML and hydration stays clean.
 */
import { useEffect, useState } from 'react';

export default function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const set = () => setStill(mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);
  return still;
}
