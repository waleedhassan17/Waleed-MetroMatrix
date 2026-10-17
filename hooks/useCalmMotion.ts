import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

/**
 * True when nothing on screen should move by itself: the OS asks for reduced
 * motion, or a screen reader is running (an auto-advancing banner would pull
 * the reader's focus away mid-sentence). Motion that answers a touch is fine;
 * this is for motion nobody asked for.
 */
export function useCalmMotion(): boolean {
  const reduced = useReducedMotion();
  const [reader, setReader] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (!cancelled) setReader(on);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setReader);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduced || reader;
}

export default useCalmMotion;
