jest.mock('react-native', () => ({ AppState: { addEventListener: jest.fn() } }));
const mockApiRequest = jest.fn(async (..._args: any[]) => ({ success: true, data: null, message: 'ok' }));
jest.mock('../../../networks/serviceProviders/config', () => ({ apiRequest: (...a: any[]) => mockApiRequest(...a) }));

import { track, flushTracking, resetTracking, __queuedForTests } from '../track';

describe('analytics track', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetTracking();
    mockApiRequest.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('queues events and sends them in one batch after the interval', async () => {
    track({ module: 'shopping', type: 'view', refId: 'p1' });
    track({ module: 'shopping', type: 'search', query: 'shoes' });
    expect(mockApiRequest).not.toHaveBeenCalled();
    jest.advanceTimersByTime(10_000);
    await Promise.resolve();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    const [endpoint, options] = mockApiRequest.mock.calls[0] as any[];
    expect(endpoint).toBe('/events');
    expect(options.bestEffort).toBe(true);
    expect(JSON.parse(options.body).events).toHaveLength(2);
  });

  it('flushes immediately at 20 events', async () => {
    for (let i = 0; i < 20; i += 1) track({ module: 'homeservice', type: 'impression', refId: `p${i}` });
    await Promise.resolve();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it('never throws when the request fails, and drops the batch', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('offline'));
    track({ module: 'healthcare', type: 'view', refId: 'd1' });
    await expect(flushTracking()).resolves.toBeUndefined();
    expect(__queuedForTests()).toHaveLength(0);
  });

  it('resetTracking discards queued events (logout)', async () => {
    track({ module: 'shopping', type: 'view', refId: 'p1' });
    resetTracking();
    await flushTracking();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('caps the queue so an offline device cannot grow it without bound', () => {
    mockApiRequest.mockImplementation(() => new Promise(() => {})); // a send that never finishes
    for (let i = 0; i < 400; i += 1) track({ module: 'shopping', type: 'impression', refId: `p${i}` });
    expect(__queuedForTests().length).toBeLessThanOrEqual(200);
    mockApiRequest.mockImplementation(async () => ({ success: true, data: null, message: 'ok' }));
  });
});
