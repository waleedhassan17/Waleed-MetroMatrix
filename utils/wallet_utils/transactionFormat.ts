/**
 * Shared transaction display formatting — used by WalletScreen and
 * TransactionHistoryScreen so a transaction reads identically wherever it's
 * shown (Part 2.6: "consistent" wallet UI across the app).
 */
import {
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  Banknote,
  Building2,
  Wrench,
  Stethoscope,
  ShoppingBag,
  Percent,
} from 'lucide-react-native';
import type { TransactionModule, TransactionSource } from '../../models/wallet';

export const getCurrencySymbol = (code: string): string => {
  const map: Record<string, string> = {
    usd: '$', eur: '€', gbp: '£', pkr: '₨', inr: '₹', aed: 'د.إ', sar: '﷼',
  };
  return map[(code || '').toLowerCase()] || code.toUpperCase();
};

export const formatMoney = (amount: number, currency: string): string => {
  const safe = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  const symbol = getCurrencySymbol(currency);
  const formatted = Math.abs(safe).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
};

/** Status → semantic colour token name; caller maps to its own Colors import. */
export const STATUS_COLOR_KEY: Record<string, 'success' | 'warning' | 'error' | 'info' | 'tertiary'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
  refunded: 'info',
};

export const splitMoney = (amount: number) => {
  const safe = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  const fixed = Math.abs(safe).toFixed(2);
  const [whole, cents] = fixed.split('.');
  const withCommas = parseInt(whole, 10).toLocaleString();
  return { whole: withCommas, cents };
};

export const startOfDay = (d: Date) => {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
};

export const getDateBucket = (iso: string): string => {
  const date = new Date(iso);
  const today = startOfDay(new Date());
  const yesterday = startOfDay(new Date(today.getTime() - 86400000));
  const weekAgo = startOfDay(new Date(today.getTime() - 7 * 86400000));
  const txDay = startOfDay(date);

  if (txDay.getTime() === today.getTime()) return 'Today';
  if (txDay.getTime() === yesterday.getTime()) return 'Yesterday';
  if (txDay.getTime() > weekAgo.getTime()) return 'This week';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
};

export const formatFullDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    });
  } catch { return iso; }
};

const SOURCE_LABELS: Record<string, string> = {
  stripe_topup: 'Top-up',
  service_payment: 'Service payment',
  refund: 'Refund',
  admin_adjustment: 'Adjustment',
  payout: 'Bank payout',
  transfer_in: 'Received',
  transfer_out: 'Sent',
  transfer_fee: 'Fee',
  homeservice_payment: 'Home service payment',
  homeservice_earning: 'Home service earnings',
  healthcare_payment: 'Consultation payment',
  healthcare_earning: 'Consultation earnings',
  shopping_payment: 'Order payment',
  shopping_earning: 'Order earnings',
  commission: 'Platform commission',
};

export const prettySource = (source: string): string =>
  SOURCE_LABELS[source] || source.replace(/_/g, ' ');

export const getSourceIcon = (source: TransactionSource, type: 'credit' | 'debit') => {
  switch (source) {
    case 'payout':
      return Building2;
    case 'transfer_in':
      return ArrowDownLeft;
    case 'transfer_out':
      return Send;
    case 'transfer_fee':
    case 'commission':
      return Percent;
    case 'homeservice_payment':
    case 'homeservice_earning':
      return Wrench;
    case 'healthcare_payment':
    case 'healthcare_earning':
      return Stethoscope;
    case 'shopping_payment':
    case 'shopping_earning':
      return ShoppingBag;
    default:
      return type === 'credit' ? ArrowDownLeft : ArrowUpRight;
  }
};

export const MODULE_LABELS: Record<TransactionModule, string> = {
  homeservice: 'Home Services',
  healthcare: 'Healthcare',
  shopping: 'Shopping',
  topup: 'Top-up',
  payout: 'Payout',
};

export const MODULE_FILTERS: { key: TransactionModule | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'homeservice', label: 'Home Services' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'topup', label: 'Top-up' },
  { key: 'payout', label: 'Payout' },
];

/** Human label for a transaction's relatedTo.kind, for the "view X" link. */
export const RELATED_TO_LABEL: Record<string, string> = {
  Booking: 'View booking',
  Appointment: 'View appointment',
  Order: 'View order',
  OrderGroup: 'View order',
  PayoutRequest: 'View payout',
};
