// ============================================
// EARNINGS MODELS (Provider View)
// ============================================

export interface EarningsStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  pendingPayouts: number;
  completedJobsCount: number;
  monthlyGrowth: number;
}

export interface MonthlyData {
  month: string;
  amount: number;
  jobs: number;
}

export interface PaymentItem {
  id: string;
  type: 'earning' | 'payout';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  description: string;
}

export interface PerformanceStats {
  avgRating: number;
  /** null until there is a track record to judge — shown as a dash, not 0% or 100%. */
  onTimeRate: number | null;
  statusTier: string;
  repeatCustomerRate: number | null;
}

/** One bar of the earnings chart: a day for the week view, a month otherwise. */
export interface EarningsSeriesPoint {
  key: string;
  label: string;
  amount: number;
  jobs: number;
}

export type EarningsPeriod = 'week' | 'month' | 'year';

export interface EarningsData {
  stats: EarningsStats;
  monthlyData: MonthlyData[];
  recentPayments: PaymentItem[];
  performance: PerformanceStats;
  period: EarningsPeriod;
  /** Net earnings inside the chosen period. */
  periodEarnings: number;
  periodJobs: number;
  series: EarningsSeriesPoint[];
  seriesTitle: string;
  /** What a payout request may ask for right now (wallet minus pending commission and payouts). */
  availableBalance: number;
  minPayoutAmount: number;
}
