import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

/**
 * Refresh when a screen gains focus — but only if what it shows is older than
 * `staleMs`.
 *
 * Every doctor tab refetched on every focus, so switching tabs back and forth
 * fired request after request, and screens whose data was empty blanked to a
 * full-screen spinner each time. Data already on screen stays on screen; the
 * refresh happens behind it.
 */
export function useStaleWhileFocus(refresh: () => void, lastFetchedAt: number | null, staleMs = 30000): void {
  useFocusEffect(
    useCallback(() => {
      if (!lastFetchedAt || Date.now() - lastFetchedAt > staleMs) refresh();
    }, [refresh, lastFetchedAt, staleMs])
  );
}

export default useStaleWhileFocus;
