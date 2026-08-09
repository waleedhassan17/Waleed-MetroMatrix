// ============================================
// Provider Domain - API Functions
// ============================================
//
// Screen → Slice → Network (this file) → API Server → Serializer → Slice → Screen
// Real backend endpoints live under /api/v1/healthcare/doctors/me/*.
// A few provider screens (medical notes, transactions ledger, patient history,
// coupons, payments) have no backend endpoint yet and degrade gracefully.

import { healthcareApiRequest } from './config';
import { APP_CURRENCY } from '../../constants/Currency';
import {
  dashboardDataSerializer,
  earningTransactionSerializer,
  chartDataPointSerializer,
  consultationBreakdownSerializer,
  queuePatientSerializer,
  dayScheduleSerializer,
  vacationDateSerializer,
  medicalNoteSerializer,
  notePatientSerializer,
  prescriptionDetailSerializer,
  patientRecordSerializer,
  doctorProfileDataSerializer,
  couponSerializer,
} from '../../serializers/healthcare/providerSerializer';
import {
  appointmentSerializer,
  timeSlotSerializer,
  medicalRecordSerializer,
} from '../../serializers/healthcare/healthcareSerializer';

import type { ApiResponse } from '../../models/serviceProviders';
import type {
  DoctorDashboardData,
  Appointment,
  EarningTransaction,
  ChartDataPoint,
  ConsultationBreakdown,
  PeriodFilter,
  QueuePatient,
  TimeSlot,
  Clinic,
  DaySchedule,
  VacationDate,
  MedicalNote,
  NoteAttachment,
  NotePatient,
  MedicalRecord,
  PrescriptionDetail,
  Medication,
  PatientRecord,
  DoctorProfileData,
  Coupon,
} from '../../models/healthcare/types';

const genderLabel = (g?: string): 'Male' | 'Female' | 'Other' => {
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  return 'Other';
};

// ═══════════════════════════════════════════
//  DOCTOR DASHBOARD
// ═══════════════════════════════════════════

export async function fetchDoctorDashboardApi(): Promise<ApiResponse<DoctorDashboardData>> {
  const res = await healthcareApiRequest<any>('/doctors/me/dashboard');
  if (res.success) {
    const d = res.data || {};
    const transformed = {
      doctorName: d.doctorName || '',
      todayStats: {
        totalAppointments: d.today?.appointments || 0,
        patientsSeen: d.today?.completed || 0,
        pending: d.today?.upcoming || 0,
        cancelled: 0,
      },
      upcomingAppointments: d.nextAppointment ? [d.nextAppointment] : [],
      earnings: {
        today: d.today?.earnings || 0,
        thisWeek: d.thisWeek?.earnings || 0,
        thisMonth: d.thisMonth?.earnings || 0,
        currency: APP_CURRENCY,
      },
    };
    return { ...res, data: dashboardDataSerializer(transformed) };
  }
  return res as ApiResponse<DoctorDashboardData>;
}

// ═══════════════════════════════════════════
//  DOCTOR SCHEDULE
// ═══════════════════════════════════════════

export async function fetchDoctorScheduleApi(
  params: { from?: string; to?: string; limit?: number } = {}
): Promise<ApiResponse<Appointment[]>> {
  // Was hardcoded to `status=upcoming&limit=50`, so past days could never
  // return anything and appointment #51 was unreachable. The backend accepts
  // an inclusive from/to range, so ask for exactly the week being displayed.
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (!params.from && !params.to) qs.set('status', 'upcoming');
  qs.set('limit', String(params.limit ?? 200));

  const res = await healthcareApiRequest<any>(`/doctors/me/appointments?${qs.toString()}`);
  if (res.success) {
    const list = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);
    return { ...res, data: list.map(appointmentSerializer) };
  }
  return res as ApiResponse<Appointment[]>;
}

// ═══════════════════════════════════════════
//  DOCTOR EARNINGS
// ═══════════════════════════════════════════

