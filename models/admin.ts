// ============================================
// ADMIN MODELS - Complete Type Definitions
// ============================================

// ============================================
// 1. ADMIN USER TYPES
// ============================================

export interface AdminInfo {
  id: string;
  _id?: string;
  email: string;
  fullName: string;
  role: AdminRole;
  avatar?: string;
  
  permissions: AdminPermissions;
  
  isActive: boolean;
  lastLoginDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface AdminPermissions {
  canApproveProviders: boolean;
  canManageUsers: boolean;
  canManagePosts: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canSendNotifications: boolean;
}

export interface AdminAuthResponse {
  success: boolean;
  message?: string;
  admin: AdminInfo;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AdminLoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// ============================================
// 2. DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  users: UserStats;
  providers: ProviderStats;
  posts: PostStats;
  quickStats: QuickStats;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  growthPercentage: number;
}

export interface ProviderStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  growthPercentage: number;
  byType: ProviderTypeCount[];
}

export interface PostStats {
  total: number;
  thisMonth: number;
}

export interface QuickStats {
  online: number;
  pendingReviews: number;
  todayRegistrations?: number;
  activeProviders?: number;
}

export interface ProviderTypeCount {
  _id: ProviderType;
  count: number;
  percentage?: number;
}

export interface RecentRegistration {
  id: string;
  _id?: string;
  fullName: string;
  email: string;
  providerType: ProviderType;
  specialty?: string;
  subType?: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  avatar?: string;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    totalUsers: number;
    totalProviders: number;
    pendingProviders: number;
    totalPosts: number;
    activeUsers: number;
    growth: {
      users: number;
      providers: number;
      posts: number;
    };
    recentRegistrations: RecentRegistration[];
    providersByType?: ProviderTypeCount[];
    providerDistribution?: ProviderTypeCount[];
  };
}

// ============================================
// 3. USER TYPES
// ============================================

