// ============================================
// PROVIDER SERIALIZERS
// ============================================

import {
  Provider,
  ProviderDetails,
  ProviderService,
  ProviderAvailability,
  GalleryItem,
  Review,
  Coordinates,
} from '../../models/serviceProviders';
import { reviewSerializer } from './reviewSerializer';

export function providerSerializer(data: any): Provider {
  return {
    id: data?.id || data?._id || '',
    name: data?.name || data?.fullName || '',
    image: data?.image || data?.profileImage || '',
    email: data?.email || '',
    phoneNumber: data?.phoneNumber || data?.phone || '',
    rating: data?.rating || 0,
    reviews: data?.reviews || data?.reviewCount || 0,
    experience: data?.experience || '',
    price: data?.price || data?.basePrice || 0,
    verified: data?.verified || false,
    available: data?.available ?? true,
    isOnline: data?.isOnline ?? false,
    responseTime: data?.responseTime || '~30 min',
    specialty: data?.specialty || '',
    bio: data?.bio || data?.briefDescription || '',
    address: data?.address || '',
    city: data?.city || '',
    category: data?.category || data?.providerType || 'electricians',
    skills: data?.skills || [],
    certifications: data?.certifications || [],
    languages: data?.languages || [],
    completedJobs: data?.completedJobs || data?.jobsCompleted || 0,
    jobSuccessRate: data?.jobSuccessRate || 0,
    coordinates: {
      latitude: data?.coordinates?.latitude || data?.coordinates?.lat || 0,
      longitude: data?.coordinates?.longitude || data?.coordinates?.lng || 0,
    },
    createdAt: data?.createdAt || new Date().toISOString(),
    updatedAt: data?.updatedAt || new Date().toISOString(),
  };
}

export function providerListSerializer(payload: any): Provider[] {
  const providers = payload?.providers || payload?.data || [];
  return providers.map((provider: any) => providerSerializer(provider));
}

export function providerServiceSerializer(service: any): ProviderService {
  return {
    id: service?.id || '',
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || 0,
    duration: service?.duration || '',
    icon: service?.icon || 'settings',
  };
}

export function providerAvailabilitySerializer(slot: any): ProviderAvailability {
  return {
    id: slot?.id || '',
    day: slot?.day || '',
    timeSlots: slot?.timeSlots || [],
    available: slot?.available ?? true,
  };
}

export function galleryItemSerializer(item: any): GalleryItem {
  return {
    id: item?.id || '',
    image: item?.image || item?.url || '',
    title: item?.title || '',
    category: item?.category || '',
  };
}

export function providerDetailsSerializer(data: any): ProviderDetails {
  const baseProvider = providerSerializer(data);
  
  return {
    ...baseProvider,
    servicesOffered: (data?.servicesOffered || data?.services || []).map(providerServiceSerializer),
    availability: (data?.availability || []).map(providerAvailabilitySerializer),
    gallery: (data?.gallery || []).map(galleryItemSerializer),
    reviewsList: (data?.reviewsList || data?.reviews || []).map(reviewSerializer),
  };
}
