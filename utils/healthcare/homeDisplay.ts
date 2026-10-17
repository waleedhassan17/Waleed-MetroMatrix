// ============================================
// Health home — what the page shows from its payload
// ============================================
//
// Pure: no React, no navigation objects. The screen turns these answers into
// navigate() calls, so the rules (which specialties lead, where a banner goes,
// when a visit can be joined) are tested on their own.

import type { Appointment, Doctor, DoctorListPreset, HealthcareBanner, Specialty } from '../../models/healthcare/types';

/**
 * The home's specialty grid: those with doctors first (in the API's order), so
 * a patient's first tap finds someone; then the rest.
 */
export const homeSpecialties = (specialties: Specialty[], count = 8): Specialty[] =>
  [...specialties.filter((s) => s.doctorCount > 0), ...specialties.filter((s) => !(s.doctorCount > 0))].slice(0, count);

// The specialty's own icon key (the seed's `heart`, `body` … and the older
// app keys `heart-pulse`, `baby` …), as a MaterialCommunityIcons glyph.
const ICON_BY_KEY: Record<string, string> = {
  heart: 'heart-pulse',
  'heart-pulse': 'heart-pulse',
  body: 'face-woman-shimmer',
  skin: 'face-woman-shimmer',
  hand: 'hand-heart',
  brain: 'brain',
  stomach: 'stomach',
  bone: 'bone',
  child: 'baby-face-outline',
  baby: 'baby-face-outline',
  female: 'human-pregnant',
  stethoscope: 'stethoscope',
  ear: 'ear-hearing',
  eye: 'eye-outline',
  smile: 'tooth-outline',
  tooth: 'tooth-outline',
  lungs: 'lungs',
  mind: 'head-heart-outline',
};

// Failing that, a word in its name.
const ICON_BY_NAME: [RegExp, string][] = [
  [/cardio|heart/i, 'heart-pulse'],
  [/derma|skin/i, 'face-woman-shimmer'],
  [/neuro|brain/i, 'brain'],
  [/gastro|stomach|digest/i, 'stomach'],
  [/ortho|bone|joint/i, 'bone'],
  [/p(a)?ediat|child/i, 'baby-face-outline'],
  [/gyn|obstet|women/i, 'human-pregnant'],
  [/\bent\b|ear|nose|throat/i, 'ear-hearing'],
  [/ophthal|eye/i, 'eye-outline'],
  [/dent|tooth/i, 'tooth-outline'],
  [/pulmo|lung|chest/i, 'lungs'],
  [/psych|mental/i, 'head-heart-outline'],
];

/** A specialty's (or a concern's) glyph: its icon key, else its name, else a stethoscope. */
export const specialtyIcon = (icon?: string | null, name?: string | null): string => {
  const key = (icon || '').trim().toLowerCase();
  if (ICON_BY_KEY[key]) return ICON_BY_KEY[key];
  const hit = ICON_BY_NAME.find(([re]) => re.test(name || ''));
  return hit ? hit[1] : 'stethoscope';
};

// One-word names too long for a quarter of a phone's width, as patients say them.
const GRID_LABELS: Record<string, string> = {
  gastroenterology: 'Gastro',
  gastroenterologist: 'Gastro',
  ophthalmology: 'Eye care',
  ophthalmologist: 'Eye care',
  otolaryngology: 'ENT',
  otorhinolaryngology: 'ENT',
  endocrinology: 'Hormones',
  endocrinologist: 'Hormones',
  rheumatology: 'Joints',
  rheumatologist: 'Joints',
};

/** A specialty's name in the four-column grid (the full name stays its spoken label). */
export const gridLabel = (name: string): string => GRID_LABELS[name.trim().toLowerCase()] ?? name;

/** The lower of a doctor's clinic and video fees (0: none set). */
export const fromFee = (d: Pick<Doctor, 'consultationFee' | 'videoConsultationFee'>): number => {
  const fees = [d.consultationFee, d.videoConsultationFee].filter((f) => typeof f === 'number' && f > 0);
  return fees.length ? Math.min(...fees) : 0;
};

export type HomeRoute =
  | { name: 'DoctorList'; params: { specialtyId: string; specialtyName?: string; filter: DoctorListPreset } }
  | { name: 'DoctorDetail'; params: { doctorId: string } }
  | { name: 'SymptomChecker' | 'Emergency' | 'HealthRecords'; params?: undefined };

