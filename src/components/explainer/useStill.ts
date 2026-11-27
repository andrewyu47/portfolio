/**
 * Whether the visitor prefers reduced motion: true, false, or null while it is not yet known.
 *
 * The preference is read after mount, so the first client render matches the server's HTML
 * and hydration stays clean. That first render is the null state, and callers must treat null
 * as still: an animation started in that moment keeps running after the answer arrives, and
 * the motion library's reducedMotion setting does not stop path drawing or fades.
 */
import { useEffect, useState } from 'react';

export default function useStill(): boolean | null {
  const [still, setStill] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const set = () => setStill(mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);
  return still;
}