export async function fetchDoctorEarningsApi(
  period: PeriodFilter
): Promise<ApiResponse<{ total: number; chart: ChartDataPoint[]; breakdown: ConsultationBreakdown[] }>> {
  const periodMap: Record<string, string> = { today: 'daily', thisWeek: 'weekly', thisMonth: 'monthly', custom: 'daily' };
  const res = await healthcareApiRequest<any>(
    `/doctors/me/earnings?period=${encodeURIComponent(periodMap[period] || 'daily')}`
  );
  if (res.success) {
    const rows: any[] = res.data?.breakdown || [];
    const total = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const chart = rows.map((r) => ({ label: r._id, value: r.totalAmount || 0 }));
    const typeAgg: Record<string, { count: number; total: number }> = {};
    rows.forEach((r) =>
      (r.types || []).forEach((t: any) => {
        typeAgg[t.type] = typeAgg[t.type] || { count: 0, total: 0 };
        typeAgg[t.type].count += t.count || 0;
        typeAgg[t.type].total += t.total || 0;
      })
    );
    const breakdown = Object.entries(typeAgg).map(([type, v]) => ({
      type,
      count: v.count,
      total: v.total,
      percentage: total ? Math.round((v.total / total) * 100) : 0,
    }));
    return {
      ...res,
      data: {
        total,
        chart: chart.map(chartDataPointSerializer),
        breakdown: breakdown.map(consultationBreakdownSerializer),
      },
    };
  }
  return res as ApiResponse<{ total: number; chart: ChartDataPoint[]; breakdown: ConsultationBreakdown[] }>;
}

export async function fetchDoctorTransactionsApi(): Promise<ApiResponse<EarningTransaction[]>> {
  const res = await healthcareApiRequest<any>('/doctors/me/transactions');
  if (res.success) {
    const list = res.data?.transactions || (Array.isArray(res.data) ? res.data : []);
    return { ...res, data: list.map(earningTransactionSerializer) };
  }
  return res as ApiResponse<EarningTransaction[]>;
}

// ═══════════════════════════════════════════
//  PATIENT QUEUE
// ═══════════════════════════════════════════

export async function fetchPatientQueueApi(): Promise<ApiResponse<QueuePatient[]>> {
  // Ask for TODAY by date range, not `status=upcoming`. That status hard-filters
  // the DB query to pending/confirmed (see healthcareDoctorController), so
  // completed appointments never came back and the queue's "completed" side
  // could only ever read 0. A from/to range returns every status for the day,
  // which is what a queue actually needs. It also drops next week's
  // appointments, which the old query happily listed under "Today's Queue".
  const today = new Date().toISOString().split('T')[0];
  const res = await healthcareApiRequest<any>(
    `/doctors/me/appointments?from=${today}&to=${today}&limit=100`,
  );
  if (res.success) {
    const list = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);

    const queue = list
      // Only confirmed and completed belong in a queue. The old mapping sent
      // EVERY unrecognised status to 'waiting', so cancelled and no-show
      // appointments were presented to the doctor as patients waiting.
      .filter((a: any) => a.status === 'confirmed' || a.status === 'completed')
      .map((a: any, idx: number) =>
        queuePatientSerializer({
          queueId: a.id || a._id,
          patientId: a.patientId?._id || a.patientId,
          patientName: a.patientId?.fullName || a.patientInfo?.name || '',
          // 0 rendered as "0y" on every card; undefined means "not known" and
          // the card omits the demographics line entirely.
          age: a.patientInfo?.age || undefined,
          gender: a.patientInfo?.gender ? genderLabel(a.patientInfo.gender) : undefined,
          appointmentId: a.id || a._id,
          type: a.type,
          timeSlot: { start: a.slotId?.startTime || '', end: a.slotId?.endTime || '' },
          symptoms: a.symptoms || '',
          status: a.status === 'completed' ? 'completed' : 'waiting',
          // Position in today's list — NOT a clinic-issued token. The previous
          // `estimatedWaitMinutes: idx * 15` was rendered as "~15 min wait",
          // a clinically actionable figure invented from array position.
          position: idx + 1,
          history: [],
        })
      );
    return { ...res, data: queue };
  }
  return res as ApiResponse<QueuePatient[]>;
}

export async function updateQueuePatientApi(
  queueId: string,
  action: 'start' | 'complete' | 'skip' | 'call-next'
): Promise<ApiResponse<{ queueId: string }>> {
  // Map queue actions to appointment status transitions.
  const map: Record<string, { path: string; data?: any } | null> = {
    start: { path: `/doctors/me/appointments/${queueId}/confirm` },
    complete: { path: `/doctors/me/appointments/${queueId}/complete` },
    skip: { path: `/doctors/me/appointments/${queueId}/cancel`, data: { reason: 'Patient did not show up' } },
    'call-next': null,
  };
  const op = map[action];
  if (!op) return { success: true, data: { queueId }, message: 'Next patient called' };
  const res = await healthcareApiRequest<any>(op.path, { method: 'PATCH', data: op.data });
  return { success: res.success, data: { queueId }, message: res.message };
}

