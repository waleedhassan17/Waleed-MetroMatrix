// ============================================
// Appointment Domain - Network API Functions
// ============================================

import type {
  Appointment,
  TimeSlot,
  Prescription,
  MedicalRecord,
  VideoCall,
} from '../../models/healthcare/types';
import type { ApiResponse, Pagination } from '../../models/serviceProviders/common';
import type {
  BookAppointmentRequest,
  RescheduleAppointmentRequest,
  FetchTimeSlotsParams,
  FetchAppointmentsParams,
  UploadMedicalRecordRequest,
} from '../../models/healthcare/appointmentModel';
import { healthcareApiRequest } from './config';
import {
  appointmentSerializer,
  timeSlotSerializer,
  prescriptionSerializer,
  medicalRecordSerializer,
  videoCallSerializer,
  normalizePagination,
} from '../../serializers/healthcare/healthcareSerializer';

// ── Fetch Time Slots ────────────────────────

export async function fetchTimeSlotsApi(
  params: FetchTimeSlotsParams
): Promise<ApiResponse<TimeSlot[]>> {

  const queryParams = new URLSearchParams({
    date: params.date,
    ...(params.clinicId && { clinicId: params.clinicId }),
  });

  const res = await healthcareApiRequest<any>(
    `/doctors/${encodeURIComponent(params.doctorId)}/slots?${queryParams}`
  );
  if (res.success) {
    // Backend groups slots by time-of-day { morning, afternoon, evening }.
    const g = res.data || {};
    const flat = Array.isArray(g)
      ? g
      : [...(g.morning?.slots || []), ...(g.afternoon?.slots || []), ...(g.evening?.slots || [])];
    // Each grouped slot carries the date implicitly (the query date).
    const withDate = flat.map((s: any) => ({ date: params.date, ...s }));
    return { ...res, data: withDate.map(timeSlotSerializer) };
  }
  return res as ApiResponse<TimeSlot[]>;
}

// ── Book Appointment ────────────────────────

export async function bookAppointmentApi(
  data: BookAppointmentRequest
): Promise<ApiResponse<Appointment>> {

  // Transform the app's booking request into the backend contract.
  const payload: any = {
    slotId: (data as any).slotId,
    doctorId: data.doctorId,
    clinicId: data.clinicId,
    type: data.type,
    symptoms: data.symptoms,
    couponCode: (data as any).couponCode,
    patientInfo: data.patientDetails
      ? {
          name: data.patientDetails.name,
          phone: data.patientDetails.phone,
          age: (data.patientDetails as any).age,
          gender: (data.patientDetails as any).gender,
          relationship: data.patientDetails.relation || 'self',
        }
      : undefined,
  };

  const res = await healthcareApiRequest<any>('/appointments', {
    method: 'POST',
    data: payload,
  });
  if (res.success) {
    return { ...res, data: appointmentSerializer(res.data) };
  }
  return res as ApiResponse<Appointment>;
}

// ── Fetch Appointments ──────────────────────

export async function fetchAppointmentsApi(
  params: FetchAppointmentsParams
): Promise<ApiResponse<{ appointments: Appointment[]; pagination: Pagination }>> {

  // Backend infers the patient from the auth token; map status to its buckets.
  const statusMap: Record<string, string> = {
    pending: 'upcoming',
    confirmed: 'upcoming',
    completed: 'past',
    cancelled: 'cancelled',
  };
  const qp = new URLSearchParams({
    ...(params.status && { status: statusMap[params.status] || params.status }),
    page: String(params.page || 1),
    limit: String(params.limit || 10),
  });

  const res = await healthcareApiRequest<any>(`/appointments?${qp}`);
  if (res.success) {
    const list = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);
    return {
      ...res,
      data: {
        appointments: list.map(appointmentSerializer),
        pagination: normalizePagination(res.data?.pagination),
      },
    };
  }
  return res as ApiResponse<{ appointments: Appointment[]; pagination: Pagination }>;
}

// ── Fetch Appointment by ID ─────────────────

export async function fetchAppointmentByIdApi(
  appointmentId: string
): Promise<ApiResponse<Appointment>> {

  const res = await healthcareApiRequest<Appointment>(
    `/appointments/${encodeURIComponent(appointmentId)}`
  );
  if (res.success) {
    return { ...res, data: appointmentSerializer(res.data) };
  }
  return res;
}

// ── Cancel Appointment ──────────────────────

export async function cancelAppointmentApi(
  appointmentId: string,
  reason?: string
): Promise<ApiResponse<{ success: boolean }>> {

  return healthcareApiRequest(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
    method: 'PATCH',
    data: { reason: reason || 'Cancelled by patient' },
  });
}

// ── Reschedule Appointment ──────────────────

