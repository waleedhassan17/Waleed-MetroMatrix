// ============================================================================
// Doctor app API — the /doctors/me endpoints behind the dashboard, schedule,
// patients, earnings, reviews and the Availability hub.
//
// Every response is serialized here, field by field with fallbacks, so screens
// and slices only ever see the types in models/healthcare/doctorHub. On failure
// the response carries `code` (e.g. 'TEMPLATE_CHANGED') and `errorData` from
// the server, so a screen can react to the specific problem.
// ============================================================================

import { healthcareApiRequest, HealthcareResponse } from './config';
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  ApplyResult,
  AvailabilityHub,
  BookingSettings,
  CalendarDay,
  CalendarSlot,
  CalendarSummaryDay,
  ClinicInput,
  ConsultationType,
  DashboardStats,
  DoctorAppointment,
  DoctorDashboard,
  DoctorTransaction,
  EarningsRangeKey,
  EarningsReport,
  HubClinic,
  OneOffInput,
  OneOffResult,
  Pagination,
  PatientSummary,
  PlanPreview,
  ReviewItem,
  ReviewStats,
  ScheduleConflict,
  TimeOffEntry,
  TimeOffInput,
  TimeOffPreview,
  TimeOffResult,
} from '../../models/healthcare/doctorHub';

type Res<T> = HealthcareResponse<T>;

// ── Helpers ─────────────────────────────────────────────────────

const str = (v: any): string => (v == null ? '' : String(v));
const num = (v: any): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const idOf = (v: any): string => (v && typeof v === 'object' ? str(v._id ?? v.id) : str(v));
const typeOf = (v: any): ConsultationType => (v === 'video' ? 'video' : 'in-clinic');

/** Keep the failure (message, code, errorData), retyped for the caller. */
const fail = <T>(res: Res<any>): Res<T> => ({ ...res, success: false, data: null as any });

const map = async <R, T>(promise: Promise<Res<R>>, fn: (data: R) => T): Promise<Res<T>> => {
  const res = await promise;
  if (!res.success) return fail<T>(res);
  return { ...res, data: fn(res.data) };
};

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

const enc = encodeURIComponent;

const pagination = (raw: any, fallbackLimit: number): Pagination => ({
  page: num(raw?.page) || 1,
  limit: num(raw?.limit) || fallbackLimit,
  total: num(raw?.total),
  pages: num(raw?.pages),
});

// ── Serializers ─────────────────────────────────────────────────

/** Accepts both the list shape and the dashboard shape. */
export function toDoctorAppointment(raw: any): DoctorAppointment {
  const patient = raw?.patientId && typeof raw.patientId === 'object' ? raw.patientId : null;
  const clinic = raw?.clinic ?? (raw?.clinicId && typeof raw.clinicId === 'object' ? raw.clinicId : null);
  const slot = raw?.slotId && typeof raw.slotId === 'object' ? raw.slotId : null;
  const age = Number(raw?.patientInfo?.age);

  return {
    id: str(raw?.appointmentId ?? raw?.id ?? raw?._id),
    patientId: idOf(raw?.patientId),
    patientName: patient?.fullName || raw?.patientInfo?.name || 'Patient',
    patientPhoto: patient?.profilePhoto || null,
    patientPhone: patient?.phoneNumber || patient?.phone || raw?.patientInfo?.phone || '',
    patientAge: Number.isFinite(age) && age > 0 ? age : null,
    patientGender: raw?.patientInfo?.gender || '',
    type: typeOf(raw?.type),
    status: (raw?.status || 'pending') as AppointmentStatus,
    symptoms: raw?.symptoms || '',
    dateKey: raw?.dateKey || slot?.dateKey || '',
    startTime: raw?.startTime || raw?.timeSlot?.start || slot?.startTime || '',
    endTime: raw?.endTime || raw?.timeSlot?.end || slot?.endTime || '',
    startUtc: raw?.startUtc || slot?.startUtc || null,
    endUtc: raw?.endUtc || slot?.endUtc || null,
    timezone: raw?.timezone || raw?.clinicTimezone || slot?.clinicTimezone || 'Asia/Karachi',
    clinic: clinic && clinic.name ? { id: idOf(clinic), name: clinic.name, address: clinic.address } : null,
    fee: num(raw?.fee),
    totalAmount: num(raw?.totalAmount ?? raw?.fee),
    paymentStatus: raw?.payment?.status || 'unpaid',
    cancellationReason: raw?.cancellationReason || '',
    createdAt: str(raw?.createdAt),
  };
}

