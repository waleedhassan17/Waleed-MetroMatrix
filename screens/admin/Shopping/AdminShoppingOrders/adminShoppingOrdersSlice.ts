import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAdminOrdersApi,
  type AdminOrderView,
} from '../../../../networks/shopping/adminShoppingApi';

export interface AdminShoppingOrdersState {
  orders: AdminOrderView[];
  statusFilter: string; // 'all' | OrderStatus
  paymentFilter: string; // 'all' | PaymentStatus
  search: string;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
}

const initialState: AdminShoppingOrdersState = {
  orders: [],
  statusFilter: 'all',
  paymentFilter: 'all',
  search: '',
  page: 1,
  pages: 1,
  loading: false,
  error: null,
};

export const fetchAdminOrders = createAsyncThunk(
  'adminShoppingOrders/fetch',
  async (page: number | void, { getState, rejectWithValue }) => {
    try {
      const { adminShoppingOrders } = getState() as { adminShoppingOrders: AdminShoppingOrdersState };
      const res = await fetchAdminOrdersApi({
        page: page || 1,
        limit: 25,
        status: adminShoppingOrders.statusFilter !== 'all' ? adminShoppingOrders.statusFilter : undefined,
        paymentStatus: adminShoppingOrders.paymentFilter !== 'all' ? adminShoppingOrders.paymentFilter : undefined,
        search: adminShoppingOrders.search || undefined,
      });
      return { data: res.data, pagination: res.pagination };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load orders');
    }
  }
);

const adminShoppingOrdersSlice = createSlice({
  name: 'adminShoppingOrders',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<string>) {
      state.statusFilter = action.payload;
    },
    setPaymentFilter(state, action: PayloadAction<string>) {
      state.paymentFilter = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.data;
        state.page = action.payload.pagination.page;
        state.pages = action.payload.pagination.pages;
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setStatusFilter, setPaymentFilter, setSearch } = adminShoppingOrdersSlice.actions;
export const selectAdminShoppingOrders = (state: { adminShoppingOrders: AdminShoppingOrdersState }) =>
  state.adminShoppingOrders;
export default adminShoppingOrdersSlice.reducer;
