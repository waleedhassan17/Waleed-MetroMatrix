// ============================================
// PROVIDER MODELS
// ============================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ScoreBreakdown {
  distance: number;
  rating: number;
  availability: number;
  quality: number;
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
  /** Undefined when the server could not resolve the provider's trade.
   *  Never guess a value here — see toServiceCategory(). */
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
  skills: string[];
  certifications: string[];
  languages: string[];
  completedJobs: number;
  jobSuccessRate: number;
  /** Kilometres from the customer; null when either side's location is unknown. */
  distanceKm?: number | null;
  /** The distance is to the provider's city, not a pinned base — show it as "~". */
  distanceApprox?: boolean;
  /** Straight-line travel estimate in minutes; null when distance is unknown or approximate. */
  etaMinutes?: number | null;
  /** Online, seen in the last few minutes and inside today's working hours. */
  availableNow?: boolean;
  /** 0–1 "best match" score from search; absent outside search results. */
  matchingScore?: number;
  /** Each ranking term in [0, 1] — what the "why this provider" chips read. */
  scoreBreakdown?: ScoreBreakdown | null;
  /** 'heuristic' or 'model:<version>' — which ranker ordered this result. */
  rankingSource?: string;
  /** The provider's service area (coarse, ~500 m), or null when they have not set one. */
  coordinates: Coordinates | null;
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
