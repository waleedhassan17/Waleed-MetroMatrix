// ============================================
// Shopping - Order serializers
// The backend returns OrderGroupView (one group → N per-brand orders).
// Legacy call sites typed against a single Order get a flattened view;
// new screens (OrderDetail) consume the full group.
// ============================================

import type { Order, OrderGroupView } from '../../types/shopping';

/**
 * Flatten an order group into a single Order-shaped summary:
 * all line items concatenated, totals from the group, status/tracking
 * from the first (or only) child order. Lossless for single-brand
 * checkouts; multi-brand screens should render the group directly.
 */
export const flattenOrderGroup = (group: OrderGroupView): Order => {
  const first = group.orders[0];
  return {
    orderId: group.groupId,
    odexId: group.odexId,
    userId: group.userId,
    brandId: first ? first.brandId : '',
    items: group.orders.flatMap((o) => o.items),
    shippingAddress: group.shippingAddress,
    paymentMethod: group.paymentMethod,
    paymentStatus: group.paymentStatus,
    orderStatus: first ? first.orderStatus : 'pending',
    trackingNumber: first?.trackingNumber,
    subtotal: group.subtotal,
    discount: group.discount,
    shippingFee: group.shippingFee,
    total: group.total,
    createdAt: group.createdAt,
  };
};