const toStats = (raw: any): DashboardStats => ({
  appointments: num(raw?.appointments),
  completed: num(raw?.completed),
  upcoming: num(raw?.upcoming),
  pending: num(raw?.pending),
  cancelled: num(raw?.cancelled),
  earnings: num(raw?.earnings),
});

const toConflict = (raw: any): ScheduleConflict => ({
  appointmentId: str(raw?.appointmentId),
  slotId: str(raw?.slotId),
  status: (raw?.status || 'confirmed') as AppointmentStatus,
  patientName: raw?.patientName || 'Patient',
  type: typeOf(raw?.type),
  date: str(raw?.date),
  startTime: str(raw?.startTime),
  endTime: str(raw?.endTime),
  startUtc: raw?.startUtc || null,
  clinic: raw?.clinic ? { id: str(raw.clinic.id), name: raw.clinic.name || 'Clinic' } : null,
});

const toTimeOff = (raw: any): TimeOffEntry => ({
  id: str(raw?.id ?? raw?._id),
  from: str(raw?.from),
  to: str(raw?.to),
  reason: raw?.reason || '',
  createdAt: raw?.createdAt || null,
  legacy: !!raw?.legacy,
  days: num(raw?.days) || 1,
});

const toClinic = (raw: any): HubClinic => ({
  id: idOf(raw),
  name: raw?.name || 'Clinic',
  address: raw?.address || '',
  city: raw?.city || '',
  area: raw?.area || '',
  timezone: raw?.timezone || null,
});

const toSettings = (raw: any): BookingSettings => ({
  slotDuration: num(raw?.slotDuration) || 30,
  bufferMinutes: num(raw?.bufferMinutes),
  videoConsultation: raw?.videoConsultation !== false,
  autoConfirm: !!raw?.autoConfirm,
  timezone: raw?.timezone || null,
});

export const toCalendarSlot = (raw: any): CalendarSlot => ({
  id: str(raw?.id ?? raw?._id),
  date: str(raw?.date),
  startTime: str(raw?.startTime),
  endTime: str(raw?.endTime),
  startUtc: raw?.startUtc || null,
  endUtc: raw?.endUtc || null,
  type: typeOf(raw?.type),
  clinic: raw?.clinic ? { id: str(raw.clinic.id), name: raw.clinic.name || 'Clinic', address: raw.clinic.address } : null,
  source: raw?.source === 'template' || raw?.source === 'manual' ? raw.source : null,
  blockedBy: raw?.blockedBy || null,
  state: raw?.state || 'open',
  isPast: !!raw?.isPast,
  canBlock: !!raw?.canBlock,
  canUnblock: !!raw?.canUnblock,
  canDelete: !!raw?.canDelete,
  maxPatients: num(raw?.maxPatients) || 1,
  bookedCount: num(raw?.bookedCount),
  appointments: (raw?.appointments || []).map((a: any) => ({
    id: str(a?.id),
    status: (a?.status || 'pending') as AppointmentStatus,
    type: typeOf(a?.type),
    patientName: a?.patientName || 'Patient',
  })),
});

// ── Dashboard ───────────────────────────────────────────────────

export const fetchDoctorDashboard = (): Promise<Res<DoctorDashboard>> =>
  map(healthcareApiRequest<any>('/doctors/me/dashboard'), (d) => ({
    doctorName: d?.doctorName || '',
    timezone: d?.timezone || 'Asia/Karachi',
    today: toStats(d?.today),
    thisWeek: toStats(d?.thisWeek),
    thisMonth: toStats(d?.thisMonth),
    rating: num(d?.rating),
    totalReviews: num(d?.totalReviews),
    pendingRequests: num(d?.pendingRequests),
    nextAppointment: d?.nextAppointment ? toDoctorAppointment(d.nextAppointment) : null,
    todayAppointments: (d?.todayAppointments || []).map(toDoctorAppointment),
  }));

