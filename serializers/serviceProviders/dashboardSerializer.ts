// ============================================
// DASHBOARD SERIALIZERS (Provider View)
// ============================================

import {
  DashboardData,
  DashboardJob,
} from '../../models/serviceProviders';

export function dashboardJobSerializer(data: any): DashboardJob {
  return {
    id: data?.id || '',
    title: data?.title || '',
    category: data?.category || '',
    customer: data?.customer || data?.customerName || '',
    customerAvatar: data?.customerAvatar || data?.customerImage || '',
    location: data?.location || data?.address || '',
    date: data?.date || '',
    time: data?.time || '',
    price: data?.price || data?.estimatedPrice || 0,
    status: data?.status || 'pending',
    phone: data?.phone || data?.customerPhone,
  };
}

export function dashboardDataSerializer(payload: any): DashboardData {
  return {
    profile: {
      id: payload?.profile?.id || '',
      name: payload?.profile?.name || '',
      avatar: payload?.profile?.avatar || '',
      rating: payload?.profile?.rating || 0,
      isOnline: payload?.profile?.isOnline ?? false,
      isPro: payload?.profile?.isPro ?? false,
      unreadNotifications: payload?.profile?.unreadNotifications || 0,
    },
    stats: {
      todayJobs: payload?.stats?.todayJobs || 0,
      weekJobs: payload?.stats?.weekJobs || 0,
      completionRate: payload?.stats?.completionRate || 0,
    },
    insights: (payload?.insights || []).map((insight: any) => ({
      id: insight?.id || '',
      title: insight?.title || '',
      value: insight?.value || '',
      trend: insight?.trend || 'up',
      color: insight?.color || '#10B981',
      bgColor: insight?.bgColor || '#D1FAE5',
    })),
    jobs: {
      pending: (payload?.jobs?.pending || []).map(dashboardJobSerializer),
      today: (payload?.jobs?.today || []).map(dashboardJobSerializer),
      upcoming: (payload?.jobs?.upcoming || []).map(dashboardJobSerializer),
    },
    recentActivity: (payload?.recentActivity || []).map((activity: any) => ({
      id: activity?.id || '',
      type: activity?.type || '',
      message: activity?.message || '',
      time: activity?.time || '',
    })),
  };
}