/** Where a banner leads, or null for a decoration-only banner. */
export const bannerRoute = (b: HealthcareBanner): HomeRoute | null => {
  switch (b.targetType) {
    case 'specialty':
      return b.target ? { name: 'DoctorList', params: { specialtyId: b.target.id, specialtyName: b.target.name, filter: {} } } : null;
    case 'doctor':
      return b.target ? { name: 'DoctorDetail', params: { doctorId: b.target.id } } : null;
    case 'screen':
      switch (b.targetScreen) {
        case 'video_consultation':
          return { name: 'DoctorList', params: { specialtyId: '', specialtyName: 'Video consultation', filter: { consultationType: 'video' } } };
        case 'available_today':
          return { name: 'DoctorList', params: { specialtyId: '', specialtyName: 'Available today', filter: { availability: 'today' } } };
        case 'symptom_checker':
          return { name: 'SymptomChecker' };
        case 'emergency':
          return { name: 'Emergency' };
        case 'records':
          return { name: 'HealthRecords' };
        default:
          return null;
      }
    default:
      return null;
  }
};

const SCREEN_CTA: Record<NonNullable<HealthcareBanner['targetScreen']>, string> = {
  video_consultation: 'Start a video visit',
  available_today: 'See who is free',
  symptom_checker: 'Check symptoms',
  emergency: 'Get help now',
  records: 'Open records',
};

/** The words on a banner's button, from where it leads (null: no button). */
export const bannerCta = (b: HealthcareBanner): string | null => {
  if (b.targetType === 'specialty') return 'Find a doctor';
  if (b.targetType === 'doctor') return 'See profile';
  if (b.targetType === 'screen' && b.targetScreen) return SCREEN_CTA[b.targetScreen];
  return null;
};

const MINUTE = 60 * 1000;

/**
 * When a visit starts and ends, read the way the appointment screens read it
 * (its clinic day and wall-clock times). Null when the time is missing.
 */
export const visitTimes = (a: Pick<Appointment, 'date' | 'timeSlot'>): { start: Date; end: Date } | null => {
  if (!a.date || !a.timeSlot?.start) return null;
  const start = new Date(`${a.date}T${a.timeSlot.start}`);
  if (Number.isNaN(start.getTime())) return null;
  const end = a.timeSlot.end ? new Date(`${a.date}T${a.timeSlot.end}`) : new Date(start.getTime() + 30 * MINUTE);
  return { start, end: Number.isNaN(end.getTime()) ? new Date(start.getTime() + 30 * MINUTE) : end };
};

export type VisitAction = { kind: 'join' | 'pay'; label: string; icon: string };

/**
 * The one thing to do about the next visit now: join a video visit from
 * `joinEarlyMinutes` before it starts until it ends (confirmed only, as the
 * appointment screen allows), else pay a fee still owed, else nothing.
 */
export const nextVisitAction = (a: Appointment, now: number, joinEarlyMinutes: number): VisitAction | null => {
  const t = visitTimes(a);
  if (a.type === 'video' && a.status === 'confirmed' && t && now >= t.start.getTime() - joinEarlyMinutes * MINUTE && now <= t.end.getTime()) {
    return { kind: 'join', label: 'Join consultation', icon: 'videocam' };
  }
  const active = a.status === 'pending' || a.status === 'confirmed';
  if (active && a.payment?.status === 'unpaid') return { kind: 'pay', label: 'Pay consultation fee', icon: 'card-outline' };
  return null;
};

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "Starts in 25 min", "Today", "Tomorrow" — or null for a visit further out. */
export const visitSoonLabel = (a: Pick<Appointment, 'date' | 'timeSlot'>, now: number): string | null => {
  const t = visitTimes(a);
  if (!t) return null;
  const until = t.start.getTime() - now;
  if (until <= 0 && now <= t.end.getTime()) return 'Now';
  if (until > 0 && until < 60 * MINUTE) return `Starts in ${Math.max(1, Math.round(until / MINUTE))} min`;
  const today = new Date(now);
  if (dayKey(t.start) === dayKey(today)) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dayKey(t.start) === dayKey(tomorrow)) return 'Tomorrow';
  return null;
};
