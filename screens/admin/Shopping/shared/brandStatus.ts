// ============================================================================
// The one decision a brand's state offers. Pure, so it is tested.
// ============================================================================

import type { BrandStatus } from '../../../../networks/admin/shoppingApi';

export interface BrandDecision {
  /** The status the decision moves the brand to. */
  status: BrandStatus;
  verb: string;
  title: string;
  message: string;
  destructive?: boolean;
}

/** Approve a pending brand, suspend a live one, reactivate a suspended one. */
export function nextDecision(status: BrandStatus | undefined): BrandDecision | null {
  switch (status) {
    case 'pending':
      return { status: 'active', verb: 'Approve', title: 'Approve this brand?', message: 'Its storefront and products become visible to customers.' };
    case 'active':
      return {
        status: 'suspended',
        verb: 'Suspend',
        title: 'Suspend this brand?',
        message: 'Customers stop seeing it and cannot order. Orders already placed carry on.',
        destructive: true,
      };
    case 'suspended':
      return { status: 'active', verb: 'Reactivate', title: 'Reactivate this brand?', message: 'Its storefront and products become visible to customers again.' };
    default:
      return null;
  }
}
