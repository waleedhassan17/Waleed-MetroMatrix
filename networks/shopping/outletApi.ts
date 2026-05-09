// ============================================
// Shopping Module - Outlet API
// Uses dummy data until backend is ready.
// ============================================

import type {
  OutletConfig,
  OutletColorScheme,
  PaginatedResponse,
  SingleResponse,
} from '../../types/shopping';
import { simulateDelay, paginateArray } from './dummyData';

// ── Dummy Outlet Data ──────────────────────────

const DUMMY_OUTLETS: OutletConfig[] = [
  {
    outletId: 'OL-001',
    name: 'Outfitters Gulberg',
    slug: 'outfitters-gulberg',
    description: 'Flagship store in the heart of Gulberg, Lahore.',
    brandId: 'brand-outfitters',
    brandName: 'Outfitters',
    brandPrimaryColor: '#1A1A2E',
    colorScheme: {
      primaryColor: '#1A1A2E',
      secondaryColor: '#E67E22',
      accentColor: '#F1C40F',
      headerBg: '#1A1A2E',
      textOnHeader: '#FFFFFF',
    },
    location: {
      address: 'M.M. Alam Road, Gulberg III',
      city: 'Lahore',
      state: 'Punjab',
      country: 'Pakistan',
      postalCode: '54000',
      latitude: 31.5204,
      longitude: 74.3587,
    },
    phone: '+92-42-35761234',
    email: 'gulberg@outfitters.com.pk',
    openingHours: 'Mon–Sun: 11:00 AM – 10:00 PM',
    managerName: 'Ahmed Raza',
    isActive: true,
    images: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      'https://images.unsplash.com/photo-1528698827591-e19cef791f48?w=800',
    ],
    floorArea: 4500,
    createdAt: '2024-08-15T00:00:00.000Z',
  },
  {
    outletId: 'OL-002',
    name: 'Outfitters DHA',
    slug: 'outfitters-dha',
    description: 'Premium outlet at DHA Phase 5, Karachi.',
    brandId: 'brand-outfitters',
    brandName: 'Outfitters',
    brandPrimaryColor: '#1A1A2E',
    colorScheme: {
      primaryColor: '#1A1A2E',
      secondaryColor: '#E67E22',
      accentColor: '#F1C40F',
      headerBg: '#1A1A2E',
      textOnHeader: '#FFFFFF',
    },
    location: {
      address: 'Khayaban-e-Shahbaz, DHA Phase 5',
      city: 'Karachi',
      state: 'Sindh',
      country: 'Pakistan',
      postalCode: '75500',
      latitude: 24.8093,
      longitude: 67.0659,
    },
    phone: '+92-21-35881234',
    email: 'dha@outfitters.com.pk',
    openingHours: 'Mon–Sun: 11:00 AM – 10:30 PM',
    managerName: 'Fatima Malik',
    isActive: true,
    images: [
      'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800',
    ],
    floorArea: 3800,
    createdAt: '2024-10-01T00:00:00.000Z',
  },
  {
    outletId: 'OL-003',
    name: 'Outfitters F-7',
    slug: 'outfitters-f7',
    description: 'Islamabad flagship in F-7 Markaz.',
    brandId: 'brand-outfitters',
    brandName: 'Outfitters',
    brandPrimaryColor: '#1A1A2E',
    colorScheme: {
      primaryColor: '#1A1A2E',
      secondaryColor: '#E67E22',
      accentColor: '#F1C40F',
      headerBg: '#1A1A2E',
      textOnHeader: '#FFFFFF',
    },
    location: {
      address: 'Jinnah Super Market, F-7 Markaz',
      city: 'Islamabad',
      state: 'Islamabad Capital Territory',
      country: 'Pakistan',
      postalCode: '44000',
      latitude: 33.7215,
      longitude: 73.0590,
    },
    phone: '+92-51-26511234',
    email: 'f7@outfitters.com.pk',
    openingHours: 'Mon–Sat: 11:00 AM – 9:30 PM',
    managerName: 'Omar Shahid',
    isActive: false,
    images: [
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800',
    ],
    floorArea: 2800,
    createdAt: '2025-01-10T00:00:00.000Z',
  },
];

let ALL_OUTLETS = [...DUMMY_OUTLETS];

// ── API Implementations ────────────────────────

