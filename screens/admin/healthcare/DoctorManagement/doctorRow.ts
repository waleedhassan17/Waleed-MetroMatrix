// ============================================================================
// What a doctor row says and which decisions it offers. Pure, so it is tested.
// ============================================================================

import type { HCDoctor } from '../../../../networks/admin/healthcareApi';

export type DoctorAction = 'verify' | 'reject' | 'suspend' | 'reactivate';

/**
 * The decisions that make sense for a doctor's state. The server is the
 * judge (it refuses to verify a verified doctor, for one); this keeps the
 * console from offering a door that only opens onto that refusal.
 */
export function doctorActions(d: Pick<HCDoctor, 'verificationStatus' | 'isActive'>): DoctorAction[] {
  switch (d.verificationStatus) {
    case 'pending':
      return ['verify', 'reject'];
    case 'rejected':
      return ['verify'];
    case 'verified':
      return d.isActive === false ? ['reactivate'] : ['suspend'];
    default:
      return [];
  }
}

/** "Cardiology · PMC 12345-P · 8 years" — whatever is known. */
export function doctorSubtitle(d: Pick<HCDoctor, 'specialtyId' | 'pmcNumber' | 'experience'>): string {
  const specialty = d.specialtyId && typeof d.specialtyId === 'object' ? d.specialtyId.name : null;
  const years = typeof d.experience === 'number' ? `${d.experience} year${d.experience === 1 ? '' : 's'}` : null;
  return [specialty, d.pmcNumber ? `PMC ${d.pmcNumber}` : null, years].filter(Boolean).join(' · ');
}
