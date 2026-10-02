const mockSearch = jest.fn();
jest.mock('../../../../../networks/shopping/productApi', () => ({
  searchProductsApi: (...a: any[]) => mockSearch(...a),
  suggestProductsApi: jest.fn(),
}));
jest.mock('../../../../../networks/shopping/brandApi', () => ({ fetchBrandCategoriesApi: jest.fn() }));

import { configureStore } from '@reduxjs/toolkit';
import reducer, { ignoreInterpretation, searchProducts, setSearchQuery } from '../productSearchSlice';

const makeStore = () => configureStore({ reducer: { productSearch: reducer } });
const ok = (interpretedAs: any) => ({
  success: true,
  data: [{ productId: 'p1', name: 'Air Zoom' }],
  pagination: { page: 1, limit: 20, total: 1, pages: 1 },
  interpretedAs,
});

describe('product search slice — natural-language interpretation', () => {
  beforeEach(() => mockSearch.mockReset());

  it('keeps what the server understood the query as', async () => {
    mockSearch.mockResolvedValueOnce(ok({ color: 'red', maxPrice: 3000, source: 'rules' }));
    const store = makeStore();
    store.dispatch(setSearchQuery('red shoes under 3k'));
    await store.dispatch(searchProducts({ query: 'red shoes under 3k' }) as any);
    expect(store.getState().productSearch.interpreted).toEqual({ color: 'red', maxPrice: 3000, source: 'rules' });
  });

  it('sends removed chips as `ignore` and forgets them when the query changes', async () => {
    mockSearch.mockResolvedValue(ok({ color: 'red' }));
    const store = makeStore();
    store.dispatch(setSearchQuery('red shoes under 3k'));
    store.dispatch(ignoreInterpretation('price'));
    store.dispatch(ignoreInterpretation('price'));
    await store.dispatch(searchProducts({ query: 'red shoes under 3k', brandId: 'b1' }) as any);
    expect(mockSearch).toHaveBeenLastCalledWith('red shoes under 3k', { brandId: 'b1', page: 1, limit: 20, ignore: ['price'] });

    store.dispatch(setSearchQuery('blue kurta'));
    expect(store.getState().productSearch.ignored).toEqual([]);
  });
});
