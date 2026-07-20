// ============================================
// PROVIDER NETWORK APIs
// ============================================

import {
  Provider,
  ProviderDetails,
  Pagination,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchProviders(params: {
  category: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  filters?: {
    minRating?: number;
    maxPrice?: number;
    verified?: boolean;
    available?: boolean;
  };
}): Promise<ApiResponse<{ providers: Provider[]; pagination: Pagination }>> {
    const queryParams = new URLSearchParams({
    category: params.category,
    page: String(params.page || 1),
    limit: String(params.limit || 15),
    ...(params.search && { search: params.search }),
    ...(params.sort && { sort: params.sort }),
    ...(params.filters && { filters: JSON.stringify(params.filters) }),
  });

  return apiRequest<{ providers: Provider[]; pagination: Pagination }>(
    `/providers?${queryParams}`
  );
}

export async function fetchProviderDetails(
  providerId: string
): Promise<ApiResponse<ProviderDetails>> {
    return apiRequest<ProviderDetails>(`/providers/${providerId}`);
}

export async function fetchProviderProfile(): Promise<ApiResponse<ProviderDetails>> {
    return apiRequest<ProviderDetails>('/provider/profile');
}

export async function updateProviderProfile(
  data: Partial<Provider>
): Promise<ApiResponse<Provider>> {
    return apiRequest<Provider>('/provider/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateProviderOnlineStatus(
  isOnline: boolean
): Promise<ApiResponse<{ isOnline: boolean }>> {
    return apiRequest('/provider/status', {
    method: 'PATCH',
    body: JSON.stringify({ isOnline }),
  });
}
