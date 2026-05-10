import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

// ── Sample Data ─────────────────────────────

const SAMPLE_SHIPMENTS: Shipment[] = [
  {
    shipmentId: 'SHP-4001',
    orderId: 'ORD-20018',
    customerName: 'Ayesha Khan',
    customerCity: 'Lahore',
    courier: 'TCS Express',
    trackingNumber: 'TCS-29847261',
    status: 'in_transit',
    estimatedDelivery: 'Tomorrow',
    dispatchedAt: 'Today, 2:30 PM',
    itemCount: 3,
    totalValue: 12400,
  },
  {
    shipmentId: 'SHP-4002',
    orderId: 'ORD-20017',
    customerName: 'Hassan Ali',
    customerCity: 'Karachi',
    courier: 'Leopards',
    trackingNumber: 'LEO-83742156',
    status: 'out_for_delivery',
    estimatedDelivery: 'Today',
    dispatchedAt: 'Yesterday',
    itemCount: 1,
    totalValue: 8600,
  },
  {
    shipmentId: 'SHP-4003',
    orderId: 'ORD-20016',
    customerName: 'Maya Noor',
    customerCity: 'Islamabad',
    courier: 'TCS Express',
    trackingNumber: 'TCS-29847260',
    status: 'delivered',
    estimatedDelivery: 'May 8',
    dispatchedAt: 'May 6',
    deliveredAt: 'May 8, 11:20 AM',
    itemCount: 2,
    totalValue: 15650,
  },
  {
    shipmentId: 'SHP-4004',
    orderId: 'ORD-20015',
    customerName: 'Ahmed Raza',
    customerCity: 'Rawalpindi',
    courier: 'DHL',
    trackingNumber: 'DHL-91823456',
    status: 'pending_pickup',
    estimatedDelivery: 'May 14',
    dispatchedAt: '-',
    itemCount: 4,
    totalValue: 22100,
  },
  {
    shipmentId: 'SHP-4005',
    orderId: 'ORD-20014',
    customerName: 'Fatima Syed',
    customerCity: 'Faisalabad',
    courier: 'Leopards',
    trackingNumber: 'LEO-83742155',
    status: 'failed',
    estimatedDelivery: 'May 7',
    dispatchedAt: 'May 5',
    itemCount: 1,
    totalValue: 4500,
  },
  {
    shipmentId: 'SHP-4006',
    orderId: 'ORD-20013',
    customerName: 'Usman Tariq',
    customerCity: 'Multan',
    courier: 'TCS Express',
    trackingNumber: 'TCS-29847259',
    status: 'delivered',
    estimatedDelivery: 'May 6',
    dispatchedAt: 'May 4',
    deliveredAt: 'May 6, 3:45 PM',
    itemCount: 2,
    totalValue: 9800,
  },
  {
    shipmentId: 'SHP-4007',
    orderId: 'ORD-20012',
    customerName: 'Sana Malik',
    customerCity: 'Lahore',
    courier: 'DHL',
    trackingNumber: 'DHL-91823455',
    status: 'in_transit',
    estimatedDelivery: 'May 12',
    dispatchedAt: 'Today, 10:15 AM',
    itemCount: 5,
    totalValue: 31200,
  },
  {
    shipmentId: 'SHP-4008',
    orderId: 'ORD-20011',
    customerName: 'Bilal Shah',
    customerCity: 'Peshawar',
    courier: 'Leopards',
    trackingNumber: 'LEO-83742154',
    status: 'returned',
    estimatedDelivery: 'May 5',
    dispatchedAt: 'May 3',
    itemCount: 1,
    totalValue: 6200,
  },
];

const SAMPLE_COURIER_STATS: CourierStats[] = [
  { courierName: 'TCS Express', totalShipments: 42, delivered: 38, avgDeliveryDays: 2.4, successRate: 96.2 },
  { courierName: 'Leopards', totalShipments: 28, delivered: 24, avgDeliveryDays: 3.1, successRate: 91.5 },
  { courierName: 'DHL', totalShipments: 14, delivered: 13, avgDeliveryDays: 1.8, successRate: 98.0 },
];

const buildKpis = (shipments: Shipment[]): DeliveryKpis => ({
  totalShipments: shipments.length,
  pendingPickup: shipments.filter((s) => s.status === 'pending_pickup').length,
  inTransit: shipments.filter((s) => s.status === 'in_transit' || s.status === 'out_for_delivery').length,
  delivered: shipments.filter((s) => s.status === 'delivered').length,
  failed: shipments.filter((s) => s.status === 'failed' || s.status === 'returned').length,
  avgDeliveryTime: '2.6 days',
});

const initialState: BrandDeliveriesState = {
  filter: 'all',
  searchQuery: '',
  kpis: buildKpis(SAMPLE_SHIPMENTS),
  shipments: SAMPLE_SHIPMENTS,
  courierStats: SAMPLE_COURIER_STATS,
  loading: false,
};

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
