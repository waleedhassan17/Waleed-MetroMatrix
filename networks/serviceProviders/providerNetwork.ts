// ============================================
// PROVIDER NETWORK APIs
// ============================================

import {
  Provider,
  ProviderDetails,
  Pagination,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';
import { DUMMY_PROVIDERS } from './dummyData';

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
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    let filtered = DUMMY_PROVIDERS.filter((p) => p.category === params.category);
    
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.specialty.toLowerCase().includes(searchLower)
      );
    }
    
    if (params.filters?.minRating) {
      filtered = filtered.filter((p) => p.rating >= params.filters!.minRating!);
    }
    
    if (params.filters?.maxPrice) {
      filtered = filtered.filter((p) => p.price <= params.filters!.maxPrice!);
    }
    
    if (params.filters?.verified) {
      filtered = filtered.filter((p) => p.verified);
    }
    
    if (params.filters?.available) {
      filtered = filtered.filter((p) => p.available);
    }

    return {
      success: true,
      data: {
        providers: filtered,
        pagination: {
          currentPage: params.page || 1,
          totalPages: 1,
          totalItems: filtered.length,
          itemsPerPage: params.limit || 15,
          hasNext: false,
          hasPrevious: false,
        },
      },
      message: 'Providers fetched successfully',
    };
  }

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
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const provider = DUMMY_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      return { success: false, data: null as any, message: 'Provider not found' };
    }

    const providerDetails: ProviderDetails = {
      ...provider,
      servicesOffered: [
        { id: '1', name: 'Basic Repair', description: 'Standard repair service', price: 500, duration: '1 hour', icon: 'settings' },
        { id: '2', name: 'Installation', description: 'New installation service', price: 1500, duration: '2-3 hours', icon: 'construct' },
        { id: '3', name: 'Inspection', description: 'Safety inspection', price: 300, duration: '30 mins', icon: 'search' },
      ],
      availability: [
        { id: '1', day: 'Monday', timeSlots: ['09:00 AM - 12:00 PM', '02:00 PM - 06:00 PM'], available: true },
        { id: '2', day: 'Tuesday', timeSlots: ['09:00 AM - 06:00 PM'], available: true },
        { id: '3', day: 'Wednesday', timeSlots: ['09:00 AM - 06:00 PM'], available: true },
      ],
      gallery: [
        { id: '1', image: 'https://picsum.photos/400/300?random=1', title: 'Recent Work 1', category: 'Installation' },
        { id: '2', image: 'https://picsum.photos/400/300?random=2', title: 'Recent Work 2', category: 'Repair' },
      ],
      reviewsList: [
        { id: '1', reviewerName: 'Sarah M.', reviewerInitial: 'S', rating: 5, comment: 'Excellent work! Very professional.', date: '2024-01-10', helpfulCount: 12, avatarColor: '#4F46E5', tags: ['Professional', 'On Time'] },
        { id: '2', reviewerName: 'Ali K.', reviewerInitial: 'A', rating: 4, comment: 'Good service, reasonable price.', date: '2024-01-08', helpfulCount: 5, avatarColor: '#10B981', tags: ['Good Value'] },
      ],
    };

    return { success: true, data: providerDetails, message: 'Provider details fetched' };
  }

  return apiRequest<ProviderDetails>(`/providers/${providerId}`);
}

export async function fetchProviderProfile(): Promise<ApiResponse<ProviderDetails>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const provider = DUMMY_PROVIDERS[0];
    return {
      success: true,
      data: {
        ...provider,
        servicesOffered: [
          { id: '1', name: 'Basic Repair', description: 'Standard repair service', price: 500, duration: '1 hour', icon: 'settings' },
          { id: '2', name: 'Installation', description: 'New installation service', price: 1500, duration: '2-3 hours', icon: 'construct' },
        ],
        availability: [
          { id: '1', day: 'Monday', timeSlots: ['09:00 AM - 06:00 PM'], available: true },
          { id: '2', day: 'Tuesday', timeSlots: ['09:00 AM - 06:00 PM'], available: true },
        ],
        gallery: [],
        reviewsList: [],
      },
      message: 'Profile fetched',
    };
  }

  return apiRequest<ProviderDetails>('/provider/profile');
}

export async function updateProviderProfile(
  data: Partial<Provider>
): Promise<ApiResponse<Provider>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { ...DUMMY_PROVIDERS[0], ...data },
      message: 'Profile updated',
    };
  }

  return apiRequest<Provider>('/provider/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateProviderOnlineStatus(
  isOnline: boolean
): Promise<ApiResponse<{ isOnline: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { success: true, data: { isOnline }, message: 'Status updated' };
  }

  return apiRequest('/provider/status', {
    method: 'PATCH',
    body: JSON.stringify({ isOnline }),
  });
}
