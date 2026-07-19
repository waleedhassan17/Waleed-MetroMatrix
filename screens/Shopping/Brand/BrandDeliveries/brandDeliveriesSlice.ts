import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchVendorOrdersApi } from '../../../../networks/shopping/vendorApi';
import type { Order } from '../../../../types/shopping';

// ── Types ───────────────────────────────────

export type DeliveryStatus = 'pending_pickup' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
export type DeliveryFilter = 'all' | DeliveryStatus;

export interface Shipment {
  shipmentId: string;
  orderId: string;
  customerName: string;
  customerCity: string;
  courier: string;
  trackingNumber: string;
  status: DeliveryStatus;
  estimatedDelivery: string;
  dispatchedAt: string;
  deliveredAt?: string;
  itemCount: number;
  totalValue: number;
}

export interface CourierStats {
  courierName: string;
  totalShipments: number;
  delivered: number;
  avgDeliveryDays: number;
  successRate: number; // percentage
}

export interface DeliveryKpis {
  totalShipments: number;
  pendingPickup: number;
  inTransit: number;
  delivered: number;
  failed: number;
  avgDeliveryTime: string;
}

export interface BrandDeliveriesState {
  filter: DeliveryFilter;
  searchQuery: string;
  kpis: DeliveryKpis;
  shipments: Shipment[];
  courierStats: CourierStats[];
  loading: boolean;
  error: string | null;
}

// ── Order → shipment mapping ────────────────
// Deliveries are the fulfilment view of my brand's orders: everything
// from 'processing' (awaiting pickup) onwards appears as a shipment.

const ORDER_TO_DELIVERY: Record<string, DeliveryStatus> = {
  processing: 'pending_pickup',
  shipped: 'in_transit',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'failed',
  returned: 'returned',
  refunded: 'returned',
};

const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }) : '-';

const toShipment = (order: Order & { customerName?: string }): Shipment | null => {
  const status = ORDER_TO_DELIVERY[order.orderStatus];
  if (!status) return null;
  return {
    shipmentId: `SHP-${order.odexId}`,
    orderId: order.orderId,
    customerName: order.customerName || order.shippingAddress?.fullName || '',
    customerCity: order.shippingAddress?.city || '',
    courier: order.trackingNumber ? order.trackingNumber.split('-')[0] : 'Courier',
    trackingNumber: order.trackingNumber || '—',
    status,
    estimatedDelivery: shortDate(order.createdAt ? new Date(new Date(order.createdAt).getTime() + 5 * 86400000).toISOString() : undefined),
    dispatchedAt: shortDate(order.createdAt),
    deliveredAt: order.orderStatus === 'delivered' ? shortDate((order as any).deliveredAt || order.createdAt) : undefined,
    itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
    totalValue: order.total,
  };
};

const buildKpis = (shipments: Shipment[]): DeliveryKpis => ({
  totalShipments: shipments.length,
  pendingPickup: shipments.filter((s) => s.status === 'pending_pickup').length,
  inTransit: shipments.filter((s) => s.status === 'in_transit' || s.status === 'out_for_delivery').length,
  delivered: shipments.filter((s) => s.status === 'delivered').length,
  failed: shipments.filter((s) => s.status === 'failed' || s.status === 'returned').length,
  avgDeliveryTime: '—',
});

const buildCourierStats = (shipments: Shipment[]): CourierStats[] => {
  const byCourier = new Map<string, Shipment[]>();
  shipments.forEach((s) => {
    const list = byCourier.get(s.courier) || [];
    list.push(s);
    byCourier.set(s.courier, list);
  });
  return [...byCourier.entries()].map(([courierName, list]) => {
    const delivered = list.filter((s) => s.status === 'delivered').length;
    return {
      courierName,
      totalShipments: list.length,
      delivered,
      avgDeliveryDays: 0,
      successRate: list.length ? Math.round((delivered / list.length) * 1000) / 10 : 0,
    };
  });
};

const initialState: BrandDeliveriesState = {
  filter: 'all',
  searchQuery: '',
  kpis: buildKpis([]),
  shipments: [],
  courierStats: [],
  loading: false,
  error: null,
};

// ── Thunks ──────────────────────────────────

export const fetchDeliveries = createAsyncThunk(
  'brandDeliveries/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchVendorOrdersApi({ page: 1, limit: 100 });
      return res.data
        .map(toShipment)
        .filter((s): s is Shipment => s !== null);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load deliveries');
    }
  }
);

// ── Slice ───────────────────────────────────

const brandDeliveriesSlice = createSlice({
  name: 'brandDeliveries',
  initialState,
  reducers: {
    setDeliveryFilter(state, action: PayloadAction<DeliveryFilter>) {
      state.filter = action.payload;
    },
    setDeliverySearch(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    updateShipmentStatus(state, action: PayloadAction<{ shipmentId: string; status: DeliveryStatus }>) {
      const s = state.shipments.find((sh) => sh.shipmentId === action.payload.shipmentId);
      if (s) {
        s.status = action.payload.status;
        if (action.payload.status === 'delivered') {
          s.deliveredAt = new Date().toLocaleString();
        }
      }
      state.kpis = buildKpis(state.shipments);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeliveries.fulfilled, (state, action) => {
        state.loading = false;
        state.shipments = action.payload;
        state.kpis = buildKpis(action.payload);
        state.courierStats = buildCourierStats(action.payload);
      })
      .addCase(fetchDeliveries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setDeliveryFilter, setDeliverySearch, updateShipmentStatus } =
  brandDeliveriesSlice.actions;

// ── Selectors ───────────────────────────────

export const selectBrandDeliveries = (state: { brandDeliveries: BrandDeliveriesState }) =>
  state.brandDeliveries;

export const selectFilteredShipments = (state: { brandDeliveries: BrandDeliveriesState }) => {
  const { filter, searchQuery, shipments } = state.brandDeliveries;
  let filtered = shipments;
  if (filter !== 'all') {
    filtered = filtered.filter((s) => s.status === filter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.customerName.toLowerCase().includes(q) ||
        s.orderId.toLowerCase().includes(q) ||
        s.trackingNumber.toLowerCase().includes(q) ||
        s.customerCity.toLowerCase().includes(q)
    );
  }
  return filtered;
};

export const selectDeliveryKpis = (state: { brandDeliveries: BrandDeliveriesState }) =>
  state.brandDeliveries.kpis;
export const selectCourierStats = (state: { brandDeliveries: BrandDeliveriesState }) =>
  state.brandDeliveries.courierStats;
export const selectDeliveryFilter = (state: { brandDeliveries: BrandDeliveriesState }) =>
  state.brandDeliveries.filter;
export const selectDeliverySearch = (state: { brandDeliveries: BrandDeliveriesState }) =>
  state.brandDeliveries.searchQuery;

export default brandDeliveriesSlice.reducer;
