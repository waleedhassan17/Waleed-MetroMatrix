/**
 * ============================================
 * Brand (vendor) design tokens
 * ============================================
 * One source of truth for the brand-side screens.
 *
 * Every screen used to declare its own palette literal, and they had drifted:
 * `warning` was #D97706 on Orders and Process Order but #F59E0B on Products
 * and Inventory; `primaryLight` was #FFF5EB on nine screens and #FFF3E6 on
 * five; Profile, Reviews, Coupons and Settings used a separate three-key
 * object with `danger: #E74C3C` where everything else used `error: #EF4444`.
 * The same status therefore rendered in two different ambers depending on
 * which screen you were looking at.
 *
 * The keys below are the union of every key those literals used, so screens
 * can swap their local block for an import without touching call sites.
 */

export const B = {
  // Brand
  primary: '#E67E22',
  primaryDark: '#D35400',
  primaryLight: '#FFF5EB',
  primaryMuted: 'rgba(230,126,34,0.08)',

  // Surfaces
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  border: '#F0F0F0',
  borderStrong: '#E5E7EB',

  // Type
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  inactive: '#94A3B8',

  // Semantic. The *Light variants are backgrounds; the solid tone is sized
  // for text and icons sitting on top of them.
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  danger: '#EF4444',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  star: '#F1C40F',
} as const;

/** Screens that used the smaller `ShopColors` literal import this instead. */
export const ShopColors = B;

export const BSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const BRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

/** Cards sit on B.bg, so the lift is soft rather than a hard border. */
export const BShadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export interface StatusTone {
  bg: string;
  text: string;
}

/**
 * One mapping for every order/return/delivery status in the vendor UI.
 *
 * Screens each kept their own table and they disagreed: the dashboard drew
 * `processing` in blue (#DBEAFE/#2563EB) and `shipped` in indigo, while the
 * orders list drew `processing` in info-blue and `shipped` in purple — so one
 * order changed colour depending on which screen you opened. This follows the
 * orders list, which is the surface vendors actually work from.
 */
export const statusTone = (status: string): StatusTone => {
  switch (status?.toLowerCase()) {
    case 'delivered':
    case 'completed':
    case 'approved':
    case 'active':
      return { bg: B.successLight, text: B.success };
    case 'confirmed':
    case 'processing':
    case 'packed':
      return { bg: B.infoLight, text: B.info };
    case 'shipped':
    case 'out_for_delivery':
    case 'in_transit':
    case 'picked_up':
      return { bg: B.purpleLight, text: B.purple };
    case 'pending':
    case 'requested':
    case 'awaiting_pickup':
      return { bg: B.warningLight, text: B.warning };
    case 'cancelled':
    case 'rejected':
    case 'returned':
    case 'refunded':
    case 'expired':
      return { bg: B.errorLight, text: B.error };
    default:
      return { bg: B.border, text: B.textSec };
  }
};

/** "out_for_delivery" → "Out for delivery". */
export const humanizeStatus = (status: string): string => {
  if (!status) return '';
  const words = status.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Short, quotable order number. Mongo ids were being printed raw in the
 * vendor UI; odexId is already human-readable so it passes through.
 */
export const formatOrderNumber = (id?: string): string => {
  if (!id) return '';
  return id.startsWith('ODX') ? id : `#${id.substring(0, 8).toUpperCase()}`;
};
