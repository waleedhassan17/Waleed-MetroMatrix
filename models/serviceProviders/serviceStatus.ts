// ============================================
// SERVICE STATUS MODELS
// ============================================

export interface ServiceProvider {
  id: string;
  name: string;
  phone: string;
  image: string;
}

export interface ServiceDetails {
  type: string;
  description: string;
  startedAt: string;
  estimatedDuration: string;
  suggestedAmount: number;
}

export interface ProgressStep {
  id: number;
  label: string;
  completed: boolean;
  time?: string;
}

export interface ServiceStatus {
  bookingId: string;
  status: 'arrived' | 'in_progress' | 'completed';
  provider: ServiceProvider;
  serviceDetails: ServiceDetails;
  progressSteps: ProgressStep[];
}
