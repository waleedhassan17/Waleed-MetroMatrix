import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchInventoryApi, updateStockApi } from '../../../../networks/shopping/vendorApi';

export interface InventoryRow {
  variantId: string;
  productName: string;
  sku: string;
  stockQuantity: number;
  threshold: number;
}

export interface InventoryState {
  rows: InventoryRow[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  rows: [],
  loading: false,
  error: null,
};

export const fetchInventory = createAsyncThunk(
  'inventory/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchInventoryApi();
      return res.data.map((row) => ({
        variantId: row.variantId,
        productName: row.variantLabel ? `${row.productName} - ${row.variantLabel}` : row.productName,
        sku: row.sku,
        stockQuantity: row.stockQuantity,
        // The server computes low/out flags from the platform threshold;
        // reconstruct a display threshold from the flag for the badge logic.
        threshold: row.lowStock ? Math.max(row.stockQuantity, 1) : 5,
      }));
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load inventory');
    }
  }
);

export const updateStock = createAsyncThunk(
  'inventory/updateStock',
  async (
    { variantId, stockQuantity, reason }: { variantId: string; stockQuantity: number; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      await updateStockApi(variantId, stockQuantity, reason);
      return { variantId, stockQuantity };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update stock');
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        const row = state.rows.find((item) => item.variantId === action.payload.variantId);
        if (row) row.stockQuantity = action.payload.stockQuantity;
      })
      .addCase(updateStock.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const selectInventory = (state: { inventory: InventoryState }) => state.inventory;
export default inventorySlice.reducer;