// ── Appointments ────────────────────────────────────────────────

export interface AppointmentQuery {
  from?: string;
  to?: string;
  date?: string;
  status?: 'upcoming' | 'past' | AppointmentStatus;
  page?: number;
  limit?: number;
}

export const fetchDoctorAppointments = (query: AppointmentQuery = {}): Promise<Res<AppointmentPage>> =>
  map(healthcareApiRequest<any>(`/doctors/me/appointments${qs({ ...query })}`), (d) => ({
    appointments: (d?.appointments || []).map(toDoctorAppointment),
    todayCount: num(d?.todayCount),
    upcomingCount: num(d?.upcomingCount),
    pagination: pagination(d?.pagination, query.limit ?? 10),
  }));

export const fetchDoctorAppointmentDetail = (id: string): Promise<Res<AppointmentDetail>> =>
  map(healthcareApiRequest<any>(`/doctors/me/appointments/${enc(id)}`), (d) => ({
    appointment: toDoctorAppointment(d?.appointment),
    patientHistory: (d?.patientHistory || []).map(toDoctorAppointment),
    prescription: d?.prescription
      ? { id: str(d.prescription.id), diagnosis: d.prescription.diagnosis || '', createdAt: str(d.prescription.createdAt) }
      : null,
  }));

export const confirmDoctorAppointment = (id: string): Promise<Res<DoctorAppointment>> =>
  map(healthcareApiRequest<any>(`/doctors/me/appointments/${enc(id)}/confirm`, { method: 'PATCH' }), (d) =>
    toDoctorAppointment(d?.appointment)
  );

export const completeDoctorAppointment = (id: string): Promise<Res<DoctorAppointment>> =>
  map(healthcareApiRequest<any>(`/doctors/me/appointments/${enc(id)}/complete`, { method: 'PATCH' }), (d) =>
    toDoctorAppointment(d?.appointment)
  );

export const cancelDoctorAppointment = (
  id: string,
  reason: string
): Promise<Res<{ appointment: DoctorAppointment; refunded: number }>> =>
  map(
    healthcareApiRequest<any>(`/doctors/me/appointments/${enc(id)}/cancel`, { method: 'PATCH', data: { reason } }),
    (d) => ({ appointment: toDoctorAppointment(d?.appointment), refunded: num(d?.refunded) })
  );

// ── Patients ────────────────────────────────────────────────────

export const fetchMyPatients = (
  query: { q?: string; page?: number; limit?: number } = {}
): Promise<Res<{ patients: PatientSummary[]; pagination: Pagination }>> =>
  map(healthcareApiRequest<any>(`/doctors/me/patients${qs(query)}`), (d) => ({
    patients: (d?.patients || []).map(
      (p: any): PatientSummary => ({
        patientId: str(p?.patientId),
        name: p?.name || 'Patient',
        profilePhoto: p?.profilePhoto || null,
        phone: p?.phone || '',
        lastVisit: p?.lastVisit || null,
        lastAppointmentId: str(p?.lastAppointmentId),
        lastStatus: (p?.lastStatus || 'completed') as AppointmentStatus,
        lastType: typeOf(p?.lastType),
        appointmentCount: num(p?.appointmentCount),
      })
    ),
    pagination: pagination(d?.pagination, query.limit ?? 20),
  }));

// ── Earnings ────────────────────────────────────────────────────