// ═══════════════════════════════════════════
//  MANAGE SLOTS
// ═══════════════════════════════════════════

export async function fetchManageSlotsApi(
  clinicId: string,
  date: string,
  duration: number,
  maxPatients: number
): Promise<ApiResponse<{ slots: TimeSlot[]; clinics: Clinic[] }>> {
  const [slotsRes, clinicsRes] = await Promise.all([
    healthcareApiRequest<any>(`/slots/my-slots?date=${encodeURIComponent(date)}`),
    healthcareApiRequest<any>('/doctors/me/clinics'),
  ]);
  const slots = (slotsRes.success ? slotsRes.data || [] : []).map(timeSlotSerializer);
  const clinics = clinicsRes.success ? clinicsRes.data?.clinics || clinicsRes.data || [] : [];
  return { success: true, data: { slots, clinics }, message: 'Slots loaded' };
}

export interface ClinicInput {
  name: string;
  address: string;
  city: string;
  area?: string;
  phone?: string;
  coordinates?: { lat: number; lng: number };
}

/**
 * Clinic CRUD. These endpoints have existed on the backend all along
 * (POST/PATCH/DELETE /doctors/me/clinics) but nothing in the app called them,
 * so a doctor could only ever use clinics an admin had created for them.
 */
export async function createClinicApi(input: ClinicInput): Promise<ApiResponse<Clinic>> {
  const res = await healthcareApiRequest<any>('/doctors/me/clinics', {
    method: 'POST',
    data: input,
  });
  return res.success
    ? { ...res, data: res.data?.clinic ?? res.data }
    : (res as ApiResponse<Clinic>);
}

export async function updateClinicApi(
  clinicId: string,
  input: Partial<ClinicInput>,
): Promise<ApiResponse<Clinic>> {
  const res = await healthcareApiRequest<any>(`/doctors/me/clinics/${clinicId}`, {
    method: 'PATCH',
    data: input,
  });
  return res.success
    ? { ...res, data: res.data?.clinic ?? res.data }
    : (res as ApiResponse<Clinic>);
}

export async function deleteClinicApi(clinicId: string): Promise<ApiResponse<{ success: boolean }>> {
  return healthcareApiRequest<any>(`/doctors/me/clinics/${clinicId}`, { method: 'DELETE' });
}

export async function saveSlotsApi(slots: TimeSlot[]): Promise<ApiResponse<{ success: boolean }>> {
  // Module slot-create endpoint takes an explicit slots array.
  const payload = {
    slots: slots.map((s) => ({
      clinicId: s.clinicId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      type: s.appointmentType === 'both' ? 'in-clinic' : s.appointmentType,
      maxPatients: s.maxPatients,
    })),
  };
  const res = await healthcareApiRequest<any>('/slots', { method: 'POST', data: payload });
  return { success: res.success, data: { success: res.success }, message: res.message };
}

// ═══════════════════════════════════════════
//  AVAILABILITY SETTINGS
// ═══════════════════════════════════════════

export async function fetchAvailabilitySettingsApi(): Promise<
  ApiResponse<{ weeklySchedule: DaySchedule[]; vacationDates: VacationDate[]; instantBooking: boolean; videoConsultation: boolean }>
> {
  const res = await healthcareApiRequest<any>('/doctors/me/availability');
  const av = res.success ? res.data || {} : {};
  // Backend absentDates → vacation entries (single-day each).
  const vacationDates = (av.absentDates || []).map((d: any, i: number) => {
    const day = new Date(d).toISOString().split('T')[0];
    return { id: `abs-${i}`, startDate: day, endDate: day, reason: 'Absent' };
  });
  return {
    success: true,
    data: {
      // The slice normalises the backend weeklyAvailability (online/onsite ranges).
      weeklySchedule: av.weeklyAvailability || [],
      vacationDates,
      instantBooking: av.isAvailable ?? true,
      videoConsultation: true,
    },
    message: 'Settings loaded',
  };
}

// Expand an inclusive date range into YYYY-MM-DD strings.
function expandDateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(new Date(d).toISOString().split('T')[0]);
  }
  return out;
}

