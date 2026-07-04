// ============================================
// Healthcare — Doctor display helpers
// Single source of truth for turning a Doctor /
// appointment record into human-readable strings.
// Replaces the `bio.split(' ')[1]` anti-pattern
// and the fabricated fallbacks (fake 4.5 rating,
// "1,500" fee, "5" yrs) that used to be scattered
// across every patient screen.
// ============================================

import type { Doctor, Appointment } from '../../models/healthcare/types';

type DoctorLike = Partial<
  Pick<
    Doctor,
    | 'name'
    | 'bio'
    | 'specialtyName'
    | 'subspecialties'
    | 'qualifications'
    | 'consultationFee'
    | 'videoConsultationFee'
    | 'rating'
    | 'totalReviews'
    | 'experience'
    | 'profileImage'
  >
>;

/** Bare doctor name, no title prefix. Falls back gracefully. */
export function getDoctorName(doctor?: DoctorLike | null): string {
  const raw = (doctor?.name || '').trim();
  if (raw) return raw.replace(/^(dr\.?\s+)/i, '').trim() || raw;
  return 'Doctor';
}

/** Display name with a single, de-duplicated "Dr." prefix. */
export function getDoctorDisplayName(doctor?: DoctorLike | null): string {
  return `Dr. ${getDoctorName(doctor)}`;
}

/** Two-letter initials for avatar fallbacks. */
export function getDoctorInitials(doctor?: DoctorLike | null): string {
  const name = getDoctorName(doctor);
  if (!name || name === 'Doctor') return 'Dr';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Best available specialty label without fabricating one. */
export function getDoctorSpecialty(doctor?: DoctorLike | null): string {
  return (
    doctor?.specialtyName?.trim() ||
    doctor?.subspecialties?.[0]?.trim() ||
    doctor?.qualifications?.[0]?.trim() ||
    'Specialist'
  );
}

/** Qualifications line, e.g. "MBBS • FCPS". Empty string if none. */
export function getQualificationsLine(doctor?: DoctorLike | null): string {
  const quals = (doctor?.qualifications || []).filter(Boolean);
  return quals.join(' • ');
}

/** Formats a fee in PKR. Returns null when no real fee is known. */
export function formatFee(amount?: number | null): string | null {
  if (amount == null || Number.isNaN(amount) || amount <= 0) return null;
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
}

/** Consultation fee string, or "On request" when unknown — never a fake number. */
export function getConsultationFee(doctor?: DoctorLike | null): string {
  return formatFee(doctor?.consultationFee) ?? 'On request';
}

export function getVideoFee(doctor?: DoctorLike | null): string | null {
  return formatFee(doctor?.videoConsultationFee);
}

/** Experience label, or null when unknown (so the UI can hide it). */
export function getExperienceLabel(doctor?: DoctorLike | null): string | null {
  const yrs = doctor?.experience;
  if (yrs == null || yrs <= 0) return null;
  return `${yrs}+ yrs exp`;
}

/** Rating info that does NOT fabricate a score for unrated doctors. */
export function getRating(doctor?: DoctorLike | null): {
  hasRating: boolean;
  value: string;
  count: number;
} {
  const rating = doctor?.rating ?? 0;
  const count = doctor?.totalReviews ?? 0;
  const hasRating = rating > 0 && count > 0;
  return {
    hasRating,
    value: hasRating ? rating.toFixed(1) : 'New',
    count,
  };
}

/** Which consultation modes a doctor offers. */
export function getConsultationModes(doctor?: DoctorLike | null): {
  inClinic: boolean;
  video: boolean;
} {
  return {
    inClinic: true,
    video: (doctor?.videoConsultationFee ?? 0) > 0,
  };
}

/** Patient-friendly count, e.g. 1200 -> "1.2k". */
export function formatPatientCount(n?: number | null): string | null {
  if (!n || n <= 0) return null;
  if (n > 999) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Appointment display helpers ──────────────

export function getAppointmentDoctorName(appt?: Partial<Appointment> | null): string {
  const raw = (appt?.doctorName || '').trim();
  if (raw) return `Dr. ${raw.replace(/^(dr\.?\s+)/i, '').trim()}`;
  return 'Doctor';
}

/** Patient display name from an appointment/queue record. Never fabricates. */
export function getPatientName(record?: { patientName?: string } | null): string {
  return record?.patientName?.trim() || 'Patient';
}

/** Generic initials for any person name. */
export function getInitials(name?: string | null): string {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatApptDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatApptTime(slot?: { start?: string; end?: string }): string {
  if (!slot?.start) return '';
  return slot.end ? `${slot.start} – ${slot.end}` : slot.start;
}
