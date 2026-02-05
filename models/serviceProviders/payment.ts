// ============================================
// PAYMENT MODELS
// ============================================

export interface PaymentRecipient {
  id: string;
  name: string;
  image: string;
}

export interface PaymentDetails {
  bookingId: string;
  service: string;
  description: string;
  amount: number;
  suggestedAmount: number;
  invoiceId: string;
}

export interface PaymentMethod {
  id: 'cash' | 'jazzcash' | 'easypaisa' | 'card';
  name: string;
  icon: string;
  enabled: boolean;
  description: string;
}

export interface PaymentData {
  paymentId: string;
  recipient: PaymentRecipient;
  details: PaymentDetails;
  availableMethods: PaymentMethod[];
}

export interface Transaction {
  transactionId: string;
  status: 'completed' | 'failed' | 'pending';
  method: string;
  amount: number;
  currency: string;
  paidAt: string;
}

export interface PaymentBreakdown {
  serviceCharge: number;
  materialCost?: number;
  additionalCharges?: number;
  discount?: number;
  tax?: number;
}

export interface PaymentInitData {
  jobId: string;
  amount: number;
  serviceType: string;
  customerName: string;
  breakdown: PaymentBreakdown;
}
