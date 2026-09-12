// ============================================
// SERVICE STATUS SERIALIZERS
// ============================================

import { ServiceStatus } from '../../models/serviceProviders';

export function serviceStatusSerializer(payload: any): ServiceStatus {
  return {
    bookingId: payload?.bookingId || '',
    status: payload?.status || 'in_progress',
    canonicalStatus: payload?.canonicalStatus,
    provider: {
      id: payload?.provider?.id || '',
      name: payload?.provider?.name || '',
      phone: payload?.provider?.phone || '',
      image: payload?.provider?.image || '',
      rating: Number(payload?.provider?.rating) || 0,
      reviews: Number(payload?.provider?.reviews) || 0,
      experience: payload?.provider?.experience || '',
      specialty: payload?.provider?.specialty || '',
      verified: payload?.provider?.verified ?? false,
    },
    serviceDetails: {
      type: payload?.serviceDetails?.type || '',
      description: payload?.serviceDetails?.description || '',
      // Empty, NOT "now". A job that has not started has no start time, and
      // defaulting to the current clock printed "Started 03:00" on a booking
      // the provider had not even set off for. The screen already hides the
      // label when this is empty.
      startedAt: payload?.serviceDetails?.startedAt || '',
      estimatedDuration: payload?.serviceDetails?.estimatedDuration || '',
      suggestedAmount: payload?.serviceDetails?.suggestedAmount || 0,
    },
    progressSteps: (payload?.progressSteps || []).map((step: any) => ({
      id: step?.id || 0,
      label: step?.label || '',
      completed: step?.completed ?? false,
      time: step?.time,
      timeAt: step?.timeAt,
    })),
    payment: {
      // 'unpaid' is the safe default: an absent payment block must never read
      // as settled, or the screen would hide a payment the customer still owes.
      status: payload?.payment?.status || 'unpaid',
      method: payload?.payment?.method ?? null,
      amount: payload?.payment?.amount || 0,
      paidAt: payload?.payment?.paidAt ?? null,
    },
  };
}
