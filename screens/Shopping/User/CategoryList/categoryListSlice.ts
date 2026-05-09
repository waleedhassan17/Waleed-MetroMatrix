import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Category } from '../../../../types/shopping';
import { fetchBrandCategoriesApi } from '../../../../networks/shopping/brandApi';

// ── State Interface ─────────────────────────

export interface CategoryListState {
  categories: Category[];
  expandedIds: string[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoryListState = {
  categories: [],
  expandedIds: [],
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchCategories = createAsyncThunk(
  'categoryList/fetchCategories',
  async (brandId: string | undefined, { rejectWithValue }) => {
    try {
      // If brandId provided, fetch brand-specific categories, otherwise global
      const res = await fetchBrandCategoriesApi(brandId || 'global');

      if (!res.success) {
        return rejectWithValue('Failed to fetch categories');
      }

      return res.data;
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection.');
      }
      return rejectWithValue(error.message || 'Failed to load categories.');
    }
  }
);

// ── Slice ───────────────────────────────────

const categoryListSlice = createSlice({
  name: 'categoryList',
  initialState,
  reducers: {
    toggleCategory(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.expandedIds.includes(id)) {
        state.expandedIds = state.expandedIds.filter((eid) => eid !== id);
      } else {
        state.expandedIds.push(id);
      }
    },
    collapseAll(state) {
      state.expandedIds = [];
    },
    resetCategoryList(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { toggleCategory, collapseAll, resetCategoryList } =
  categoryListSlice.actions;

// ── Selectors ───────────────────────────────

export const selectCategoryList = (state: { categoryList: CategoryListState }) => state.categoryList;
export const selectCategories = (state: { categoryList: CategoryListState }) => state.categoryList.categories;
export const selectExpandedIds = (state: { categoryList: CategoryListState }) => state.categoryList.expandedIds;
export const selectCategoryListLoading = (state: { categoryList: CategoryListState }) => state.categoryList.loading;

export default categoryListSlice.reducer;
