// Provider model interface
export interface ProviderInfo {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  
  // Provider type information
  providerType: 'doctor' | 'home_service' | 'vendor';
  providerSubType?: 'electrician' | 'plumber' | 'ac_repairer';
  
  // Professional information
  specialty?: string; // For doctors
  profession?: string; // For home service
  category?: string; // For vendors
  experience: string;
  briefDescription: string;
  rate?: string;
  
  // Business information
  professionalName?: string; // For doctors - clinic name
  businessName?: string; // For vendors
  
  // Location
  city: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Identification
  idNumber: string;
  
  // Documents
  documents?: {
    medicalLicense?: DocumentInfo;
    degreeCertificate?: DocumentInfo;
    professionalCertificate?: DocumentInfo;
    businessLicense?: DocumentInfo;
    nationalIdCard?: DocumentInfo;
  };
  
  // Status - NEW v64 FLAG SYSTEM
  emailVerified?: 'pending' | 'active' | 'inactive'; // Email verification status
  adminVerified?: 'pending' | 'active' | 'inactive'; // Admin approval status
  status?: string; // Current status: pending_email_verification, email_verified, pending_approval, approved, rejected
  onboardingStatus?: string; // Onboarding step status
  
  // Legacy fields (backward compatibility)
  profileComplete?: boolean;
  isVerified?: boolean;
  canLogin?: boolean;
  isActive?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  
  // Ratings
  ratings?: {
    average?: number;
    count?: number;
  };
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  verifiedBy?: string; // Admin ID who verified
}

// Document information
export interface DocumentInfo {
  name: string;
  url: string; // Changed from uri to url
  publicId?: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
  verified?: boolean; // NEW
}

// Provider authentication response
export interface ProviderAuthResponse {
  success: boolean;
  message?: string; // Success or error message
  provider: ProviderInfo;
  accessToken?: string; // Optional - not returned during registration
  refreshToken?: string;
  expiresIn?: number;
  requiresEmailVerification?: boolean; // NEW
}

// Provider registration data
export interface ProviderRegistrationData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  acceptTerms?: boolean;
}

// Provider login data
export interface ProviderLoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Social login data for providers
export interface ProviderSocialLoginData {
  provider: 'google' | 'facebook';
  accessToken: string;
  userInfo?: {
    email?: string;
    fullName?: string;
    profilePhoto?: string;
  };
}

// Personal info form data (for multi-step form)
export interface PersonalInfoData {
  // Provider Type
  providerType: 'doctor' | 'home_service' | 'vendor';
  providerSubType?: 'electrician' | 'plumber' | 'ac_repairer';
  
  // Basic Info
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  
  // Professional Details
  specialty?: string; // For doctors
  profession?: string; // For home service
  category?: string; // For vendors
  professionalName?: string; // For doctors
  businessName?: string; // For vendors
  experience?: string;
  rate?: string;
  briefDescription?: string;
  city?: string;
  idNumber?: string;
}

// Document upload data
export interface DocumentUploadData {
  documentType: 'medicalLicense' | 'degreeCertificate' | 'professionalCertificate' | 'businessLicense' | 'nationalIdCard';
  file: File | any; // File object or React Native file
}

// Provider types configuration
export const PROVIDER_TYPES = {
  doctor: {
    title: 'Doctor',
    icon: 'medical',
    color: '#ec4899',
    requiredDocs: ['medicalLicense', 'degreeCertificate', 'nationalIdCard'],
  },
  home_service: {
    title: 'Home Service',
    icon: 'construct',
    color: '#f59e0b',
    requiredDocs: ['professionalCertificate', 'nationalIdCard'],
  },
  vendor: {
    title: 'Vendor',
    icon: 'storefront',
    color: '#8b5cf6',
    requiredDocs: ['businessLicense', 'nationalIdCard'],
  },
};

// Home service sub-types
export const HOME_SERVICE_TYPES = {
  electrician: { label: 'Electrician', icon: 'flash', color: '#f59e0b' },
  plumber: { label: 'Plumber', icon: 'water', color: '#3b82f6' },
  ac_repairer: { label: 'AC Repairer', icon: 'snow', color: '#06b6d4' },
};

// Doctor specialties
export const DOCTOR_SPECIALTIES = [
  { id: 'general', label: 'General Practitioner' },
  { id: 'cardiology', label: 'Cardiology' },
  { id: 'dermatology', label: 'Dermatology' },
  { id: 'orthopedics', label: 'Orthopedics' },
  { id: 'pediatrics', label: 'Pediatrics' },
  { id: 'neurology', label: 'Neurology' },
  { id: 'psychiatry', label: 'Psychiatry' },
  { id: 'surgery', label: 'Surgery' },
  { id: 'dentistry', label: 'Dentistry' },
  { id: 'ophthalmology', label: 'Ophthalmology' },
];

// Vendor categories
export const VENDOR_CATEGORIES = [
  { id: 'clothing_fashion', label: 'Clothing & Fashion' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'home_garden', label: 'Home & Garden' },
  { id: 'food_beverages', label: 'Food & Beverages' },
  { id: 'health_beauty', label: 'Health & Beauty' },
  { id: 'sports_outdoors', label: 'Sports & Outdoors' },
  { id: 'toys_games', label: 'Toys & Games' },
  { id: 'books_stationery', label: 'Books & Stationery' },
];

// Pakistani cities
export const CITIES = [
  'Karachi',
  'Lahore', 
  'Islamabad',
  'Peshawar',
  'Quetta',
  'Faisalabad',
  'Multan',
  'Hyderabad',
  'Rawalpindi',
  'Gujranwala',
  'Sialkot',
  'Bahawalpur',
  'Sargodha',
  'Sukkur',
  'Larkana',
];

// Provider verification status
export enum ProviderStatus {
  PENDING_EMAIL = 'pending_email',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  ACTIVE = 'active',
}

// Email verification types for providers
export interface ProviderEmailVerificationRequest {
  email: string;
  userType: 'provider';
}

export interface ProviderVerificationStatusResponse {
  success: boolean;
  emailVerified: boolean;
  canLogin: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  profileComplete: boolean;
}