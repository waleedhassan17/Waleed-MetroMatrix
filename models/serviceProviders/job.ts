// ============================================
// JOB MODELS (Provider View)
// ============================================

import { Coordinates } from './provider';

export interface Job {
  id: string;
  title: string;
  category: string;
  serviceType: string;
  customer: string;
  customerAvatar: string;
  customerPhone: string;
  customerImage?: string;
  location: string;
  city: string;
  date: string;
  time: string;
  price: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'available' | 'today';
  coordinates: Coordinates;
  specialInstructions?: string;
}

// One count per bucket `Job.status` can hold. `available` is the number of
// customers waiting on this provider to accept or decline — the count the
// Jobs tab puts on its New-requests filter.
export interface JobStats {
  total: number;
  available: number;
  upcoming: number;
  today: number;
  active: number;
  completed: number;
  cancelled: number;
}

export interface JobDetail extends Job {
  customerName: string;
  estimatedPrice: number;
}

export interface AwaitingApprovalData {
  jobId: string;
  serviceType: string;
  customerName: string;
  address: string;
  actualDuration: number | null;
  estimatedPrice: number;
}