export const fetchEarningsReport = (query: {
  range: EarningsRangeKey;
  startDate?: string;
  endDate?: string;
}): Promise<Res<EarningsReport>> =>
  map(healthcareApiRequest<any>(`/doctors/me/earnings${qs(query)}`), (d) => ({
    rangeKey: (d?.range?.key || query.range) as EarningsRangeKey,
    label: d?.range?.label || '',
    from: str(d?.range?.from),
    to: str(d?.range?.to),
    bucket: d?.period === 'monthly' ? 'month' : 'day',
    total: num(d?.total),
    count: num(d?.count),
    byType: (d?.byType || []).map((t: any) => ({ type: typeOf(t?.type), total: num(t?.total), count: num(t?.count) })),
    buckets: (d?.breakdown || []).map((b: any) => {
      const types: any[] = b?.types || [];
      const of = (type: string) => types.filter((t) => t?.type === type).reduce((n, t) => n + num(t?.total), 0);
      return { key: str(b?._id), total: num(b?.totalAmount), count: num(b?.count), video: of('video'), inClinic: of('in-clinic') };
    }),
    previousTotal: num(d?.previousTotal),
    previousLabel: d?.previousPeriodLabel || '',
  }));

export const fetchDoctorTransactions = (
  query: { page?: number; limit?: number } = {}
): Promise<Res<{ transactions: DoctorTransaction[]; pagination: Pagination }>> =>
  map(healthcareApiRequest<any>(`/doctors/me/transactions${qs(query)}`), (d) => ({
    transactions: (d?.transactions || []).map(
      (t: any): DoctorTransaction => ({
        id: str(t?.transactionId),
        appointmentId: str(t?.appointmentId),
        patientName: t?.patientName || 'Patient',
        type: typeOf(t?.type),
        amount: num(t?.amount),
        date: str(t?.date),
      })
    ),
    pagination: pagination(d?.pagination, query.limit ?? 50),
  }));

// ── Reviews ─────────────────────────────────────────────────────

export const fetchDoctorReviews = (
  query: { rating?: number; page?: number; limit?: number } = {}
): Promise<Res<{ reviews: ReviewItem[]; stats: ReviewStats; pagination: Pagination }>> =>
  map(healthcareApiRequest<any>(`/doctors/me/reviews${qs(query)}`), (d) => {
    const breakdown = d?.stats?.breakdown || {};
    return {
      reviews: (d?.reviews || []).map(
        (r: any): ReviewItem => ({
          id: str(r?._id ?? r?.id),
          rating: num(r?.rating),
          comment: r?.comment || r?.review || r?.text || '',
          patientName: r?.isAnonymous ? 'Anonymous' : r?.patientId?.fullName || 'Patient',
          patientPhoto: r?.isAnonymous ? null : r?.patientId?.profilePhoto || null,
          createdAt: str(r?.createdAt),
        })
      ),
      stats: {
        average: num(d?.stats?.average ?? d?.averageRating),
        total: num(d?.stats?.total ?? d?.totalReviews),
        breakdown: {
          '1': num(breakdown['1']),
          '2': num(breakdown['2']),
          '3': num(breakdown['3']),
          '4': num(breakdown['4']),
          '5': num(breakdown['5']),
        },
      },
      pagination: pagination(d?.pagination, query.limit ?? 10),
    };
  });

// ── Availability hub: weekly hours ──────────────────────────────

export const fetchAvailabilityHub = (): Promise<Res<AvailabilityHub>> =>
  map(healthcareApiRequest<any>('/doctors/me/availability'), (d) => ({
    version: num(d?.version),
    timezone: d?.timezone || 'Asia/Karachi',
    settings: toSettings(d?.settings),
    slotDurationChosen: !!d?.slotDurationChosen,
    weeklyAvailability: Array.isArray(d?.weeklyAvailability) ? d.weeklyAvailability : [],
    timeOff: (d?.timeOff || []).map(toTimeOff),
    clinics: (d?.clinics || []).map(toClinic),
    horizon: { days: num(d?.horizon?.days), from: str(d?.horizon?.from), through: str(d?.horizon?.through) },
    verificationStatus: d?.verificationStatus || '',
  }));

export interface WeeklyHoursBody {
  weeklyAvailability: any[];
  settings: Partial<BookingSettings>;
}