export async function saveAvailabilitySettingsApi(settings: {
  weeklySchedule: any[];
  vacationDates: any[];
  instantBooking: boolean;
  videoConsultation: boolean;
}): Promise<ApiResponse<{ success: boolean }>> {
  const weeklyAvailability = (settings.weeklySchedule || []).map((d: any) => ({
    day: d.day,
    isWorking: d.isWorking,
    // Send EVERY range. This used to send only [{startTime, endTime}] from a
    // single flat pair, so a doctor could never express a break even though
    // the server has always stored ranges[] and generates slots from each.
    online: {
      enabled: !!d.online?.enabled,
      ranges: d.online?.enabled ? (d.online.ranges || []) : [],
    },
    onsite: {
      enabled: !!d.onsite?.enabled,
      clinicId: d.onsite?.clinicId || null,
      ranges: d.onsite?.enabled ? (d.onsite.ranges || []) : [],
    },
  }));
  const absentDates = (settings.vacationDates || []).flatMap((v: any) => expandDateRange(v.startDate, v.endDate));
  const res = await healthcareApiRequest<any>('/doctors/me/availability', {
    method: 'PATCH',
    data: { isAvailable: settings.instantBooking, weeklyAvailability, absentDates },
  });
  return { success: res.success, data: { success: res.success }, message: res.message };
}

// Generate bookable slots from the saved weekly availability.
export async function generateSlotsApi(params: {
  startDate: string;
  endDate: string;
  slotDuration?: number;
}): Promise<ApiResponse<any>> {
  const res = await healthcareApiRequest<any>('/doctors/me/slots/generate', { method: 'POST', data: params });
  return { success: res.success, data: res.data, message: res.message };
}

// ═══════════════════════════════════════════
//  MEDICAL NOTES (no backend endpoint yet — degrade gracefully)
// ═══════════════════════════════════════════

export async function fetchPatientNotesApi(
  patientId: string
): Promise<ApiResponse<{ patient: NotePatient; notes: MedicalNote[] }>> {
  const res = await healthcareApiRequest<any>(`/doctors/me/patients/${encodeURIComponent(patientId)}/notes`);
  if (res.success) {
    return {
      ...res,
      data: {
        patient: notePatientSerializer(res.data?.patient || { patientId }),
        notes: (res.data?.notes || []).map(medicalNoteSerializer),
      },
    };
  }
  return res as ApiResponse<{ patient: NotePatient; notes: MedicalNote[] }>;
}

export async function saveNoteApi(note: MedicalNote & { patientId?: string }): Promise<ApiResponse<MedicalNote>> {
  const body = {
    patientId: note.patientId,
    appointmentId: note.appointmentId,
    title: note.title,
    content: note.content,
    tags: note.tags,
    attachments: note.attachments,
  };
  const res = note.noteId
    ? await healthcareApiRequest<any>(`/doctors/me/notes/${encodeURIComponent(note.noteId)}`, { method: 'PATCH', data: body })
    : await healthcareApiRequest<any>('/doctors/me/notes', { method: 'POST', data: body });
  if (res.success) {
    return { ...res, data: medicalNoteSerializer(res.data?.note || res.data) };
  }
  return res as ApiResponse<MedicalNote>;
}

