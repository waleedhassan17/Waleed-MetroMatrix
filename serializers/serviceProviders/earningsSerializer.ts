// ============================================
// EARNINGS SERIALIZERS (Provider View)
// ============================================

import { EarningsData } from '../../models/serviceProviders';

export function earningsDataSerializer(payload: any): EarningsData {
  return {
    stats: {
      totalEarnings: payload?.stats?.totalEarnings || payload?.totalEarnings || 0,
      thisMonthEarnings: payload?.stats?.thisMonthEarnings || payload?.thisMonthEarnings || 0,
      pendingPayouts: payload?.stats?.pendingPayouts || payload?.pendingPayouts || 0,
      completedJobsCount: payload?.stats?.completedJobsCount || payload?.completedJobsCount || 0,
      monthlyGrowth: payload?.stats?.monthlyGrowth || payload?.monthlyGrowth || 0,
    },
    monthlyData: (payload?.monthlyData || []).map((item: any) => ({
      month: item?.month || '',
      amount: item?.amount || 0,
      jobs: item?.jobs || 0,
    })),
    recentPayments: (payload?.recentPayments || []).map((payment: any) => ({
      id: payment?.id || '',
      type: payment?.type || 'earning',
      amount: payment?.amount || 0,
      date: payment?.date || '',
      status: payment?.status || 'completed',
      description: payment?.description || '',
    })),
    performance: {
      avgRating: payload?.performance?.avgRating || 0,
      onTimeRate: payload?.performance?.onTimeRate || 0,
      statusTier: payload?.performance?.statusTier || 'Standard',
      repeatCustomerRate: payload?.performance?.repeatCustomerRate || 0,
    },
  };
}