export const previewWeeklyHours = (body: WeeklyHoursBody): Promise<Res<PlanPreview>> =>
  map(healthcareApiRequest<any>('/doctors/me/availability/preview', { method: 'POST', data: body }), (d) => ({
    baseVersion: num(d?.baseVersion),
    window: { from: str(d?.window?.from), through: str(d?.window?.through) },
    summary: {
      add: num(d?.summary?.add),
      remove: num(d?.summary?.remove),
      keep: num(d?.summary?.keep),
      conflicts: num(d?.summary?.conflicts),
      skipped: num(d?.summary?.skipped),
    },
    byDate: (d?.byDate || []).map((b: any) => ({
      date: str(b?.date),
      add: num(b?.add),
      remove: num(b?.remove),
      conflicts: num(b?.conflicts),
    })),
    conflicts: (d?.conflicts || []).map(toConflict),
    skipped: (d?.skipped || []).map((s: any) => ({
      date: str(s?.date),
      type: typeOf(s?.type),
      startTime: str(s?.startTime),
      endTime: str(s?.endTime),
      reason: str(s?.reason),
    })),
    warnings: (d?.warnings || []).map((w: any) => ({ day: str(w?.day), code: str(w?.code), message: str(w?.message) })),
  }));

export const applyWeeklyHours = (body: WeeklyHoursBody & { baseVersion: number }): Promise<Res<ApplyResult>> =>
  map(healthcareApiRequest<any>('/doctors/me/availability', { method: 'PUT', data: body }), (d) => ({
    version: num(d?.version),
    partial: !!d?.partial,
    summary: {
      removed: num(d?.summary?.removed),
      added: num(d?.summary?.added),
      kept: num(d?.summary?.kept),
      skipped: num(d?.summary?.skipped),
      conflicts: num(d?.summary?.conflicts),
    },
    conflicts: (d?.conflicts || []).map(toConflict),
  }));

export const updateAutoConfirm = (autoConfirm: boolean): Promise<Res<BookingSettings>> =>
  map(
    healthcareApiRequest<any>('/doctors/me/availability/settings', { method: 'PATCH', data: { autoConfirm } }),
    (d) => toSettings(d?.settings)
  );

// ── Availability hub: calendar ──────────────────────────────────

export const fetchCalendarDay = (date: string): Promise<Res<CalendarDay>> =>
  map(healthcareApiRequest<any>(`/doctors/me/slots/day${qs({ date })}`), (d) => ({
    date: str(d?.date),
    timezone: d?.timezone || 'Asia/Karachi',
    isPast: !!d?.isPast,
    inHorizon: !!d?.inHorizon,
    timeOff: d?.timeOff ? toTimeOff(d.timeOff) : null,
    summary: {
      open: num(d?.summary?.open),
      requested: num(d?.summary?.requested),
      booked: num(d?.summary?.booked),
      held: num(d?.summary?.held),
      blocked: num(d?.summary?.blocked),
      past: num(d?.summary?.past),
      total: num(d?.summary?.total),
    },
    slots: (d?.slots || []).map(toCalendarSlot),
  }));

export const fetchCalendarSummary = (from: string, to: string): Promise<Res<CalendarSummaryDay[]>> =>
  map(healthcareApiRequest<any>(`/doctors/me/slots/summary${qs({ from, to })}`), (d) =>
    (d?.days || []).map(
      (day: any): CalendarSummaryDay => ({
        date: str(day?.date),
        total: num(day?.total),
        open: num(day?.open),
        booked: num(day?.booked),
        blocked: num(day?.blocked),
        requested: num(day?.requested),
        timeOff: !!day?.timeOff,
      })
    )
  );

export const createOneOffSlots = (input: OneOffInput): Promise<Res<OneOffResult>> =>
  map(healthcareApiRequest<any>('/doctors/me/slots', { method: 'POST', data: input }), (d) => ({
    created: (d?.created || []).map(toCalendarSlot),
    skipped: (d?.skipped || []).map((s: any) => ({
      type: typeOf(s?.type),
      startTime: str(s?.startTime),
      endTime: str(s?.endTime),
      reason: str(s?.reason),
    })),
    unusedMinutes: num(d?.unusedMinutes),
  }));

