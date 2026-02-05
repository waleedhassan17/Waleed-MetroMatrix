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
  onTimeRate: number;
  statusTier: string;
  repeatCustomerRate: number;
}

export interface EarningsData {
  stats: EarningsStats;
  monthlyData: MonthlyData[];
  recentPayments: PaymentItem[];
  performance: PerformanceStats;
}
