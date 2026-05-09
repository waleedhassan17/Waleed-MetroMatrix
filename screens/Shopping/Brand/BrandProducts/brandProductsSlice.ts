import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../../../types/shopping';
import { OUTFITTERS_PRODUCTS } from '../../../../networks/shopping/dummyData';

export interface BrandProductsState {
  products: Product[];
  searchQuery: string;
  stockFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}

const initialState: BrandProductsState = {
  products: OUTFITTERS_PRODUCTS,
  searchQuery: '',
  stockFilter: 'all',
};

const brandProductsSlice = createSlice({
  name: 'brandProducts',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setStockFilter(state, action: PayloadAction<BrandProductsState['stockFilter']>) {
      state.stockFilter = action.payload;
    },
    removeProduct(state, action: PayloadAction<string>) {
      state.products = state.products.filter((product) => product.productId !== action.payload);
    },
    upsertProduct(state, action: PayloadAction<Product>) {
      const index = state.products.findIndex((product) => product.productId === action.payload.productId);
      if (index >= 0) {
        state.products[index] = action.payload;
      } else {
        state.products.unshift(action.payload);
      }
    },
  },
});

export const { setSearchQuery, setStockFilter, removeProduct, upsertProduct } = brandProductsSlice.actions;
export const selectBrandProducts = (state: { brandProducts: BrandProductsState }) => state.brandProducts;
export default brandProductsSlice.reducer;