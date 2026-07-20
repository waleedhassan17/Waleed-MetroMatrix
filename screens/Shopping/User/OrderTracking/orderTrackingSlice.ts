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

export type OrderTrackingStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export interface OrderTrackingState {
  currentOrderId: string | null;
  orderStatus: OrderTrackingStatus;
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
  status: OrderTrackingStatus,
  history: { status: string; changedAt: string }[] = []
): TrackingStep[] => {
  const timestampFor = (key: string): string | null => {
    const entry = history.find((h) => h.status === key);
    return entry ? entry.changedAt : null;
  };

  // Cancellation can happen from pending/confirmed/processing (see backend
  // ALLOWED_TRANSITIONS) — completed steps are whatever's actually in the
  // history, and the chain stops there. It must never be shown as delivered.
  if (status === 'cancelled') {
    const reachedKeys = new Set(history.map((h) => h.status));
    const normalSteps = STEP_DEFS.filter((s) => s.key !== 'delivered').map((s) => ({
      ...s,
      timestamp: reachedKeys.has(s.key) ? timestampFor(s.key) : null,
      completed: reachedKeys.has(s.key),
      current: false,
    }));
    return [
      ...normalSteps,
      {
        key: 'cancelled',
        title: 'Order Cancelled',
        subtitle: 'This order was cancelled',
        timestamp: timestampFor('cancelled'),
        completed: true,
        current: true,
      },
    ];
  }

  // returned/refunded only happen after a real delivery (delivered → returned
  // → refunded), so the normal steps genuinely did complete — but the extra
  // terminal step must be shown too, not silently dropped.
  if (status === 'returned' || status === 'refunded') {
    const normalSteps = STEP_DEFS.map((s) => ({
      ...s,
      timestamp: timestampFor(s.key),
      completed: true,
      current: false,
    }));
    const extraSteps: TrackingStep[] = [
      {
        key: 'returned',
        title: 'Returned',
        subtitle: 'Item returned to seller',
        timestamp: timestampFor('returned'),
        completed: true,
        current: status === 'returned',
      },
    ];
    if (status === 'refunded') {
      extraSteps.push({
        key: 'refunded',
        title: 'Refunded',
        subtitle: 'Refund completed to your wallet',
        timestamp: timestampFor('refunded'),
        completed: true,
        current: true,
      });
    }
    return [...normalSteps, ...extraSteps];
  }

  const currentIdx = STATUS_ORDER.indexOf(status === 'pending' ? 'confirmed' : status);
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
    setOrderStatus(state, action: PayloadAction<OrderTrackingStatus>) {
      state.orderStatus = action.payload;
      state.steps = buildSteps(action.payload);
    },
    setTrackingData(
      state,
      action: PayloadAction<{
        orderId: string;
        status: OrderTrackingStatus;
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
        const status = data.orderStatus as OrderTrackingStatus;
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