export async function deleteNoteApi(noteId: string): Promise<ApiResponse<{ noteId: string }>> {
  const res = await healthcareApiRequest<any>(`/doctors/me/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
  return { success: res.success, data: { noteId }, message: res.message };
}

export async function attachFileApi(
  noteId: string,
  attachment: NoteAttachment
): Promise<ApiResponse<NoteAttachment>> {
  // File binary upload isn't backed yet; attachment metadata is persisted when the
  // note is saved. Return the attachment so the UI can reflect it immediately.
  return { success: true, data: attachment, message: 'File attached' };
}

// ═══════════════════════════════════════════
//  PRESCRIPTION WRITER
// ═══════════════════════════════════════════

export async function savePrescriptionApi(prescription: {
  patientId: string;
  appointmentId: string;
  diagnosis: string;
  medications: Medication[];
  tests: string[];
  advice: string;
  followUpDate: string;
}): Promise<ApiResponse<{ success: boolean }>> {
  const payload = {
    appointmentId: prescription.appointmentId,
    diagnosis: prescription.diagnosis,
    medications: prescription.medications,
    tests: (prescription.tests || []).map((t) => ({ name: t })),
    advice: prescription.advice,
    ...(prescription.followUpDate && { followUpDate: prescription.followUpDate }),
  };
  const res = await healthcareApiRequest<any>('/doctors/me/prescriptions', { method: 'POST', data: payload });
  return { success: res.success, data: { success: res.success }, message: res.message };
}

// ═══════════════════════════════════════════
//  PRESCRIPTION VIEW (enriched)
// ═══════════════════════════════════════════

export async function fetchPrescriptionDetailApi(
  prescriptionId: string
): Promise<ApiResponse<PrescriptionDetail>> {
  const res = await healthcareApiRequest<any>('/doctors/me/prescriptions?limit=200');
  if (res.success) {
    const list = res.data?.prescriptions || (Array.isArray(res.data) ? res.data : []);
    const p = list.find((x: any) => (x.id || x._id || x.prescriptionId) === prescriptionId);
    if (!p) return { success: false, data: null as any, message: 'Prescription not found' };
    const detail = {
      prescriptionId: p.id || p._id,
      appointmentId: p.appointmentId?._id || p.appointmentId,
      doctor: {
        doctorId: p.doctorId?._id || p.doctorId,
        name: p.doctorId?.providerId?.fullName || '',
        specialty: p.doctorId?.specialtyId?.name || '',
        profileImage: p.doctorId?.providerId?.profilePhoto || '',
        qualifications: p.doctorId?.qualifications || [],
      },
      patient: {
        patientId: p.patientId?._id || p.patientId,
        name: p.patientId?.fullName || '',
        age: 0,
        gender: '',
      },
      diagnosis: p.diagnosis || '',
      medications: p.medications || [],
      testsRecommended: (p.tests || []).map((t: any) => (typeof t === 'string' ? t : t?.name || '')),
      specialInstructions: p.advice || '',
      followUpDate: p.followUpDate ?? null,
      issuedAt: p.createdAt || '',
    };
    return { ...res, data: prescriptionDetailSerializer(detail) };
  }
  return res as ApiResponse<PrescriptionDetail>;
}

// ═══════════════════════════════════════════
//  HEALTH RECORDS
// ═══════════════════════════════════════════

export async function fetchHealthRecordsApi(
  patientId: string
): Promise<ApiResponse<MedicalRecord[]>> {
  // Health records are owned by the authenticated user (patient self-service).
  const res = await healthcareApiRequest<any>('/health-records');
  if (res.success) {
    const list = Array.isArray(res.data) ? res.data : res.data?.records || [];
    return { ...res, data: list.map(medicalRecordSerializer) };
  }
  return res as ApiResponse<MedicalRecord[]>;
}

export async function deleteHealthRecordApi(
  recordId: string
): Promise<ApiResponse<{ recordId: string }>> {
  const res = await healthcareApiRequest<any>(`/health-records/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
  return { success: res.success, data: { recordId }, message: res.message };
}

// ═══════════════════════════════════════════
//  PATIENT HISTORY (provider side) — no dedicated endpoint, degrade gracefully
// ═══════════════════════════════════════════

export async function fetchPatientHistoryApi(
  patientId: string
): Promise<ApiResponse<PatientRecord>> {
  const res = await healthcareApiRequest<any>(`/doctors/me/patients/${encodeURIComponent(patientId)}/history`);
  if (res.success) {
    return { ...res, data: patientRecordSerializer(res.data) };
  }
  return res as ApiResponse<PatientRecord>;
}

// ═══════════════════════════════════════════
//  DOCTOR PROFILE
// ═══════════════════════════════════════════

export async function fetchDoctorProviderProfileApi(): Promise<ApiResponse<DoctorProfileData>> {
  const res = await healthcareApiRequest<any>('/doctors/me');
  if (res.success) {
    const doc = res.data?.doctor || res.data || {};
    const provider = typeof doc.providerId === 'object' ? doc.providerId : {};
    const clinic = (doc.clinics || [])[0] || {};
    const mapped = {
      doctorId: doc.id || doc._id,
      fullName: provider.fullName || '',
      email: provider.email || '',
      phone: provider.phone || '',
      specialization: typeof doc.specialtyId === 'object' ? doc.specialtyId?.name : '',
      qualification: (doc.qualifications || []).join(', '),
      experience: doc.experience || 0,
      pmcNumber: doc.pmcNumber || '',
      bio: doc.about || '',
      clinicName: clinic.name || '',
      clinicAddress: clinic.address || '',
      consultationFee: doc.consultationFee || 0,
      videoConsultationFee: doc.videoConsultationFee || 0,
      currency: APP_CURRENCY,
      languages: doc.languages || [],
      rating: doc.rating || 0,
      totalReviews: doc.totalReviews || 0,
      totalPatients: doc.totalPatients || 0,
      isVerified: doc.verificationStatus === 'verified',
      isAvailable: doc.isAvailable ?? true,
    };
    return { ...res, data: doctorProfileDataSerializer(mapped) };
  }
  return res as ApiResponse<DoctorProfileData>;
}

export async function updateDoctorProviderProfileApi(
  updates: Partial<DoctorProfileData>
): Promise<ApiResponse<DoctorProfileData>> {
  const payload: any = {};
  if (updates.bio !== undefined) payload.about = updates.bio;
  if (updates.consultationFee !== undefined) payload.consultationFee = updates.consultationFee;
  if (updates.videoConsultationFee !== undefined) payload.videoConsultationFee = updates.videoConsultationFee;
  if (updates.experience !== undefined) payload.experience = updates.experience;
  if (updates.qualification !== undefined) payload.qualifications = updates.qualification.split(',').map((q) => q.trim());
  const res = await healthcareApiRequest<any>('/doctors/me', { method: 'PATCH', data: payload });
  if (res.success) {
    // Re-read for a fully-populated profile.
    return fetchDoctorProviderProfileApi();
  }
  return res as ApiResponse<DoctorProfileData>;
}

// ═══════════════════════════════════════════
//  COUPON VALIDATION (payment excluded — no-op)
// ═══════════════════════════════════════════

export async function applyCouponApi(code: string): Promise<ApiResponse<Coupon>> {
  return {
    success: false,
    data: { code: code.toUpperCase().trim(), discountPercent: 0, maxDiscount: 0, isValid: false, message: 'Coupons are not available' } as Coupon,
    message: 'Coupons are not available',
  };
}

// ═══════════════════════════════════════════
//  PAYMENT PROCESSING (excluded — pay at clinic)
// ═══════════════════════════════════════════

export async function processPaymentApi(payment: {
  appointmentId: string;
  amount: number;
  method: 'cash' | 'card' | 'online' | 'insurance';
}): Promise<ApiResponse<{ paymentId: string; status: string }>> {
  return {
    success: true,
    data: { paymentId: `payatclinic-${payment.appointmentId}`, status: 'pending' },
    message: 'Payment will be collected at the clinic',
  };
}

// ── H5 additions: doctor reviews, notifications, patients list ──

export async function fetchMyReviewsApi(): Promise<ApiResponse<any>> {
  return healthcareApiRequest<any>('/doctors/me/reviews');
}

export async function fetchDoctorNotificationsApi(): Promise<ApiResponse<any[]>> {
  const res = await healthcareApiRequest<any>('/notifications');
  if (res.success) {
    const list = res.data?.notifications || (Array.isArray(res.data) ? res.data : []);
    return { ...res, data: list };
  }
  return res as ApiResponse<any[]>;
}

export async function markNotificationReadApi(notificationId: string): Promise<ApiResponse<any>> {
  return healthcareApiRequest<any>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'PATCH' }
  );
}

