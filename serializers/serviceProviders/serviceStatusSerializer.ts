// ============================================
// SERVICE STATUS SERIALIZERS
// ============================================

import { ServiceStatus } from '../../models/serviceProviders';

export function serviceStatusSerializer(payload: any): ServiceStatus {
  return {
    bookingId: payload?.bookingId || '',
    status: payload?.status || 'in_progress',
    provider: {
      id: payload?.provider?.id || '',
      name: payload?.provider?.name || '',
      phone: payload?.provider?.phone || '',
      image: payload?.provider?.image || '',
    },
    serviceDetails: {
      type: payload?.serviceDetails?.type || '',
      description: payload?.serviceDetails?.description || '',
      startedAt: payload?.serviceDetails?.startedAt || new Date().toISOString(),
      estimatedDuration: payload?.serviceDetails?.estimatedDuration || '',
      suggestedAmount: payload?.serviceDetails?.suggestedAmount || 0,
    },
    progressSteps: (payload?.progressSteps || []).map((step: any) => ({
      id: step?.id || 0,
      label: step?.label || '',
      completed: step?.completed ?? false,
      time: step?.time,
    })),
  };
}
