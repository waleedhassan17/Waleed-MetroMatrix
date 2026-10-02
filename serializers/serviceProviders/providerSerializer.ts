// ============================================
// PROVIDER SERIALIZERS
// ============================================

import {
  Coordinates,
  Provider,
  ProviderDetails,
  ScoreBreakdown,
  ProviderService,
  ProviderAvailability,
  GalleryItem,
} from '../../models/serviceProviders';
import { reviewSerializer } from './reviewSerializer';
import { toServiceCategory } from './commonSerializer';

/** A real point or null — never a fabricated 0,0 that a map would draw in the ocean. */
function coordinatesSerializer(c: any): Coordinates | null {
  const latitude = Number(c?.latitude ?? c?.lat);
  const longitude = Number(c?.longitude ?? c?.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

function scoreBreakdownSerializer(b: any): ScoreBreakdown | null {
  if (!b || typeof b !== 'object') return null;
  const n = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return { distance: n(b.distance), rating: n(b.rating), availability: n(b.availability), quality: n(b.quality) };
}

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
    // `providerType` is 'home_service', never a category slug — the old
    // fallback chain could therefore also yield a value that is not a
    // category at all.
    category: toServiceCategory(data?.category),
    skills: data?.skills || [],
    certifications: data?.certifications || [],
    languages: data?.languages || [],
    completedJobs: data?.completedJobs || data?.jobsCompleted || 0,
    jobSuccessRate: data?.jobSuccessRate || 0,
    distanceKm: typeof data?.distanceKm === 'number' ? data.distanceKm : null,
    distanceApprox: !!data?.distanceApprox,
    etaMinutes: typeof data?.etaMinutes === 'number' ? data.etaMinutes : null,
    availableNow: !!data?.availableNow,
    matchingScore: typeof data?.matchingScore === 'number' ? data.matchingScore : undefined,
    scoreBreakdown: scoreBreakdownSerializer(data?.scoreBreakdown),
    rankingSource: typeof data?.rankingSource === 'string' ? data.rankingSource : undefined,
    coordinates: coordinatesSerializer(data?.coordinates),
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
