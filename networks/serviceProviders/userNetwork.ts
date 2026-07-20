// ============================================
// USER NETWORK APIs
// ============================================

import { ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

export interface UserBooking {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceImage: string;
  categoryType: string;
  providerId: string;
  providerName: string;
  providerAvatar: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'upcoming' | 'completed' | 'cancelled';
  date: string;
  time: string;
  address: string;
  price: number;
  rating?: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  isPremium: boolean;
  stats: {
    bookings: number;
    reviews: number;
    points: number;
  };
}

export interface UserAddress {
  id: string;
  label: string;
  address: string;
  city: string;
  isDefault: boolean;
}

export interface UserPaymentMethod {
  id: string;
  type: 'card' | 'wallet' | 'bank';
  label: string;
  lastFour?: string;
  isDefault: boolean;
}

export interface UserProfileData {
  user: UserProfile;
  addresses: UserAddress[];
  paymentMethods: UserPaymentMethod[];
}

export async function fetchUserBookings(params?: {
  status?: string;
}): Promise<ApiResponse<UserBooking[]>> {
    const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);

  return apiRequest<UserBooking[]>(`/user/bookings?${queryParams}`);
}

export async function cancelUserBooking(bookingId: string): Promise<ApiResponse<{ bookingId: string }>> {
    return apiRequest(`/user/bookings/${bookingId}/cancel`, {
    method: 'POST',
  });
}

export async function updateUserBookingStatus(
  bookingId: string,
  status: string
): Promise<ApiResponse<{ bookingId: string; status: string }>> {
    return apiRequest(`/user/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function rateUserBooking(
  bookingId: string,
  rating: number,
  review?: string
): Promise<ApiResponse<{ bookingId: string; rating: number; review?: string }>> {
    return apiRequest(`/user/bookings/${bookingId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating, review }),
  });
}

export async function fetchUserProfile(): Promise<ApiResponse<UserProfileData>> {
    return apiRequest<UserProfileData>('/user/profile');
}

export async function updateUserProfile(
  data: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> {
    return apiRequest<UserProfile>('/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateUserAvatar(avatarUri: string): Promise<ApiResponse<{ avatar: string }>> {
    return apiRequest('/user/profile/avatar', {
    method: 'POST',
    body: JSON.stringify({ avatar: avatarUri }),
  });
}

export async function addUserAddress(
  address: Omit<UserAddress, 'id'>
): Promise<ApiResponse<UserAddress>> {
    return apiRequest<UserAddress>('/user/addresses', {
    method: 'POST',
    body: JSON.stringify(address),
  });
}

export async function deleteUserAddress(addressId: string): Promise<ApiResponse<{ addressId: string }>> {
    return apiRequest(`/user/addresses/${addressId}`, {
    method: 'DELETE',
  });
}

export async function logoutUser(): Promise<ApiResponse<{ success: boolean }>> {
    return apiRequest('/auth/logout', {
    method: 'POST',
  });
}