export const setSlotBlocked = (slotId: string, action: 'block' | 'unblock'): Promise<Res<CalendarSlot>> =>
  map(healthcareApiRequest<any>(`/doctors/me/slots/${enc(slotId)}`, { method: 'PATCH', data: { action } }), (d) =>
    toCalendarSlot(d?.slot)
  );

export const deleteCalendarSlot = (slotId: string): Promise<Res<{ outcome: 'deleted' | 'closed' }>> =>
  map(healthcareApiRequest<any>(`/doctors/me/slots/${enc(slotId)}`, { method: 'DELETE' }), (d) => ({
    outcome: d?.outcome === 'closed' ? 'closed' : 'deleted',
  }));

export const blockCalendarDay = (date: string): Promise<Res<{ blocked: number; bookedKept: number }>> =>
  map(healthcareApiRequest<any>('/doctors/me/slots/day/block', { method: 'POST', data: { date } }), (d) => ({
    blocked: num(d?.blocked),
    bookedKept: (d?.bookedKept || []).length,
  }));

export const unblockCalendarDay = (date: string): Promise<Res<{ unblocked: number; held: number }>> =>
  map(healthcareApiRequest<any>('/doctors/me/slots/day/unblock', { method: 'POST', data: { date } }), (d) => ({
    unblocked: num(d?.unblocked),
    held: num(d?.held),
  }));

// ── Availability hub: time off ──────────────────────────────────

export const previewTimeOff = (from: string, to: string): Promise<Res<TimeOffPreview>> =>
  map(healthcareApiRequest<any>('/doctors/me/time-off/preview', { method: 'POST', data: { from, to } }), (d) => ({
    from: str(d?.from),
    to: str(d?.to),
    days: num(d?.days),
    slotsToBlock: num(d?.slotsToBlock),
    conflicts: (d?.conflicts || []).map(toConflict),
    overlapsExisting: d?.overlapsExisting ? toTimeOff(d.overlapsExisting) : null,
  }));

export const createTimeOff = (input: TimeOffInput): Promise<Res<TimeOffResult>> =>
  map(healthcareApiRequest<any>('/doctors/me/time-off', { method: 'POST', data: input }), (d) => ({
    timeOff: toTimeOff(d?.timeOff),
    blockedSlots: num(d?.blockedSlots),
    conflicts: (d?.conflicts || []).map(toConflict),
    cancelled: (d?.cancelled || []).map((c: any) => ({ appointmentId: str(c?.appointmentId), refunded: num(c?.refunded) })),
    failed: (d?.failed || []).map((f: any) => ({ appointmentId: str(f?.appointmentId), message: str(f?.message) })),
    pendingCancellations: (d?.pendingCancellations || []).map(str),
  }));

export const deleteTimeOff = (id: string): Promise<Res<{ reopened: number; generated: number }>> =>
  map(healthcareApiRequest<any>(`/doctors/me/time-off/${enc(id)}`, { method: 'DELETE' }), (d) => ({
    reopened: num(d?.reopened),
    generated: num(d?.generated),
  }));

// ── Clinics ─────────────────────────────────────────────────────

export const createDoctorClinic = (input: ClinicInput): Promise<Res<HubClinic>> =>
  map(healthcareApiRequest<any>('/doctors/me/clinics', { method: 'POST', data: input }), (d) =>
    toClinic(d?.clinic ?? d)
  );

export const updateDoctorClinic = (id: string, input: Partial<ClinicInput>): Promise<Res<HubClinic>> =>
  map(healthcareApiRequest<any>(`/doctors/me/clinics/${enc(id)}`, { method: 'PATCH', data: input }), (d) =>
    toClinic(d?.clinic ?? d)
  );

export const deleteDoctorClinic = (id: string): Promise<Res<{ id: string }>> =>
  map(healthcareApiRequest<any>(`/doctors/me/clinics/${enc(id)}`, { method: 'DELETE' }), () => ({ id }));
