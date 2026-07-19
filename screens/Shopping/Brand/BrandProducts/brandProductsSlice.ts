import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../../../types/shopping';
import { fetchMyProductsApi } from '../../../../networks/shopping/vendorApi';
import { deleteProductApi } from '../../../../networks/shopping/productApi';

export interface BrandProductsState {
  products: Product[];
  searchQuery: string;
  stockFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  loading: boolean;
  error: string | null;
}

const initialState: BrandProductsState = {
  products: [],
  searchQuery: '',
  stockFilter: 'all',
  loading: false,
  error: null,
};

export const fetchBrandProducts = createAsyncThunk(
  'brandProducts/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchMyProductsApi({ page: 1, limit: 100 });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load your products');
    }
  }
);

export const removeProduct = createAsyncThunk(
  'brandProducts/remove',
  async (productId: string, { rejectWithValue }) => {
    try {
      await deleteProductApi(productId);
      return productId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete product');
    }
  }
);

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
    upsertProduct(state, action: PayloadAction<Product>) {
      const index = state.products.findIndex((product) => product.productId === action.payload.productId);
      if (index >= 0) {
        state.products[index] = action.payload;
      } else {
        state.products.unshift(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchBrandProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(removeProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((product) => product.productId !== action.payload);
      })
      .addCase(removeProduct.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, setStockFilter, upsertProduct } = brandProductsSlice.actions;
export const selectBrandProducts = (state: { brandProducts: BrandProductsState }) => state.brandProducts;
export default brandProductsSlice.reducer;
