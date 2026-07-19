import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchOrderTrackingApi } from '../../../../networks/shopping/orderApi';

export interface TrackingStep {
  key: string;
  title: string;
  subtitle: string;
  timestamp: string | null;
  completed: boolean;
  current: boolean;
}

export interface OrderTrackingState {
  currentOrderId: string | null;
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered';
  estimatedDelivery: string;
  courierName: string;
  trackingNumber: string;
  steps: TrackingStep[];
  loading: boolean;
  error: string | null;
}

const STEP_DEFS: { key: string; title: string; subtitle: string }[] = [
  { key: 'confirmed', title: 'Order Confirmed', subtitle: 'Your order has been placed' },
  { key: 'processing', title: 'Processing', subtitle: 'Seller is preparing your order' },
  { key: 'shipped', title: 'Shipped', subtitle: 'Package handed to courier' },
  { key: 'out_for_delivery', title: 'Out for Delivery', subtitle: 'Arriving today' },
  { key: 'delivered', title: 'Delivered', subtitle: 'Package delivered' },
];
const STATUS_ORDER = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

const buildSteps = (
  status: OrderTrackingState['orderStatus'],
  history: { status: string; changedAt: string }[] = []
): TrackingStep[] => {
  const currentIdx = STATUS_ORDER.indexOf(status === 'pending' ? 'confirmed' : status);
  const timestampFor = (key: string): string | null => {
    const entry = history.find((h) => h.status === key);
    return entry ? entry.changedAt : null;
  };
  return STEP_DEFS.map((s, i) => ({
    ...s,
    timestamp: i <= currentIdx ? timestampFor(s.key) : null,
    completed: i < currentIdx,
    current: i === currentIdx,
  }));
};

const initialState: OrderTrackingState = {
  currentOrderId: null,
  orderStatus: 'pending',
  estimatedDelivery: '',
  courierName: 'Courier',
  trackingNumber: '',
  steps: buildSteps('pending'),
  loading: false,
  error: null,
};

// Fetch real tracking (statusHistory + trackingNumber) for an order or group id
export const fetchTracking = createAsyncThunk(
  'orderTracking/fetch',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const res = await fetchOrderTrackingApi(orderId);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load tracking');
    }
  }
);

const orderTrackingSlice = createSlice({
  name: 'orderTracking',
  initialState,
  reducers: {
    setCurrentOrderId(state, action: PayloadAction<string>) {
      state.currentOrderId = action.payload;
    },
    setOrderStatus(state, action: PayloadAction<OrderTrackingState['orderStatus']>) {
      state.orderStatus = action.payload;
      state.steps = buildSteps(action.payload);
    },
    setTrackingData(
      state,
      action: PayloadAction<{
        orderId: string;
        status: OrderTrackingState['orderStatus'];
        courierName?: string;
        trackingNumber?: string;
        estimatedDelivery?: string;
      }>
    ) {
      const { orderId, status, courierName, trackingNumber, estimatedDelivery } = action.payload;
      state.currentOrderId = orderId;
      state.orderStatus = status;
      state.steps = buildSteps(status);
      if (courierName) state.courierName = courierName;
      if (trackingNumber) state.trackingNumber = trackingNumber;
      if (estimatedDelivery) state.estimatedDelivery = estimatedDelivery;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTracking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTracking.fulfilled, (state, action) => {
        const data = action.payload;
        state.loading = false;
        state.currentOrderId = data.orderId;
        const status = (
          ['cancelled', 'returned', 'refunded'].includes(data.orderStatus)
            ? 'delivered'
            : data.orderStatus
        ) as OrderTrackingState['orderStatus'];
        state.orderStatus = status;
        state.trackingNumber = data.trackingNumber || '';
        state.steps = buildSteps(status, data.statusHistory);
        const confirmed = data.statusHistory.find((h) => h.status === 'confirmed');
        if (confirmed) {
          state.estimatedDelivery = new Date(
            new Date(confirmed.changedAt).getTime() + 5 * 86400000
          ).toLocaleDateString('en-PK', { weekday: 'long', month: 'short', day: 'numeric' });
        }
      })
      .addCase(fetchTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentOrderId, setOrderStatus, setTrackingData } = orderTrackingSlice.actions;
export const selectOrderTracking = (state: { orderTracking: OrderTrackingState }) => state.orderTracking;
export default orderTrackingSlice.reducer;
