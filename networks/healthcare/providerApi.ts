// ============================================
// Provider Domain - API Functions
// ============================================
//
// Architecture: Screen → Slice → Network (this file) → API Server → Network → Model + Serializer → Slice → Screen
// All functions use USE_HEALTHCARE_DUMMY_DATA flag.
// To switch to real API: set flag to false and ensure endpoints are correct.

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

// ═══════════════════════════════════════════
//  DOCTOR DASHBOARD
// ═══════════════════════════════════════════

export async function fetchDoctorDashboardApi(): Promise<ApiResponse<DoctorDashboardData>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));
    return { success: true, data: dashboardDataSerializer(dummyDashboardData), message: 'Dashboard loaded' };
  }
  const res = await healthcareApiRequest<DoctorDashboardData>('/doctor/dashboard');
  if (res.success) return { ...res, data: dashboardDataSerializer(res.data) };
  return res;
}

// ═══════════════════════════════════════════
//  DOCTOR SCHEDULE
// ═══════════════════════════════════════════

export async function fetchDoctorScheduleApi(): Promise<ApiResponse<Appointment[]>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: generateDummyScheduleAppointments().map(appointmentSerializer), message: 'Schedule loaded' };
  }
  const res = await healthcareApiRequest<Appointment[]>('/doctor/schedule');
  if (res.success) return { ...res, data: res.data.map(appointmentSerializer) };
  return res;
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
  const res = await healthcareApiRequest<{ total: number; chart: ChartDataPoint[]; breakdown: ConsultationBreakdown[] }>(
    `/doctor/earnings?period=${encodeURIComponent(period)}`
  );
  if (res.success) {
    return {
      ...res,
      data: {
        total: res.data.total,
        chart: res.data.chart.map(chartDataPointSerializer),
        breakdown: res.data.breakdown.map(consultationBreakdownSerializer),
      },
    };
  }
  return res;
}

export async function fetchDoctorTransactionsApi(): Promise<ApiResponse<EarningTransaction[]>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true, data: dummyEarningTransactions.map(earningTransactionSerializer), message: 'Transactions loaded' };
  }
  const res = await healthcareApiRequest<EarningTransaction[]>('/doctor/transactions');
  if (res.success) return { ...res, data: res.data.map(earningTransactionSerializer) };
  return res;
}

// ═══════════════════════════════════════════
//  PATIENT QUEUE
// ═══════════════════════════════════════════

export async function fetchPatientQueueApi(): Promise<ApiResponse<QueuePatient[]>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: generateDummyQueue().map(queuePatientSerializer), message: 'Queue loaded' };
  }
  const res = await healthcareApiRequest<QueuePatient[]>('/doctor/queue');
  if (res.success) return { ...res, data: res.data.map(queuePatientSerializer) };
  return res;
}

export async function updateQueuePatientApi(
  queueId: string,
  action: 'start' | 'complete' | 'skip' | 'call-next'
): Promise<ApiResponse<{ queueId: string }>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 300));
    return { success: true, data: { queueId }, message: `Patient ${action} successful` };
  }
  return healthcareApiRequest(`/doctor/queue/${encodeURIComponent(queueId)}/${action}`, { method: 'POST' });
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
  const params = new URLSearchParams({ clinicId, date, duration: String(duration), maxPatients: String(maxPatients) });
  const res = await healthcareApiRequest<{ slots: TimeSlot[]; clinics: Clinic[] }>(`/doctor/slots?${params}`);
  if (res.success) return { ...res, data: { slots: res.data.slots.map(timeSlotSerializer), clinics: res.data.clinics } };
  return res;
}

export async function saveSlotsApi(
  slots: TimeSlot[]
): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, data: { success: true }, message: 'Slots saved' };
  }
  return healthcareApiRequest('/doctor/slots', { method: 'PUT', body: JSON.stringify({ slots }) });
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
  return healthcareApiRequest('/doctor/availability');
}

export async function saveAvailabilitySettingsApi(
  settings: { weeklySchedule: DaySchedule[]; vacationDates: VacationDate[]; instantBooking: boolean; videoConsultation: boolean }
): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, data: { success: true }, message: 'Settings saved' };
  }
  return healthcareApiRequest('/doctor/availability', { method: 'PUT', body: JSON.stringify(settings) });
}

// ═══════════════════════════════════════════
//  MEDICAL NOTES
// ═══════════════════════════════════════════

export async function fetchPatientNotesApi(
  patientId: string
): Promise<ApiResponse<{ patient: NotePatient; notes: MedicalNote[] }>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      success: true,
      data: {
        patient: notePatientSerializer(dummyNotePatient),
        notes: dummyMedicalNotes.map(medicalNoteSerializer),
      },
      message: 'Notes loaded',
    };
  }
  const res = await healthcareApiRequest<{ patient: NotePatient; notes: MedicalNote[] }>(
    `/doctor/patients/${encodeURIComponent(patientId)}/notes`
  );
  if (res.success) {
    return {
      ...res,
      data: {
        patient: notePatientSerializer(res.data.patient),
        notes: res.data.notes.map(medicalNoteSerializer),
      },
    };
  }
  return res;
}

