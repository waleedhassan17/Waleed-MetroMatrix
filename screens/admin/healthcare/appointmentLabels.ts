// ============================================================================
// How the console describes an appointment. Pure, so it is tested.
// ============================================================================

import type { HCAppointment } from '../../../networks/admin/healthcareApi';
import { formatDate } from '../../../utils/admin/format';

/** The two kinds of appointment the backend books (Appointment.type). */
export const APPOINTMENT_TYPES = [
  { value: 'all', label: 'Any type' },
  { value: 'in-clinic', label: 'In clinic' },
  { value: 'video', label: 'Video' },
];

export const typeLabel = (type: string | undefined): string =>
  APPOINTMENT_TYPES.find((t) => t.value === type)?.label ?? type ?? '';

/** "12 Oct 2026 10:30", or null when no slot is attached. */
export function appointmentWhen(a: Pick<HCAppointment, 'slotId'>): string | null {
  const date = a.slotId?.date ? formatDate(a.slotId.date) : null;
  return [date, a.slotId?.startTime].filter(Boolean).join(' ') || null;
}

/** The moves an admin may force (controllers/adminHealthcareController.js ADMIN_TRANSITIONS). */
export const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
