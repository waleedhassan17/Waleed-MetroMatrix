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
      onTimeRate: typeof payload?.performance?.onTimeRate === 'number' ? payload.performance.onTimeRate : null,
      statusTier: payload?.performance?.statusTier || 'Bronze',
      repeatCustomerRate:
        typeof payload?.performance?.repeatCustomerRate === 'number'
          ? payload.performance.repeatCustomerRate
          : null,
    },
    period: payload?.period === 'week' || payload?.period === 'year' ? payload.period : 'month',
    periodEarnings: payload?.periodEarnings || 0,
    periodJobs: payload?.periodJobs || 0,
    series: (payload?.series || []).map((p: any) => ({
      key: p?.key || p?.label || '',
      label: p?.label || '',
      amount: p?.amount || 0,
      jobs: p?.jobs || 0,
    })),
    seriesTitle: payload?.seriesTitle || 'Last 6 months',
    availableBalance: typeof payload?.availableBalance === 'number' ? payload.availableBalance : 0,
    minPayoutAmount: payload?.minPayoutAmount || 500,
  };
}