export async function saveNoteApi(note: MedicalNote): Promise<ApiResponse<MedicalNote>> {
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
  const res = await healthcareApiRequest<MedicalNote>('/doctor/notes', { method: 'POST', body: JSON.stringify(note) });
  if (res.success) return { ...res, data: medicalNoteSerializer(res.data) };
  return res;
}

export async function deleteNoteApi(noteId: string): Promise<ApiResponse<{ noteId: string }>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true, data: { noteId }, message: 'Note deleted' };
  }
  return healthcareApiRequest(`/doctor/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
}

export async function attachFileApi(
  noteId: string,
  attachment: NoteAttachment
): Promise<ApiResponse<NoteAttachment>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 300));
    return { success: true, data: attachment, message: 'File attached' };
  }
  return healthcareApiRequest(`/doctor/notes/${encodeURIComponent(noteId)}/attachments`, {
    method: 'POST',
    body: JSON.stringify(attachment),
  });
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
  return healthcareApiRequest('/doctor/prescriptions', { method: 'POST', body: JSON.stringify(prescription) });
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
  const res = await healthcareApiRequest<PrescriptionDetail>(
    `/prescriptions/${encodeURIComponent(prescriptionId)}/detail`
  );
  if (res.success) return { ...res, data: prescriptionDetailSerializer(res.data) };
  return res;
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
  const res = await healthcareApiRequest<MedicalRecord[]>(
    `/medical-records?patientId=${encodeURIComponent(patientId)}`
  );
  if (res.success) return { ...res, data: res.data.map(medicalRecordSerializer) };
  return res;
}

export async function deleteHealthRecordApi(
  recordId: string
): Promise<ApiResponse<{ recordId: string }>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true, data: { recordId }, message: 'Record deleted' };
  }
  return healthcareApiRequest(`/medical-records/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
}

// ═══════════════════════════════════════════
//  PATIENT HISTORY (provider side)
// ═══════════════════════════════════════════

export async function fetchPatientHistoryApi(
  patientId: string
): Promise<ApiResponse<PatientRecord>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: patientRecordSerializer(dummyPatientRecord), message: 'Patient history loaded' };
  }
  const res = await healthcareApiRequest<PatientRecord>(
    `/doctor/patients/${encodeURIComponent(patientId)}/history`
  );
  if (res.success) return { ...res, data: patientRecordSerializer(res.data) };
  return res;
}

// ═══════════════════════════════════════════
//  DOCTOR PROFILE
// ═══════════════════════════════════════════

export async function fetchDoctorProviderProfileApi(): Promise<ApiResponse<DoctorProfileData>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, data: doctorProfileDataSerializer(dummyDoctorProfile), message: 'Profile loaded' };
  }
  const res = await healthcareApiRequest<DoctorProfileData>('/doctor/profile');
  if (res.success) return { ...res, data: doctorProfileDataSerializer(res.data) };
  return res;
}

export async function updateDoctorProviderProfileApi(
  updates: Partial<DoctorProfileData>
): Promise<ApiResponse<DoctorProfileData>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    const updated = { ...dummyDoctorProfile, ...updates };
    return { success: true, data: doctorProfileDataSerializer(updated), message: 'Profile updated' };
  }
  const res = await healthcareApiRequest<DoctorProfileData>('/doctor/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (res.success) return { ...res, data: doctorProfileDataSerializer(res.data) };
  return res;
}

// ═══════════════════════════════════════════
//  COUPON VALIDATION
// ═══════════════════════════════════════════

export async function applyCouponApi(
  code: string
): Promise<ApiResponse<Coupon>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));
    const normalizedCode = code.toUpperCase().trim();
    const coupon = dummyCoupons[normalizedCode];
    if (coupon) {
      return { success: true, data: couponSerializer(coupon), message: coupon.message };
    }
    return {
      success: false,
      data: { code: normalizedCode, discountPercent: 0, maxDiscount: 0, isValid: false, message: 'Invalid coupon code' } as Coupon,
      message: 'Invalid coupon code',
    };
  }
  return healthcareApiRequest<Coupon>(`/coupons/validate`, { method: 'POST', body: JSON.stringify({ code }) });
}

// ═══════════════════════════════════════════
//  PAYMENT PROCESSING
// ═══════════════════════════════════════════

export async function processPaymentApi(payment: {
  appointmentId: string;
  amount: number;
  method: 'cash' | 'card' | 'online' | 'insurance';
}): Promise<ApiResponse<{ paymentId: string; status: string }>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 800));
    return {
      success: true,
      data: { paymentId: `pay-${Date.now()}`, status: 'completed' },
      message: 'Payment processed successfully',
    };
  }
  return healthcareApiRequest('/payments/process', { method: 'POST', body: JSON.stringify(payment) });
}