export interface User {
  id: string;
  _id?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  
  address?: UserAddress;
  
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface UserListResponse {
  success: boolean;
  users: User[];
  pagination: PaginationInfo;
  stats?: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface UserFilters {
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'fullName' | 'email';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// 4. PROVIDER TYPES
// ============================================

export type ProviderType = 'doctor' | 'home_service' | 'vendor';

export type ProviderSubType = 
  | 'electrician' 
  | 'plumber' 
  | 'ac_repairer' 
  | 'carpenter'
  | 'painter'
  | 'general_physician'
  | 'cardiologist'
  | 'dermatologist'
  | 'pediatrician'
  | 'orthopedic'
  | 'clothing'
  | 'electronics'
  | 'food'
  | 'groceries'
  | 'other';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface ProviderDocument {
  name: string;
  url: string;
  publicId?: string;
  uploadedAt: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface ProviderDocuments {
  medicalLicense?: ProviderDocument;
  degreeCertificate?: ProviderDocument;
  professionalCertificate?: ProviderDocument;
  businessLicense?: ProviderDocument;
  nationalIdCard?: ProviderDocument;
  profilePhoto?: ProviderDocument;
}

export interface ProviderRating {
  average: number;
  count: number;
}

export interface ProviderCoordinates {
  lat: number;
  lng: number;
}

export interface Provider {
  id: string;
  _id?: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  
  providerType: ProviderType;
  providerSubType?: ProviderSubType;
  
  specialty?: string;
  profession?: string;
  category?: string;
  experience: string;
  briefDescription?: string;
  rate?: string;
  consultationFee?: number;
  professionalName?: string;
  businessName?: string;
  
  city: string;
  address?: string;
  coordinates?: ProviderCoordinates;
  
  idNumber: string;
  documents: ProviderDocuments;
  ratings?: ProviderRating;
  
  profileComplete: boolean;
  emailVerified: boolean;
  verificationStatus: VerificationStatus;
  adminVerified?: 'pending' | 'active' | 'inactive';
  rejectionReason?: string;
  isActive: boolean;
  
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ProviderListResponse {
  success: boolean;
  providers: Provider[];
  pagination: PaginationInfo;
  stats?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    active: number;
    inactive: number;
  };
}

export interface ProviderFilters {
  status?: VerificationStatus | 'all';
  providerType?: ProviderType | 'all';
  subType?: ProviderSubType;
  isActive?: boolean;
  search?: string;
  city?: string;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'fullName' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ProviderActionRequest {
  providerId: string;
}

export interface RejectProviderRequest {
  providerId: string;
  reason: string;
  adminNotes?: string;
}

// ============================================
// 5. NOTIFICATION TYPES
// ============================================

export type NotificationType = 
  | 'provider_registration'
  | 'provider_approved'
  | 'provider_rejected'
  | 'user_registration'
  | 'system_alert'
  | 'report';

export interface NotificationData {
  userId?: string;
  providerId?: string;
  actionUrl?: string;
  [key: string]: any;
}

export interface AdminNotification {
  id: string;
  _id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationListResponse {
  success: boolean;
  notifications: AdminNotification[];
  pagination: PaginationInfo;
  unreadCount: number;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  page: number;
  limit: number;
}

// ============================================
// 6. SETTINGS TYPES
// ============================================

export interface GeneralSettings {
  appName: string;
  appVersion: string;
  platformName?: string;
  contactEmail?: string;
  supportPhone?: string;
  autoApproveProviders?: boolean;
  requireEmailVerification?: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notifyOnNewProvider: boolean;
  notifyOnNewUser: boolean;
  dailyDigest: boolean;
  providerRegistrations?: boolean;
  userRegistrations?: boolean;
  systemAlerts?: boolean;
  weeklyReports?: boolean;
}

export interface ProviderSettings {
  autoApproveProviders: boolean;
  requireDocumentVerification: boolean;
  maxPendingDays: number;
  allowedProviderTypes: ProviderType[];
}

export interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireTwoFactor: boolean;
  twoFactorEnabled?: boolean;
  passwordMinLength: number;
  passwordExpiry?: number;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
}

export interface AppSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  providers: ProviderSettings;
  security: SecuritySettings;
  appearance?: AppearanceSettings;
}

export interface SettingsResponse {
  success: boolean;
  settings: AppSettings;
}

export interface UpdateSettingsRequest {
  section: keyof AppSettings;
  settings: Partial<AppSettings[keyof AppSettings]>;
}

// ============================================
// 7. PAGINATION & COMMON TYPES
// ============================================

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ActionResponse {
  success: boolean;
  message: string;
}

// ============================================
// 8. ANALYTICS TYPES
// ============================================

export interface AnalyticsData {
  userGrowth: TimeSeriesData[];
  providerGrowth: TimeSeriesData[];
  approvalRate: number;
  averageApprovalTime: number;
  topCities: CityData[];
  providerTypeDistribution: ProviderTypeCount[];
}

export interface TimeSeriesData {
  date: string;
  count: number;
  change?: number;
}

export interface CityData {
  city: string;
  userCount: number;
  providerCount: number;
}

// ============================================
// 9. STAT CARD CONFIGURATION
// ============================================

export interface StatCardConfig {
  id: string;
  label: string;
  icon: string;
  gradient: readonly [string, string];
  valueKey: string;
  trendKey?: string;
  subtitle?: string;
  navigateTo?: string;
}

export const DASHBOARD_STAT_CARDS: StatCardConfig[] = [
  {
    id: 'total_providers',
    label: 'Total Providers',
    icon: 'people',
    gradient: ['#8b5cf6', '#a855f7'] as const,
    valueKey: 'providers.total',
    trendKey: 'providers.growthPercentage',
    navigateTo: 'ProviderManagement',
  },
  {
    id: 'pending_review',
    label: 'Pending Review',
    icon: 'time',
    gradient: ['#f59e0b', '#fbbf24'] as const,
    valueKey: 'providers.pending',
    subtitle: 'Action Required',
    navigateTo: 'PendingReview',
  },
  {
    id: 'approved',
    label: 'Approved',
    icon: 'checkmark-circle',
    gradient: ['#10b981', '#34d399'] as const,
    valueKey: 'providers.approved',
    trendKey: 'providers.growthPercentage',
    navigateTo: 'ProviderManagement',
  },
  {
    id: 'total_users',
    label: 'Total Users',
    icon: 'person',
    gradient: ['#ef4444', '#f87171'] as const,
    valueKey: 'users.total',
    trendKey: 'users.growthPercentage',
    navigateTo: 'UserManagement',
  },
];

// ============================================
// 10. CONFIGURATION CONSTANTS
// ============================================

export interface ProviderTypeConfig {
  label: string;
  pluralLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  gradient: readonly [string, string];
}

export const PROVIDER_TYPE_CONFIG: Record<ProviderType, ProviderTypeConfig> = {
  doctor: {
    label: 'Doctor',
    pluralLabel: 'Doctors',
    icon: 'medical',
    color: '#6366f1',
    bgColor: '#eef2ff',
    gradient: ['#6366f1', '#818cf8'] as const,
  },
  home_service: {
    label: 'Home Service',
    pluralLabel: 'Home Services',
    icon: 'home',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    gradient: ['#f59e0b', '#fbbf24'] as const,
  },
  vendor: {
    label: 'Vendor',
    pluralLabel: 'Vendors',
    icon: 'storefront',
    color: '#8b5cf6',
    bgColor: '#f3e8ff',
    gradient: ['#8b5cf6', '#a78bfa'] as const,
  },
} as const;

export interface VerificationStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const VERIFICATION_STATUS_CONFIG: Record<VerificationStatus, VerificationStatusConfig> = {
  pending: {
    label: 'Pending',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: 'time-outline',
  },
  approved: {
    label: 'Approved',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: 'checkmark-circle-outline',
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: 'close-circle-outline',
  },
  suspended: {
    label: 'Suspended',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: 'pause-circle-outline',
  },
} as const;

export interface AdminRoleConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const ADMIN_ROLE_CONFIG: Record<AdminRole, AdminRoleConfig> = {
  super_admin: {
    label: 'Super Admin',
    color: '#8b5cf6',
    bgColor: '#f3e8ff',
  },
  admin: {
    label: 'Admin',
    color: '#3b82f6',
    bgColor: '#dbeafe',
  },
  moderator: {
    label: 'Moderator',
    color: '#10b981',
    bgColor: '#d1fae5',
  },
} as const;

export const SUB_TYPE_LABELS: Record<ProviderSubType, string> = {
  electrician: 'Electrician',
  plumber: 'Plumber',
  ac_repairer: 'AC Repairer',
  carpenter: 'Carpenter',
  painter: 'Painter',
  general_physician: 'General Physician',
  cardiologist: 'Cardiologist',
  dermatologist: 'Dermatologist',
  pediatrician: 'Pediatrician',
  orthopedic: 'Orthopedic',
  clothing: 'Clothing',
  electronics: 'Electronics',
  food: 'Food',
  groceries: 'Groceries',
  other: 'Other',
};

// ============================================
// 11. HELPER FUNCTIONS
// ============================================

export const getProviderTypeConfig = (type: ProviderType): ProviderTypeConfig => {
  return PROVIDER_TYPE_CONFIG[type] || PROVIDER_TYPE_CONFIG.vendor;
};

export const getVerificationStatusConfig = (status: VerificationStatus): VerificationStatusConfig => {
  return VERIFICATION_STATUS_CONFIG[status] || VERIFICATION_STATUS_CONFIG.pending;
};

export const getAdminRoleConfig = (role: AdminRole): AdminRoleConfig => {
  return ADMIN_ROLE_CONFIG[role] || ADMIN_ROLE_CONFIG.moderator;
};

export const getSubTypeLabel = (subType: ProviderSubType): string => {
  return SUB_TYPE_LABELS[subType] || subType;
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const formatDate = (date?: Date): string => {
  const targetDate = date || new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return targetDate.toLocaleDateString('en-US', options);
};

export const formatDateShort = (date?: Date): string => {
  const targetDate = date || new Date();
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  };
  return targetDate.toLocaleDateString('en-US', options);
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString('en-US', options);
};

export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getProviderTypeIcon = (type: ProviderType): string => {
  return PROVIDER_TYPE_CONFIG[type]?.icon || 'person';
};

export const getProviderTypeColor = (type: ProviderType): string => {
  return PROVIDER_TYPE_CONFIG[type]?.color || '#6366f1';
};

export const getStatusColor = (status: VerificationStatus): string => {
  return VERIFICATION_STATUS_CONFIG[status]?.color || '#f59e0b';
};

export const getStatusBgColor = (status: VerificationStatus): string => {
  return VERIFICATION_STATUS_CONFIG[status]?.bgColor || '#fef3c7';
};

// Type guards
export const isProviderType = (value: string): value is ProviderType => {
  return ['doctor', 'home_service', 'vendor'].includes(value);
};

export const isVerificationStatus = (value: string): value is VerificationStatus => {
  return ['pending', 'approved', 'rejected', 'suspended'].includes(value);
};

export const isAdminRole = (value: string): value is AdminRole => {
  return ['super_admin', 'admin', 'moderator'].includes(value);
};