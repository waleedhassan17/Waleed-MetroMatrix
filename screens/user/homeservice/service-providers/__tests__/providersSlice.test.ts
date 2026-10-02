const mockFetchProviders = jest.fn();
jest.mock('../../../../../networks/serviceProviders/providerNetwork', () => ({
  fetchProviders: (...a: any[]) => mockFetchProviders(...a),
}));

import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  fetchProvidersByCategory,
  loadMoreProviders,
  setFilters,
  setSelectedSort,
} from '../providersSlice';

const card = (id: string, rating: number) => ({ id, name: `P${id}`, rating, reviews: 1, experience: '1 year' });
const page = (ids: [string, number][], currentPage: number, hasNext: boolean) => ({
  success: true,
  message: 'ok',
  data: {
    providers: ids.map(([id, r]) => card(id, r)),
    pagination: { currentPage, totalPages: hasNext ? currentPage + 1 : currentPage, totalItems: 40, itemsPerPage: 15, hasNext, hasPrevious: currentPage > 1 },
    searchArea: { nearYou: true, radiusKm: 15, widened: false },
  },
  origin: { lat: 31.5, lng: 74.3, source: 'address', label: 'Home' },
});

const makeStore = () => configureStore({ reducer: { serviceProviders: reducer } });

describe('providers slice (server-ranked discovery)', () => {
  beforeEach(() => mockFetchProviders.mockReset());

  it('keeps the server order — never re-sorts by rating on the phone', async () => {
    mockFetchProviders.mockResolvedValueOnce(page([['a', 3.1], ['b', 4.9], ['c', 4.0]], 1, false));
    const store = makeStore();
    await store.dispatch(fetchProvidersByCategory({ category: 'plumbers' }) as any);
    expect(store.getState().serviceProviders.filteredProviders.map((p: any) => p.id)).toEqual(['a', 'b', 'c']);
    expect(store.getState().serviceProviders.searchArea).toEqual({ nearYou: true, radiusKm: 15, widened: false });
    expect(store.getState().serviceProviders.origin?.label).toBe('Home');
  });

  it('sends the chosen sort and filters to the server', async () => {
    mockFetchProviders.mockResolvedValue(page([['a', 4]], 1, false));
    const store = makeStore();
    store.dispatch(setSelectedSort('nearest'));
    store.dispatch(setFilters({ minRating: 4, available: true, maxDistanceKm: 5 }));
    await store.dispatch(fetchProvidersByCategory({ category: 'electricians' }) as any);
    expect(mockFetchProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'electricians',
        sort: 'nearest',
        filters: { minRating: 4, available: true, maxDistanceKm: 5 },
        page: 1,
      })
    );
  });

  it('appends the next page and de-duplicates a provider seen twice', async () => {
    mockFetchProviders
      .mockResolvedValueOnce(page([['a', 4], ['b', 4]], 1, true))
      .mockResolvedValueOnce(page([['b', 4], ['c', 4]], 2, false));
    const store = makeStore();
    await store.dispatch(fetchProvidersByCategory({ category: 'plumbers' }) as any);
    await store.dispatch(loadMoreProviders() as any);
    const s = store.getState().serviceProviders;
    expect(s.filteredProviders.map((p: any) => p.id)).toEqual(['a', 'b', 'c']);
    expect(s.pagination.currentPage).toBe(2);
    expect(mockFetchProviders.mock.calls[1][0].page).toBe(2);
  });

  it('does not request a page that does not exist', async () => {
    mockFetchProviders.mockResolvedValueOnce(page([['a', 4]], 1, false));
    const store = makeStore();
    await store.dispatch(fetchProvidersByCategory({ category: 'plumbers' }) as any);
    await store.dispatch(loadMoreProviders() as any);
    expect(mockFetchProviders).toHaveBeenCalledTimes(1);
    expect(store.getState().serviceProviders.error).toBeNull();
  });
});
