// ============================================
// PAYMENT SERIALIZERS
// ============================================

import {
  PaymentData,
  Transaction,
  PaymentInitData,
} from '../../models/serviceProviders';

export function paymentDataSerializer(payload: any): PaymentData {
  return {
    paymentId: payload?.paymentId || `pay_${Date.now()}`,
    recipient: {
      id: payload?.recipient?.id || '',
      name: payload?.recipient?.name || '',
      image: payload?.recipient?.image || '',
    },
    details: {
      bookingId: payload?.details?.bookingId || '',
      service: payload?.details?.service || '',
      description: payload?.details?.description || '',
      amount: payload?.details?.amount || 0,
      suggestedAmount: payload?.details?.suggestedAmount || 0,
      invoiceId: payload?.details?.invoiceId || `INV-${Date.now()}`,
    },
    availableMethods: (payload?.availableMethods || []).map((method: any) => ({
      id: method?.id || '',
      name: method?.name || '',
      icon: method?.icon || '',
      enabled: method?.enabled ?? true,
      description: method?.description || '',
    })),
  };
}

export function transactionSerializer(data: any): Transaction {
  return {
    transactionId: data?.transactionId || `TXN-${Date.now()}`,
    status: data?.status || 'completed',
    method: data?.method || '',
    amount: data?.amount || 0,
    currency: data?.currency || 'PKR',
    paidAt: data?.paidAt || new Date().toISOString(),
  };
}

export function paymentInitDataSerializer(data: any): PaymentInitData {
  return {
    jobId: data?.jobId || '',
    amount: data?.amount || 0,
    serviceType: data?.serviceType || '',
    customerName: data?.customerName || '',
    breakdown: {
      serviceCharge: data?.breakdown?.serviceCharge || 0,
      materialCost: data?.breakdown?.materialCost,
      additionalCharges: data?.breakdown?.additionalCharges,
      discount: data?.breakdown?.discount,
      tax: data?.breakdown?.tax,
    },
  };
}