export async function rescheduleAppointmentApi(
  data: RescheduleAppointmentRequest
): Promise<ApiResponse<Appointment>> {

  const res = await healthcareApiRequest<any>(
    `/appointments/${encodeURIComponent(data.appointmentId)}/reschedule`,
    {
      method: 'PATCH',
      data: { newSlotId: (data as any).newSlotId },
    }
  );
  if (res.success) {
    return { ...res, data: appointmentSerializer(res.data) };
  }
  return res as ApiResponse<Appointment>;
}

// ── Fetch Prescription ──────────────────────

export async function fetchPrescriptionApi(
  prescriptionId: string
): Promise<ApiResponse<Prescription>> {

  // Backend exposes the patient's prescriptions list; find the requested one.
  const res = await healthcareApiRequest<any>('/prescriptions/my');
  if (res.success) {
    const list = res.data?.prescriptions || (Array.isArray(res.data) ? res.data : []);
    const found = list.find(
      (p: any) => (p.id || p._id || p.prescriptionId) === prescriptionId
    );
    if (!found) {
      return { success: false, data: null as any, message: 'Prescription not found' };
    }
    return { ...res, data: prescriptionSerializer(found) };
  }
  return res as ApiResponse<Prescription>;
}

// ── Fetch Medical Records ───────────────────

export async function fetchMedicalRecordsApi(
  patientId: string
): Promise<ApiResponse<MedicalRecord[]>> {

  // Backend infers the patient from the auth token.
  const res = await healthcareApiRequest<any>('/health-records');
  if (res.success) {
    const list = Array.isArray(res.data) ? res.data : res.data?.records || res.data?.healthRecords || [];
    return { ...res, data: list.map(medicalRecordSerializer) };
  }
  return res as ApiResponse<MedicalRecord[]>;
}

// ── Upload Medical Record ───────────────────

export async function uploadMedicalRecordApi(
  data: UploadMedicalRecordRequest
): Promise<ApiResponse<MedicalRecord>> {

  return healthcareApiRequest<MedicalRecord>('/medical-records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Start Video Call ────────────────────────

export async function startVideoCallApi(
  appointmentId: string
): Promise<ApiResponse<VideoCall>> {

  // H6 BUILD: join/create the call room. Backend returns provider 'jitsi'
  // with a roomUrl the screen renders in a WebView (TELEMEDICINE_DECISION.md).
  const res = await healthcareApiRequest<any>(
    `/video-calls/join/${encodeURIComponent(appointmentId)}`,
    { method: 'POST' }
  );
  if (res.success && res.data) {
    const d: any = res.data;
    return {
      success: true,
      data: {
        callId: String(d.callId),
        appointmentId,
        roomId: d.roomId || d.roomName || '',
        status: (d.status as VideoCall['status']) || 'active',
        roomUrl: d.roomUrl,
        provider: d.provider,
      },
      message: 'Video call ready',
    };
  }
  return res as ApiResponse<VideoCall>;
}

// ── H2/H5/H6 additions: payment, prescriptions list, symptom checker ──

export interface AppointmentPaymentState {
  appointmentId: string;
  status: 'unpaid' | 'paid' | 'refunded';
  method: 'wallet' | 'cash_at_clinic' | null;
  amount: number;
  fee: number;
  discount: number;
  paidAt?: string;
  refundedAt?: string;
  refundAmount: number;
  doctorName: string;
  clinicName: string;
  appointmentStatus: string;
}

export async function payAppointmentApi(
  appointmentId: string,
  method: 'wallet' | 'cash_at_clinic'
): Promise<ApiResponse<any>> {
  return healthcareApiRequest<any>(
    `/appointments/${encodeURIComponent(appointmentId)}/pay`,
    { method: 'POST', data: { method } }
  );
}

export async function fetchAppointmentPaymentApi(
  appointmentId: string
): Promise<ApiResponse<AppointmentPaymentState>> {
  return healthcareApiRequest<AppointmentPaymentState>(
    `/appointments/${encodeURIComponent(appointmentId)}/payment`
  );
}

export async function fetchMyPrescriptionsApi(): Promise<ApiResponse<Prescription[]>> {
  const res = await healthcareApiRequest<any>('/prescriptions/my');
  if (res.success) {
    const list = res.data?.prescriptions || (Array.isArray(res.data) ? res.data : []);
    return { ...res, data: list.map(prescriptionSerializer) };
  }
  return res as ApiResponse<Prescription[]>;
}

export interface SymptomCheckResult {
  disclaimer: string;
  conditions: { condition: string; confidence: number; matchedSymptoms?: string[] }[];
  recommendedSpecialty: { specialtyId: string | null; name: string };
  source: 'llm' | 'rules';
}

export async function checkSymptomsApi(
  symptoms: string
): Promise<ApiResponse<SymptomCheckResult>> {
  return healthcareApiRequest<SymptomCheckResult>('/symptom-checker', {
    method: 'POST',
    data: { symptoms },
  });
}
