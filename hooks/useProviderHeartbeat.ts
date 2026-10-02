// ============================================================================
// "Still here" while a home-service provider is online.
//
// Search counts a provider as available now only if their app was seen in the
// last few minutes (backend settings.onlineStaleMinutes). Without this, the
// online toggle stayed on for hours after the app was closed. Beats every
// four minutes while the app is in the foreground, and once on returning to
// it; the server throttles writes, so an extra beat costs nothing.
// ============================================================================

import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { sendProviderHeartbeat } from '../networks/serviceProviders/providerNetwork';

const BEAT_MS = 4 * 60 * 1000;

export function useProviderHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    let timer: ReturnType<typeof setInterval> | null = null;

    const beat = () => {
      void sendProviderHeartbeat();
    };
    const start = () => {
      if (timer) return;
      beat();
      timer = setInterval(beat, BEAT_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [enabled]);
}
