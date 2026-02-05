// ============================================
// USER NETWORK APIs
// ============================================

import { ApiResponse } from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

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

const DUMMY_USER_BOOKINGS: UserBooking[] = [
  {
    id: 'b1',
    serviceId: 's1',
    serviceName: 'AC Repair',
    serviceImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd',
    categoryType: 'maintenance',
    providerId: 'p1',
    providerName: 'Ahmad Khan',
    providerAvatar: 'https://i.pravatar.cc/100?img=1',
    status: 'completed',
    date: '2026-01-10',
    time: '10:00 AM',
    address: '123 Main St, Islamabad',
    price: 2500,
    rating: 5,
    review: 'Excellent service!',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 'b2',
    serviceId: 's2',
    serviceName: 'Plumbing',
    serviceImage: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7',
    categoryType: 'maintenance',
    providerId: 'p2',
    providerName: 'Usman Ali',
    providerAvatar: 'https://i.pravatar.cc/100?img=2',
    status: 'upcoming',
    date: '2026-01-15',
    time: '2:00 PM',
    address: '456 Park Ave, Lahore',
    price: 1800,
    createdAt: '2026-01-11T08:00:00Z',
    updatedAt: '2026-01-11T08:00:00Z',
  },
];

const DUMMY_USER_PROFILE: UserProfile = {
  id: 'user-1',
  name: 'Muhammad Ali',
  email: 'muhammad.ali@email.com',
  phone: '+92 300 1234567',
  avatar: 'https://i.pravatar.cc/200?img=68',
  isPremium: true,
  stats: {
    bookings: 12,
    reviews: 8,
    points: 240,
  },
};

const DUMMY_USER_ADDRESSES: UserAddress[] = [
  {
    id: 'addr-1',
    label: 'Home',
    address: '123 Main Street, Gulberg III',
    city: 'Lahore',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Office',
    address: '456 Business Park, DHA Phase 5',
    city: 'Lahore',
    isDefault: false,
  },
];

const DUMMY_USER_PAYMENT_METHODS: UserPaymentMethod[] = [
  {
    id: 'pay-1',
    type: 'card',
    label: 'Visa',
    lastFour: '4242',
    isDefault: true,
  },
  {
    id: 'pay-2',
    type: 'wallet',
    label: 'JazzCash',
    isDefault: false,
  },
];

export async function fetchUserBookings(params?: {
  status?: string;
}): Promise<ApiResponse<UserBooking[]>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    let bookings = [...DUMMY_USER_BOOKINGS];
    if (params?.status && params.status !== 'all') {
      bookings = bookings.filter((b) => b.status === params.status);
    }

    return {
      success: true,
      data: bookings,
      message: 'Bookings fetched',
    };
  }

  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);

  return apiRequest<UserBooking[]>(`/user/bookings?${queryParams}`);
}

export async function cancelUserBooking(bookingId: string): Promise<ApiResponse<{ bookingId: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { bookingId },
      message: 'Booking cancelled',
    };
  }

  return apiRequest(`/user/bookings/${bookingId}/cancel`, {
    method: 'POST',
  });
}

export async function updateUserBookingStatus(
  bookingId: string,
  status: string
): Promise<ApiResponse<{ bookingId: string; status: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { bookingId, status },
      message: 'Booking status updated',
    };
  }

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
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { bookingId, rating, review },
      message: 'Booking rated',
    };
  }

  return apiRequest(`/user/bookings/${bookingId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating, review }),
  });
}

export async function fetchUserProfile(): Promise<ApiResponse<UserProfileData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      data: {
        user: DUMMY_USER_PROFILE,
        addresses: DUMMY_USER_ADDRESSES,
        paymentMethods: DUMMY_USER_PAYMENT_METHODS,
      },
      message: 'Profile fetched',
    };
  }

  return apiRequest<UserProfileData>('/user/profile');
}

export async function updateUserProfile(
  data: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { ...DUMMY_USER_PROFILE, ...data },
      message: 'Profile updated',
    };
  }

  return apiRequest<UserProfile>('/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateUserAvatar(avatarUri: string): Promise<ApiResponse<{ avatar: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      data: { avatar: avatarUri },
      message: 'Avatar updated',
    };
  }

  return apiRequest('/user/profile/avatar', {
    method: 'POST',
    body: JSON.stringify({ avatar: avatarUri }),
  });
}

export async function addUserAddress(
  address: Omit<UserAddress, 'id'>
): Promise<ApiResponse<UserAddress>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { ...address, id: `addr-${Date.now()}` },
      message: 'Address added',
    };
  }

  return apiRequest<UserAddress>('/user/addresses', {
    method: 'POST',
    body: JSON.stringify(address),
  });
}

export async function deleteUserAddress(addressId: string): Promise<ApiResponse<{ addressId: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { addressId },
      message: 'Address deleted',
    };
  }

  return apiRequest(`/user/addresses/${addressId}`, {
    method: 'DELETE',
  });
}

export async function logoutUser(): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { success: true },
      message: 'Logged out',
    };
  }

  return apiRequest('/auth/logout', {
    method: 'POST',
  });
}
