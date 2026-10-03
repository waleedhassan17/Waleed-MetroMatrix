// ============================================================================
// Proactive admin token refresh.
//
// Refresh-on-401 works, but it costs the first request after expiry a failed
// round trip, and a screen polling in the background can trip it at the worst
// moment. So while the app is in the foreground the admin session is renewed
// a minute before its access token expires. In the background nothing runs —
// on return to the foreground the schedule is recomputed, and an already
// expired token is renewed straight away.
//
// Everything it touches is injected, so the tests drive it with fake timers.
// ============================================================================

export const REFRESH_LEAD_MS = 60_000;

type AppStateLike = {
  currentState: string;
  addEventListener: (type: 'change', listener: (state: string) => void) => { remove: () => void };
};

export interface RefreshSchedulerDeps {
  /** ISO expiry of the current access token, or null when signed out. */
  getExpiry: () => Promise<string | null>;
  /** Single-flight refresh (refreshSessionOnce('admin')). */
  refresh: () => Promise<string | null>;
  appState: AppStateLike;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface RefreshSchedule {
  stop: () => void;
  /** Recompute after the token changed elsewhere (a refresh-on-401). */
  reschedule: () => void;
}

export function startAdminRefreshScheduler(deps: RefreshSchedulerDeps): RefreshSchedule {
  const now = deps.now ?? Date.now;
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let timer: unknown = null;
  let stopped = false;

  const cancel = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const schedule = async () => {
    cancel();
    if (stopped || deps.appState.currentState !== 'active') return;
    const expiry = await deps.getExpiry();
    if (stopped || !expiry) return;
    const delay = Math.max(0, new Date(expiry).getTime() - now() - REFRESH_LEAD_MS);
    timer = setTimer(async () => {
      timer = null;
      if (stopped || deps.appState.currentState !== 'active') return;
      const token = await deps.refresh();
      // A failed refresh is handled by the network layer (session-ended event);
      // only a renewed session is worth rescheduling.
      if (token) void schedule();
    }, delay);
  };

  const subscription = deps.appState.addEventListener('change', (state) => {
    if (state === 'active') void schedule();
    else cancel();
  });
  void schedule();

  return {
    stop: () => {
      stopped = true;
      cancel();
      subscription.remove();
    },
    reschedule: () => void schedule(),
  };
}
