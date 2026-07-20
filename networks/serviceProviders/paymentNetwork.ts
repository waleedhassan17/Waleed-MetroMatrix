// ============================================
// PAYMENT NETWORK APIs
// ============================================

import {
  PaymentData,
  Transaction,
  PaymentInitData,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchPaymentData(
  bookingId: string
): Promise<ApiResponse<PaymentData>> {
    return apiRequest<PaymentData>(`/payments/${bookingId}/init`);
}

export async function processPayment(data: {
  bookingId: string;
  method: string;
  amount: number;
  tipAmount?: number;
}): Promise<ApiResponse<Transaction>> {
    return apiRequest<Transaction>('/payments/process', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Provider Payment APIs
export async function initializeProviderPayment(jobId: string): Promise<ApiResponse<PaymentInitData>> {
    return apiRequest<PaymentInitData>(`/provider/jobs/${jobId}/payment`);
}

export async function requestPaymentFromCustomer(jobId: string, amount: number): Promise<ApiResponse<{ requestId: string }>> {
    return apiRequest(`/provider/jobs/${jobId}/request-payment`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function confirmOnlinePayment(jobId: string, transactionId: string): Promise<ApiResponse<{ confirmed: boolean }>> {
    return apiRequest(`/provider/jobs/${jobId}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({ transactionId }),
  });
}

export async function confirmCashPayment(jobId: string): Promise<ApiResponse<{ transactionId: string }>> {
    return apiRequest(`/provider/jobs/${jobId}/confirm-cash`, {
    method: 'POST',
  });
}
