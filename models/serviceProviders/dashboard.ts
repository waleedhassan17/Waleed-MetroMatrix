// ============================================
// DASHBOARD MODELS (Provider View)
// ============================================

export interface ProviderProfile {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  isOnline: boolean;
  isPro: boolean;
  unreadNotifications: number;
}

export interface DashboardStats {
  todayJobs: number;
  weekJobs: number;
  completionRate: number;
}

export interface DashboardInsight {
  id: string;
  title: string;
  value: string;
  trend: 'up' | 'down';
  color: string;
  bgColor: string;
}

export interface DashboardJob {
  id: string;
  title: string;
  category: string;
  customer: string;
  customerAvatar: string;
  location: string;
  date: string;
  time: string;
  price: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  phone?: string;
}

export interface RecentActivity {
  id: string;
  type: string;
  message: string;
  time: string;
}

export interface DashboardData {
  profile: ProviderProfile;
  stats: DashboardStats;
  insights: DashboardInsight[];
  jobs: {
    pending: DashboardJob[];
    today: DashboardJob[];
    upcoming: DashboardJob[];
  };
  recentActivity: RecentActivity[];
}
