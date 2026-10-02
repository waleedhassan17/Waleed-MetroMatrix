// ============================================================================
// Interaction tracking — the app's half of the personalisation data loop.
//
// What a customer looks at, searches for and taps is what recommendations
// and provider ranking learn from (backend: POST /api/events → ml_events,
// read nightly by the Python jobs in the backend's ml/ folder).
//
// Rules this module keeps:
//   - It never blocks or fails a screen: events queue in memory and leave in
//     batches (every 10 s, at 20 events, or when the app is backgrounded),
//     best-effort, never retried.
//   - It carries ids and short query strings only — no names, phones or
//     addresses.
//   - `resetTracking()` runs on logout, so events queued by one account can
//     never be sent under the next account's token.
// ============================================================================

import { AppState, AppStateStatus } from 'react-native';
import { apiRequest } from '../../networks/serviceProviders/config';

export type TrackModule = 'shopping' | 'homeservice' | 'healthcare';
export type TrackType = 'impression' | 'view' | 'click' | 'search' | 'add_to_cart' | 'wishlist';

export interface TrackEvent {
  module: TrackModule;
  type: TrackType;
  refId?: string;
  query?: string;
  meta?: { position?: number; searchId?: string; context?: string; screen?: string; category?: string; score?: number };
  /** Numeric ranking features, impressions only. */
  features?: Record<string, number>;
}

type QueuedEvent = TrackEvent & { ts: string };

const FLUSH_AT = 20;
const FLUSH_MS = 10_000;
const MAX_BATCH = 50;
const MAX_QUEUE = 200;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let appStateBound = false;
let sending = false;

function bindAppState() {
  if (appStateBound) return;
  appStateBound = true;
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'background' || state === 'inactive') void flushTracking();
  });
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushTracking();
  }, FLUSH_MS);
}

/** Queue one event. Cheap and synchronous; safe to call from render paths' effects. */
export function track(event: TrackEvent): void {
  if (!event || !event.module || !event.type) return;
  bindAppState();
  queue.push({ ...event, ts: new Date().toISOString() });
  // A device offline for a long time must not grow this without bound.
  if (queue.length > MAX_QUEUE) queue = queue.slice(queue.length - MAX_QUEUE);
  if (queue.length >= FLUSH_AT) void flushTracking();
  else schedule();
}

/** Send what is queued. Resolves whether or not the server accepted it. */
export async function flushTracking(): Promise<void> {
  if (sending || !queue.length) return;
  sending = true;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(batch.length);
  try {
    await apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify({ events: batch }),
      bestEffort: true,
    });
  } catch {
    // Best-effort by design: a lost batch costs a little training signal, nothing more.
  } finally {
    sending = false;
    if (queue.length) schedule();
  }
}

/** Drop everything queued — called on logout. */
export function resetTracking(): void {
  queue = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Test seam. */
export function __queuedForTests(): QueuedEvent[] {
  return queue;
}
