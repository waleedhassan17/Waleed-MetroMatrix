// ============================================
// PROVIDER MODELS
// ============================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Provider {
  id: string;
  name: string;
  image: string;
  email: string;
  phoneNumber: string;
  rating: number;
  reviews: number;
  experience: string;
  price: number;
  verified: boolean;
  available: boolean;
  isOnline: boolean;
  responseTime: string;
  specialty: string;
  bio: string;
  address: string;
  city: string;
  category: 'electricians' | 'plumbers' | 'ac-repairers';
  skills: string[];
  certifications: string[];
  languages: string[];
  completedJobs: number;
  jobSuccessRate: number;
  coordinates: Coordinates;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  icon: string;
}

export interface ProviderAvailability {
  id: string;
  day: string;
  timeSlots: string[];
  available: boolean;
}

export interface GalleryItem {
  id: string;
  image: string;
  title: string;
  category: string;
}

export interface Review {
  id: string;
  reviewerName: string;
  reviewerInitial: string;
  rating: number;
  comment: string;
  date: string;
  helpfulCount: number;
  avatarColor: string;
  tags?: string[];
  providerResponse?: string;
}

export interface ProviderDetails extends Provider {
  servicesOffered: ProviderService[];
  availability: ProviderAvailability[];
  gallery: GalleryItem[];
  reviewsList: Review[];
}
