import { REFRESH_LEAD_MS, startAdminRefreshScheduler } from '../refreshScheduler';

function fakeAppState(initial = 'active') {
  let listener: ((s: string) => void) | null = null;
  const appState = {
    currentState: initial,
    addEventListener: (_: 'change', l: (s: string) => void) => {
      listener = l;
      return { remove: () => (listener = null) };
    },
  };
  return {
    appState,
    set: (state: string) => {
      appState.currentState = state;
      listener?.(state);
    },
  };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('startAdminRefreshScheduler', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const NOW = new Date('2026-10-03T10:00:00Z').getTime();

  it('refreshes a minute before the access token expires, then reschedules', async () => {
    let expiry = new Date(NOW + 15 * 60_000).toISOString();
    const refresh = jest.fn(async () => {
      expiry = new Date(Date.now() + 15 * 60_000).toISOString();
      return 'new-token';
    });
    jest.setSystemTime(NOW);
    const { appState } = fakeAppState();
    const s = startAdminRefreshScheduler({ getExpiry: async () => expiry, refresh, appState });
    await flush();

    jest.advanceTimersByTime(15 * 60_000 - REFRESH_LEAD_MS - 1);
    expect(refresh).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await flush();
    expect(refresh).toHaveBeenCalledTimes(1);

    // Rescheduled from the new expiry.
    jest.advanceTimersByTime(15 * 60_000 - REFRESH_LEAD_MS);
    await flush();
    expect(refresh).toHaveBeenCalledTimes(2);
    s.stop();
  });

  it('does nothing in the background and refreshes at once on return if already due', async () => {
    jest.setSystemTime(NOW);
    const expiry = new Date(NOW + 5 * 60_000).toISOString();
    const refresh = jest.fn(async () => null);
    const app = fakeAppState();
    const s = startAdminRefreshScheduler({ getExpiry: async () => expiry, refresh, appState: app.appState });
    await flush();

    app.set('background');
    jest.advanceTimersByTime(30 * 60_000);
    await flush();
    expect(refresh).not.toHaveBeenCalled();

    app.set('active'); // token expired while backgrounded
    await flush();
    jest.advanceTimersByTime(0);
    await flush();
    expect(refresh).toHaveBeenCalledTimes(1);
    s.stop();
  });

  it('stops cleanly and schedules nothing when signed out', async () => {
    jest.setSystemTime(NOW);
    const refresh = jest.fn(async () => 't');
    const { appState } = fakeAppState();
    const s = startAdminRefreshScheduler({ getExpiry: async () => null, refresh, appState });
    await flush();
    jest.advanceTimersByTime(60 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
    s.stop();
  });
});