// GET /outlets
export const fetchOutletsApi = async ({
  page = 1,
  limit = 20,
  brandId,
}: { page?: number; limit?: number; brandId?: string } = {}): Promise<PaginatedResponse<OutletConfig>> => {
  await simulateDelay(300);
  let filtered = ALL_OUTLETS;
  if (brandId) {
    filtered = filtered.filter((o) => o.brandId === brandId);
  }
  console.log(`✅ [Dummy] Fetched ${filtered.length} outlets`);
  return paginateArray(filtered, page, limit);
};

// GET /outlets/:outletId
export const fetchOutletByIdApi = async (outletId: string): Promise<SingleResponse<OutletConfig>> => {
  await simulateDelay(200);
  const outlet = ALL_OUTLETS.find((o) => o.outletId === outletId);
  if (!outlet) throw new Error('Outlet not found');
  console.log(`✅ [Dummy] Outlet fetched: ${outlet.name}`);
  return { success: true, data: outlet };
};

// POST /outlets
export const createOutletApi = async (
  payload: Omit<OutletConfig, 'outletId' | 'createdAt' | 'updatedAt'>
): Promise<SingleResponse<OutletConfig>> => {
  await simulateDelay(400);
  const newOutlet: OutletConfig = {
    ...payload,
    outletId: `OL-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  ALL_OUTLETS.unshift(newOutlet);
  console.log(`✅ [Dummy] Outlet created: ${newOutlet.name}`);
  return { success: true, data: newOutlet };
};

// PUT /outlets/:outletId
export const updateOutletApi = async (
  outletId: string,
  payload: Partial<OutletConfig>
): Promise<SingleResponse<OutletConfig>> => {
  await simulateDelay(300);
  const idx = ALL_OUTLETS.findIndex((o) => o.outletId === outletId);
  if (idx < 0) throw new Error('Outlet not found');
  ALL_OUTLETS[idx] = { ...ALL_OUTLETS[idx], ...payload, updatedAt: new Date().toISOString() };
  console.log(`✅ [Dummy] Outlet updated: ${ALL_OUTLETS[idx].name}`);
  return { success: true, data: ALL_OUTLETS[idx] };
};

// DELETE /outlets/:outletId
export const deleteOutletApi = async (outletId: string): Promise<{ success: boolean }> => {
  await simulateDelay(300);
  ALL_OUTLETS = ALL_OUTLETS.filter((o) => o.outletId !== outletId);
  console.log(`✅ [Dummy] Outlet deleted: ${outletId}`);
  return { success: true };
};

// PATCH /outlets/:outletId/assign-brand
export const assignBrandToOutletApi = async (
  outletId: string,
  brandId: string
): Promise<SingleResponse<OutletConfig>> => {
  await simulateDelay(300);
  const idx = ALL_OUTLETS.findIndex((o) => o.outletId === outletId);
  if (idx < 0) throw new Error('Outlet not found');
  ALL_OUTLETS[idx] = { ...ALL_OUTLETS[idx], brandId, updatedAt: new Date().toISOString() };
  console.log(`✅ [Dummy] Brand ${brandId} assigned to outlet ${outletId}`);
  return { success: true, data: ALL_OUTLETS[idx] };
};

// PATCH /outlets/:outletId/color-scheme
export const updateOutletColorSchemeApi = async (
  outletId: string,
  colorScheme: OutletColorScheme
): Promise<SingleResponse<OutletConfig>> => {
  await simulateDelay(300);
  const idx = ALL_OUTLETS.findIndex((o) => o.outletId === outletId);
  if (idx < 0) throw new Error('Outlet not found');
  ALL_OUTLETS[idx] = { ...ALL_OUTLETS[idx], colorScheme, updatedAt: new Date().toISOString() };
  console.log(`✅ [Dummy] Color scheme updated for outlet ${outletId}`);
  return { success: true, data: ALL_OUTLETS[idx] };
};

// PATCH /outlets/:outletId/toggle-status
export const toggleOutletStatusApi = async (outletId: string): Promise<SingleResponse<OutletConfig>> => {
  await simulateDelay(200);
  const idx = ALL_OUTLETS.findIndex((o) => o.outletId === outletId);
  if (idx < 0) throw new Error('Outlet not found');
  ALL_OUTLETS[idx] = {
    ...ALL_OUTLETS[idx],
    isActive: !ALL_OUTLETS[idx].isActive,
    updatedAt: new Date().toISOString(),
  };
  console.log(`✅ [Dummy] Outlet ${outletId} toggled to ${ALL_OUTLETS[idx].isActive ? 'active' : 'inactive'}`);
  return { success: true, data: ALL_OUTLETS[idx] };
};
