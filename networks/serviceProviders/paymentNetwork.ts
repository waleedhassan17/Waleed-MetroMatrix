// ============================================
// PAYMENT NETWORK APIs
// ============================================

import {
  PaymentData,
  Transaction,
  PaymentInitData,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

export async function fetchPaymentData(
  bookingId: string
): Promise<ApiResponse<PaymentData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        paymentId: `pay_${Date.now()}`,
        recipient: {
          id: '1',
          name: 'John Smith',
          image: 'https://randomuser.me/api/portraits/men/1.jpg',
        },
        details: {
          bookingId,
          service: 'Electrical Repair',
          description: 'Wiring repair and inspection',
          amount: 2500,
          suggestedAmount: 2500,
          invoiceId: `INV-${Date.now()}`,
        },
        availableMethods: [
          { id: 'cash', name: 'Cash', icon: 'cash', enabled: true, description: 'Pay with cash on completion' },
          { id: 'easypaisa', name: 'EasyPaisa', icon: 'phone-portrait', enabled: true, description: 'Mobile wallet payment' },
          { id: 'jazzcash', name: 'JazzCash', icon: 'phone-portrait', enabled: true, description: 'Mobile wallet payment' },
          { id: 'card', name: 'Credit/Debit Card', icon: 'card', enabled: false, description: 'Coming soon' },
        ],
      },
      message: 'Payment data fetched',
    };
  }

  return apiRequest<PaymentData>(`/payments/${bookingId}/init`);
}

export async function processPayment(data: {
  bookingId: string;
  method: string;
  amount: number;
  tipAmount?: number;
}): Promise<ApiResponse<Transaction>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      data: {
        transactionId: `TXN-${Date.now()}`,
        status: 'completed',
        method: data.method,
        amount: data.amount + (data.tipAmount || 0),
        currency: 'PKR',
        paidAt: new Date().toISOString(),
      },
      message: 'Payment successful',
    };
  }

  return apiRequest<Transaction>('/payments/process', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Provider Payment APIs
export async function initializeProviderPayment(jobId: string): Promise<ApiResponse<PaymentInitData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        jobId,
        amount: 2500,
        serviceType: 'Electrical Repair',
        customerName: 'Ali Ahmed',
        breakdown: {
          serviceCharge: 2000,
          materialCost: 300,
          additionalCharges: 200,
          discount: 0,
          tax: 0,
        },
      },
      message: 'Payment initialized',
    };
  }

  return apiRequest<PaymentInitData>(`/provider/jobs/${jobId}/payment`);
}

export async function requestPaymentFromCustomer(jobId: string, amount: number): Promise<ApiResponse<{ requestId: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { requestId: `REQ-${Date.now()}` },
      message: 'Payment requested',
    };
  }

  return apiRequest(`/provider/jobs/${jobId}/request-payment`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function confirmOnlinePayment(jobId: string, transactionId: string): Promise<ApiResponse<{ confirmed: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { confirmed: true },
      message: 'Online payment confirmed',
    };
  }

  return apiRequest(`/provider/jobs/${jobId}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({ transactionId }),
  });
}

export async function confirmCashPayment(jobId: string): Promise<ApiResponse<{ transactionId: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { transactionId: `CASH-${Date.now()}` },
      message: 'Cash payment confirmed',
    };
  }

  return apiRequest(`/provider/jobs/${jobId}/confirm-cash`, {
    method: 'POST',
  });
}
