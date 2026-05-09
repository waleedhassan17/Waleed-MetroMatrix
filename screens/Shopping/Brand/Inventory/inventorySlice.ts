import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface InventoryRow {
  variantId: string;
  productName: string;
  sku: string;
  stockQuantity: number;
  threshold: number;
}

export interface InventoryState {
  rows: InventoryRow[];
}

const initialState: InventoryState = {
  rows: [
    { variantId: 'V-1', productName: 'Classic Cotton Shirt - M', sku: 'SKU-1001-M', stockQuantity: 4, threshold: 5 },
    { variantId: 'V-2', productName: 'Slim Fit Trouser - L', sku: 'SKU-1002-L', stockQuantity: 1, threshold: 5 },
    { variantId: 'V-3', productName: 'Running Shoe - 42', sku: 'SKU-1003-42', stockQuantity: 0, threshold: 3 },
  ],
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    updateStock(state, action: PayloadAction<{ variantId: string; stockQuantity: number }>) {
      const row = state.rows.find((item) => item.variantId === action.payload.variantId);
      if (row) {
        row.stockQuantity = action.payload.stockQuantity;
      }
    },
  },
});

export const { updateStock } = inventorySlice.actions;
export const selectInventory = (state: { inventory: InventoryState }) => state.inventory;
export default inventorySlice.reducer;