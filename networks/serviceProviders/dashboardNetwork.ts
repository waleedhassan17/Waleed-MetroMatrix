// ============================================
// DASHBOARD NETWORK APIs (Provider View)
// ============================================

import { DashboardData, ApiResponse } from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

export async function fetchProviderDashboard(): Promise<ApiResponse<DashboardData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      success: true,
      data: {
        profile: {
          id: 'provider1',
          name: 'John Smith',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          rating: 4.9,
          isOnline: true,
          isPro: true,
          unreadNotifications: 3,
        },
        stats: {
          todayJobs: 4,
          weekJobs: 18,
          completionRate: 98,
        },
        insights: [
          { id: '1', title: 'This Week', value: 'Rs. 45,000', trend: 'up', color: '#10B981', bgColor: '#D1FAE5' },
          { id: '2', title: 'Rating', value: '4.9', trend: 'up', color: '#3B82F6', bgColor: '#DBEAFE' },
          { id: '3', title: 'Response Time', value: '15 min', trend: 'down', color: '#F59E0B', bgColor: '#FEF3C7' },
        ],
        jobs: {
          pending: [
            { id: '1', title: 'Wiring Repair', category: 'Electrical', customer: 'Sarah M.', customerAvatar: 'https://randomuser.me/api/portraits/women/1.jpg', location: 'Gulberg III, Lahore', date: 'Today', time: '2:00 PM', price: 1500, status: 'pending', phone: '+92 300 1111111' },
            { id: '2', title: 'Switch Installation', category: 'Electrical', customer: 'Ali K.', customerAvatar: 'https://randomuser.me/api/portraits/men/4.jpg', location: 'DHA Phase 5, Lahore', date: 'Today', time: '4:00 PM', price: 800, status: 'pending', phone: '+92 300 2222222' },
          ],
          today: [
            { id: '3', title: 'Full House Wiring', category: 'Electrical', customer: 'Maria J.', customerAvatar: 'https://randomuser.me/api/portraits/women/2.jpg', location: 'Model Town, Lahore', date: 'Today', time: '10:00 AM', price: 5000, status: 'completed', phone: '+92 300 3333333' },
          ],
          upcoming: [
            { id: '4', title: 'Electrical Inspection', category: 'Electrical', customer: 'Ahmed R.', customerAvatar: 'https://randomuser.me/api/portraits/men/5.jpg', location: 'Johar Town, Lahore', date: 'Tomorrow', time: '11:00 AM', price: 1000, status: 'accepted', phone: '+92 300 4444444' },
          ],
        },
        recentActivity: [
          { id: '1', type: 'payment', message: 'Received Rs. 5,000 from Maria J.', time: '2 hours ago' },
          { id: '2', type: 'review', message: 'New 5-star review from Sarah M.', time: '4 hours ago' },
          { id: '3', type: 'booking', message: 'New booking request from Ali K.', time: '5 hours ago' },
        ],
      },
      message: 'Dashboard data fetched',
    };
  }

  return apiRequest<DashboardData>('/provider/dashboard');
}