export async function markAllNotificationsReadApi(): Promise<ApiResponse<any>> {
  return healthcareApiRequest<any>('/notifications/read-all', { method: 'PATCH' });
}

/** Distinct patients derived from my appointments (no dedicated endpoint needed). */
export async function fetchMyPatientsApi(): Promise<
  ApiResponse<{ patientId: string; name: string; lastVisit: string; appointmentCount: number }[]>
> {
  const res = await healthcareApiRequest<any>('/doctors/me/appointments');
  if (!res.success) return res as any;
  const list = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);
  const byPatient = new Map<string, { patientId: string; name: string; lastVisit: string; appointmentCount: number }>();
  for (const apt of list) {
    const pid = String(apt.patientId?._id || apt.patientId?.id || apt.patientId || '');
    if (!pid) continue;
    const name = apt.patientId?.fullName || apt.patientInfo?.name || 'Patient';
    const when = apt.createdAt || '';
    const existing = byPatient.get(pid);
    if (existing) {
      existing.appointmentCount += 1;
      if (when > existing.lastVisit) existing.lastVisit = when;
    } else {
      byPatient.set(pid, { patientId: pid, name, lastVisit: when, appointmentCount: 1 });
    }
  }
  return { success: true, data: [...byPatient.values()], message: 'Patients derived from appointments' };
}
