// ============================================================================
// Doctor app models — appointments, dashboard, earnings, and the Availability
// hub (weekly hours, calendar, time off).
//
// These mirror the doctor endpoints under /api/v1/healthcare/doctors/me and are
// produced only by the serializers in networks/healthcare/doctorHubApi.ts.
// The older shapes in ./types stay for the patient screens that use them.
// ============================================================================

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type ConsultationType = 'video' | 'in-clinic';

export interface ClinicRef {
  id: string;
  name: string;
  address?: string;
}

export interface DoctorAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhoto: string | null;
  patientPhone: string;
  /** Null when the booking did not record one. */
  patientAge: number | null;
  patientGender: string;
  type: ConsultationType;
  status: AppointmentStatus;
  symptoms: string;
  /** Calendar day at the clinic, `YYYY-MM-DD`. */
  dateKey: string;
  startTime: string;
  endTime: string;
  startUtc: string | null;
  endUtc: string | null;
  timezone: string;
  clinic: ClinicRef | null;
  fee: number;
  totalAmount: number;
  paymentStatus: string;
  cancellationReason: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ── Dashboard ───────────────────────────────────────────────────

export interface DashboardStats {
  appointments: number;
  completed: number;
  upcoming: number;
  pending: number;
  cancelled: number;
  earnings: number;
}

export interface DoctorDashboard {
  doctorName: string;
  timezone: string;
  today: DashboardStats;
  thisWeek: DashboardStats;
  thisMonth: DashboardStats;
  rating: number;
  totalReviews: number;
  /** Requests waiting for the doctor's approval, across all days. */
  pendingRequests: number;
  nextAppointment: DoctorAppointment | null;
  todayAppointments: DoctorAppointment[];
}

// ── Appointments & patients ─────────────────────────────────────

export interface AppointmentPage {
  appointments: DoctorAppointment[];
  todayCount: number;
  upcomingCount: number;
  pagination: Pagination;
}

export interface AppointmentDetail {
  appointment: DoctorAppointment;
  patientHistory: DoctorAppointment[];
  prescription: { id: string; diagnosis: string; createdAt: string } | null;
}

export interface PatientSummary {
  patientId: string;
  name: string;
  profilePhoto: string | null;
  phone: string;
  lastVisit: string | null;
  lastAppointmentId: string;
  lastStatus: AppointmentStatus;
  lastType: ConsultationType;
  appointmentCount: number;
}

// ── Earnings & reviews ──────────────────────────────────────────

export type EarningsRangeKey = 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom';

export interface EarningsBucket {
  /** `YYYY-MM-DD`, or `YYYY-MM` when bucketed by month. */
  key: string;
  total: number;
  count: number;
  video: number;
  inClinic: number;
}

export interface EarningsReport {
  rangeKey: EarningsRangeKey;
  label: string;
  from: string;
  to: string;
  bucket: 'day' | 'month';
  total: number;
  count: number;
  byType: { type: ConsultationType; total: number; count: number }[];
  buckets: EarningsBucket[];
  previousTotal: number;
  previousLabel: string;
}

export interface DoctorTransaction {
  id: string;
  appointmentId: string;
  patientName: string;
  type: ConsultationType;
  amount: number;
  date: string;
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  patientName: string;
  patientPhoto: string | null;
  createdAt: string;
}

export interface ReviewStats {
  average: number;
  total: number;
  breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
}

// ── Availability hub ────────────────────────────────────────────

export interface BookingSettings {
  slotDuration: number;
  bufferMinutes: number;
  videoConsultation: boolean;
  autoConfirm: boolean;
  timezone: string | null;
}

export interface HubClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  area: string;
  timezone: string | null;
}

export interface TimeOffEntry {
  id: string;
  from: string;
  to: string;
  reason: string;
  createdAt: string | null;
  legacy: boolean;
  days: number;
}

export interface AvailabilityHub {
  version: number;
  timezone: string;
  settings: BookingSettings;
  slotDurationChosen: boolean;
  /** Raw server week; normalise with utils/healthcare/timeRanges.normalizeWeek. */
  weeklyAvailability: any[];
  timeOff: TimeOffEntry[];
  clinics: HubClinic[];
  horizon: { days: number; from: string; through: string };
  verificationStatus: string;
}

/** A booked appointment a change would affect. */
export interface ScheduleConflict {
  appointmentId: string;
  slotId: string;
  status: AppointmentStatus;
  patientName: string;
  type: ConsultationType;
  date: string;
  startTime: string;
  endTime: string;
  startUtc: string | null;
  clinic: ClinicRef | null;
}

export interface PlanPreview {
  baseVersion: number;
  window: { from: string; through: string };
  summary: { add: number; remove: number; keep: number; conflicts: number; skipped: number };
  byDate: { date: string; add: number; remove: number; conflicts: number }[];
  conflicts: ScheduleConflict[];
  skipped: { date: string; type: ConsultationType; startTime: string; endTime: string; reason: string }[];
  warnings: { day: string; code: string; message: string }[];
}

export interface ApplyResult {
  version: number;
  partial: boolean;
  summary: { removed: number; added: number; kept: number; skipped: number; conflicts: number };
  conflicts: ScheduleConflict[];
}

export type CalendarSlotState = 'open' | 'requested' | 'booked' | 'held' | 'blocked' | 'past';

export interface CalendarSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startUtc: string | null;
  endUtc: string | null;
  type: ConsultationType;
  clinic: ClinicRef | null;
  source: 'template' | 'manual' | null;
  blockedBy: 'doctor' | 'time_off' | 'template' | null;
  state: CalendarSlotState;
  isPast: boolean;
  canBlock: boolean;
  canUnblock: boolean;
  canDelete: boolean;
  maxPatients: number;
  bookedCount: number;
  appointments: { id: string; status: AppointmentStatus; type: ConsultationType; patientName: string }[];
}

export interface CalendarDay {
  date: string;
  timezone: string;
  isPast: boolean;
  inHorizon: boolean;
  timeOff: TimeOffEntry | null;
  summary: Record<CalendarSlotState | 'total', number>;
  slots: CalendarSlot[];
}

export interface CalendarSummaryDay {
  date: string;
  total: number;
  open: number;
  booked: number;
  blocked: number;
  requested: number;
  timeOff: boolean;
}

export interface OneOffInput {
  date: string;
  startTime: string;
  endTime: string;
  type: ConsultationType | 'both';
  clinicId?: string | null;
  split?: boolean;
  maxPatients?: number;
}

export interface SkippedTime {
  type: ConsultationType;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface OneOffResult {
  created: CalendarSlot[];
  skipped: SkippedTime[];
  unusedMinutes: number;
}

export interface TimeOffPreview {
  from: string;
  to: string;
  days: number;
  slotsToBlock: number;
  conflicts: ScheduleConflict[];
  overlapsExisting: TimeOffEntry | null;
}

export interface TimeOffInput {
  from: string;
  to: string;
  reason?: string;
  onConflict?: 'keep' | 'cancel';
  confirmAppointmentIds?: string[];
}

export interface TimeOffResult {
  timeOff: TimeOffEntry;
  blockedSlots: number;
  conflicts: ScheduleConflict[];
  cancelled: { appointmentId: string; refunded: number }[];
  failed: { appointmentId: string; message: string }[];
  pendingCancellations: string[];
}

export interface ClinicInput {
  name: string;
  address: string;
  city: string;
  area?: string;
  phone?: string;
}
