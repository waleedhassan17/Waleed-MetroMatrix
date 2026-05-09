import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

const buildSteps = (status: OrderTrackingState['orderStatus']): TrackingStep[] => {
  const all: { key: string; title: string; subtitle: string }[] = [
    { key: 'confirmed', title: 'Order Confirmed', subtitle: 'Your order has been placed' },
    { key: 'processing', title: 'Processing', subtitle: 'Seller is preparing your order' },
    { key: 'shipped', title: 'Shipped', subtitle: 'Package handed to courier' },
    { key: 'out_for_delivery', title: 'Out for Delivery', subtitle: 'Arriving today' },
    { key: 'delivered', title: 'Delivered', subtitle: 'Package delivered' },
  ];
  const statusOrder = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
  const currentIdx = statusOrder.indexOf(status === 'pending' ? 'confirmed' : status);
  return all.map((s, i) => ({
    ...s,
    timestamp: i <= currentIdx ? new Date(Date.now() - (currentIdx - i) * 86400000).toISOString() : null,
    completed: i < currentIdx,
    current: i === currentIdx,
  }));
};

const initialState: OrderTrackingState = {
  currentOrderId: null,
  orderStatus: 'shipped',
  estimatedDelivery: new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-PK', { weekday: 'long', month: 'short', day: 'numeric' }),
  courierName: 'TCS Express',
  trackingNumber: 'TCS-29847261',
  steps: buildSteps('shipped'),
};

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
  },
});

export const { setCurrentOrderId, setOrderStatus } = orderTrackingSlice.actions;
export const selectOrderTracking = (state: { orderTracking: OrderTrackingState }) => state.orderTracking;
export default orderTrackingSlice.reducer;