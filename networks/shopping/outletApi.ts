// ============================================
// Shopping Module - Outlet API (real backend)
// Admin outlet management endpoints (/admin/outlets) — used by the
// OutletManagement / AddOutlet / OutletDetail admin screens.
// ============================================

import type {
  OutletConfig,
  OutletColorScheme,
  PaginatedResponse,
  SingleResponse,
} from '../../types/shopping';
import ShoppingAxiosInstance, { extractShoppingError } from './shoppingAxios';

// GET /admin/outlets
export const fetchOutletsApi = async ({
  page = 1,
  limit = 20,
  brandId,
}: { page?: number; limit?: number; brandId?: string } = {}): Promise<PaginatedResponse<OutletConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.get('/admin/outlets', {
      params: { page, limit, brandId },
    });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to load outlets'));
  }
};

// GET /admin/outlets/:outletId
export const fetchOutletByIdApi = async (outletId: string): Promise<SingleResponse<OutletConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.get(`/admin/outlets/${outletId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to load outlet'));
  }
};

// POST /admin/outlets
export const createOutletApi = async (
  payload: Omit<OutletConfig, 'outletId' | 'createdAt' | 'updatedAt'>
): Promise<SingleResponse<OutletConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.post('/admin/outlets', payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to create outlet'));
  }
};

// PUT /admin/outlets/:outletId
export const updateOutletApi = async (
  outletId: string,
  payload: Partial<OutletConfig>
): Promise<SingleResponse<OutletConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.put(`/admin/outlets/${outletId}`, payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to update outlet'));
  }
};

// DELETE /admin/outlets/:outletId
export const deleteOutletApi = async (outletId: string): Promise<{ success: boolean }> => {
  try {
    const res = await ShoppingAxiosInstance.delete(`/admin/outlets/${outletId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to delete outlet'));
  }
};

// PATCH /admin/outlets/:outletId/assign-brand
export const assignBrandToOutletApi = async (
  outletId: string,
  brandId: string
): Promise<SingleResponse<OutletConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.patch(`/admin/outlets/${outletId}/assign-brand`, {
      brandId,
    });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to assign brand'));
  }
};

// PATCH /admin/outlets/:outletId/color-scheme
export const updateOutletColorSchemeApi = async (
  outletId: string,
  colorScheme: OutletColorScheme
): Promise<SingleResponse<OutletConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.patch(`/admin/outlets/${outletId}/color-scheme`, {
      colorScheme,
    });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to update colour scheme'));
  }
};

// PATCH /admin/outlets/:outletId/toggle-status
export const toggleOutletStatusApi = async (outletId: string): Promise<SingleResponse<OutletConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.patch(`/admin/outlets/${outletId}/toggle-status`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to toggle outlet status'));
  }
};
