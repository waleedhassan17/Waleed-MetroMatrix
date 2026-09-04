import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the OS is set to reduce motion.
 *
 * Motion in this app only ever answers a user action (a sheet opening, a
 * confirmation resolving), so there is never much to suppress — but someone who
 * has asked the system for less movement has asked us too, and a transform that
 * triggers vertigo is not a style choice.
 *
 * Callers should skip the animation and jump to the end state, never freeze at
 * the start state — that is how a screen ends up invisible.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduced(enabled);
    });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduced;
}

export default useReducedMotion;
