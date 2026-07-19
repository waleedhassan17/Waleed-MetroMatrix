// ============================================
// Provider Domain - API Functions
// ============================================
//
// Screen → Slice → Network (this file) → API Server → Serializer → Slice → Screen
// Real backend endpoints live under /api/v1/healthcare/doctors/me/*.
// A few provider screens (medical notes, transactions ledger, patient history,
// coupons, payments) have no backend endpoint yet and degrade gracefully.

import { healthcareApiRequest, USE_HEALTHCARE_DUMMY_DATA } from './config';
import {
  dummyDashboardData,
  dummyEarningTransactions,
  dummyEarningsChartData,
  dummyEarningsBreakdown,
  dummyEarningsTotals,
  generateDummyScheduleAppointments,
  generateDummyQueue,
  dummyManageSlotsClinics,
  generateDummySlots,
  dummyWeeklySchedule,
  dummyVacationDates,
  dummyNotePatient,
  dummyMedicalNotes,
  dummyPrescriptionDetail,
  dummyHealthRecords,
  dummyPatientRecord,
  dummyDoctorProfile,
  dummyCoupons,
} from './dummyData';
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));
    return { success: true, data: dashboardDataSerializer(dummyDashboardData), message: 'Dashboard loaded' };
  }
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
        currency: 'PKR',
      },
    };
    return { ...res, data: dashboardDataSerializer(transformed) };
  }
  return res as ApiResponse<DoctorDashboardData>;
}

// ═══════════════════════════════════════════
//  DOCTOR SCHEDULE
// ═══════════════════════════════════════════

export async function fetchDoctorScheduleApi(): Promise<ApiResponse<Appointment[]>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: generateDummyScheduleAppointments().map(appointmentSerializer), message: 'Schedule loaded' };
  }
  const res = await healthcareApiRequest<any>('/doctors/me/appointments?status=upcoming&limit=50');
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      success: true,
      data: {
        total: dummyEarningsTotals[period],
        chart: (dummyEarningsChartData[period] || []).map(chartDataPointSerializer),
        breakdown: dummyEarningsBreakdown.map(consultationBreakdownSerializer),
      },
      message: 'Earnings loaded',
    };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true, data: dummyEarningTransactions.map(earningTransactionSerializer), message: 'Transactions loaded' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: generateDummyQueue().map(queuePatientSerializer), message: 'Queue loaded' };
  }
  const res = await healthcareApiRequest<any>('/doctors/me/appointments?status=upcoming&limit=50');
  if (res.success) {
    const list = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);
    const queue = list.map((a: any, idx: number) =>
      queuePatientSerializer({
        queueId: a.id || a._id,
        patientId: a.patientId?._id || a.patientId,
        patientName: a.patientId?.fullName || a.patientInfo?.name || '',
        age: a.patientInfo?.age || 0,
        gender: genderLabel(a.patientInfo?.gender),
        appointmentId: a.id || a._id,
        type: a.type,
        timeSlot: { start: a.slotId?.startTime || '', end: a.slotId?.endTime || '' },
        symptoms: a.symptoms || '',
        status: a.status === 'confirmed' ? 'waiting' : a.status === 'completed' ? 'completed' : 'waiting',
        tokenNumber: idx + 1,
        estimatedWaitMinutes: idx * 15,
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 300));
    return { success: true, data: { queueId }, message: `Patient ${action} successful` };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    const slots = generateDummySlots(clinicId, date, duration, maxPatients).map(timeSlotSerializer);
    return { success: true, data: { slots, clinics: dummyManageSlotsClinics }, message: 'Slots loaded' };
  }
  const [slotsRes, clinicsRes] = await Promise.all([
    healthcareApiRequest<any>(`/slots/my-slots?date=${encodeURIComponent(date)}`),
    healthcareApiRequest<any>('/doctors/me/clinics'),
  ]);
  const slots = (slotsRes.success ? slotsRes.data || [] : []).map(timeSlotSerializer);
  const clinics = clinicsRes.success ? clinicsRes.data?.clinics || clinicsRes.data || [] : [];
  return { success: true, data: { slots, clinics }, message: 'Slots loaded' };
}

export async function saveSlotsApi(slots: TimeSlot[]): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, data: { success: true }, message: 'Slots saved' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      success: true,
      data: {
        weeklySchedule: dummyWeeklySchedule.map(dayScheduleSerializer),
        vacationDates: dummyVacationDates.map(vacationDateSerializer),
        instantBooking: true,
        videoConsultation: true,
      },
      message: 'Settings loaded',
    };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, data: { success: true }, message: 'Settings saved' };
  }
  const weeklyAvailability = (settings.weeklySchedule || []).map((d: any) => ({
    day: d.day,
    isWorking: d.isWorking,
    online: {
      enabled: !!d.online?.enabled,
      ranges: d.online?.enabled ? [{ startTime: d.online.startTime, endTime: d.online.endTime }] : [],
    },
    onsite: {
      enabled: !!d.onsite?.enabled,
      clinicId: d.onsite?.clinicId || null,
      ranges: d.onsite?.enabled ? [{ startTime: d.onsite.startTime, endTime: d.onsite.endTime }] : [],
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      success: true,
      data: { patient: notePatientSerializer(dummyNotePatient), notes: dummyMedicalNotes.map(medicalNoteSerializer) },
      message: 'Notes loaded',
    };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    const saved: MedicalNote = {
      ...note,
      noteId: note.noteId || `note-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      createdAt: note.createdAt || new Date().toISOString(),
    };
    return { success: true, data: medicalNoteSerializer(saved), message: 'Note saved' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    return { success: true, data: { noteId }, message: 'Note deleted' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, data: { success: true }, message: 'Prescription saved' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: prescriptionDetailSerializer(dummyPrescriptionDetail), message: 'Prescription loaded' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: dummyHealthRecords.map(medicalRecordSerializer), message: 'Records loaded' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true, data: { recordId }, message: 'Record deleted' };
  }
  const res = await healthcareApiRequest<any>(`/health-records/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
  return { success: res.success, data: { recordId }, message: res.message };
}

// ═══════════════════════════════════════════
//  PATIENT HISTORY (provider side) — no dedicated endpoint, degrade gracefully
// ═══════════════════════════════════════════

export async function fetchPatientHistoryApi(
  patientId: string
): Promise<ApiResponse<PatientRecord>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: patientRecordSerializer(dummyPatientRecord), message: 'Patient history loaded' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: doctorProfileDataSerializer(dummyDoctorProfile), message: 'Profile loaded' };
  }
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
      currency: 'PKR',
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    const updated = { ...dummyDoctorProfile, ...updates };
    return { success: true, data: doctorProfileDataSerializer(updated), message: 'Profile updated' };
  }
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));
    const normalizedCode = code.toUpperCase().trim();
    const coupon = dummyCoupons[normalizedCode];
    if (coupon) return { success: true, data: couponSerializer(coupon), message: coupon.message };
  }
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
