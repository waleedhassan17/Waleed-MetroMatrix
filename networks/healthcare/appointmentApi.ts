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
} from '../../models/healthcare/appointmentModel';
import { Platform } from 'react-native';
import { healthcareApiRequest } from './config';
import { API_URL } from '../network/network';
import { retrieveData, KeyForStorage } from '../../utils/storage_utils/storageUtils';
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

/**
 * Backend contract — src/modules/healthcare/{routes,controllers,middleware}:
 *
 *   POST /api/v1/healthcare/health-records   (requireUser)
 *   multipart/form-data
 *     title    required, non-empty
 *     category required, one of HEALTH_RECORD_CATEGORIES
 *     date     optional, parsed with `new Date(date)`
 *     notes    optional
 *     files    1..5 files, JPEG/PNG/PDF, <= 10MB each (multer field name)
 *
 * The controller derives userId from the token and persists a HealthRecord
 * document with the Cloudinary URLs multer produced.
 */
export const HEALTH_RECORD_CATEGORIES = [
  'prescriptions',
  'lab_reports',
  'imaging',
  'vaccination',
] as const;

export type HealthRecordCategory = (typeof HEALTH_RECORD_CATEGORIES)[number];

export const HEALTH_RECORD_MAX_FILES = 5;
export const HEALTH_RECORD_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const HEALTH_RECORD_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export interface HealthRecordFileInput {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface UploadHealthRecordRequest {
  title: string;
  category: HealthRecordCategory;
  date?: string;
  notes?: string;
  files: HealthRecordFileInput[];
}

const fail = (message: string): ApiResponse<MedicalRecord> => ({
  success: false,
  data: null as any,
  message,
});

export async function uploadMedicalRecordApi(
  input: UploadHealthRecordRequest
): Promise<ApiResponse<MedicalRecord>> {
  // Validate locally so the user gets a precise message instead of a 400 that
  // has already burned an upload of several megabytes.
  if (!input.title?.trim()) return fail('Please enter a title.');
  if (!HEALTH_RECORD_CATEGORIES.includes(input.category)) {
    return fail('Please choose a record type.');
  }
  if (!input.files?.length) return fail('Please add at least one file.');
  if (input.files.length > HEALTH_RECORD_MAX_FILES) {
    return fail(`You can attach at most ${HEALTH_RECORD_MAX_FILES} files to a record.`);
  }

  for (const file of input.files) {
    if (!HEALTH_RECORD_ALLOWED_MIME.includes(file.mimeType as any)) {
      return fail(`"${file.name}" is not supported. Only JPG, PNG and PDF files can be uploaded.`);
    }
    if (file.size && file.size > HEALTH_RECORD_MAX_FILE_BYTES) {
      return fail(`"${file.name}" is larger than 10MB.`);
    }
  }

  try {
    const token = await retrieveData(KeyForStorage.accessToken);
    if (!token) return fail('Your session expired. Please sign in again.');

    const form = new FormData();
    form.append('title', input.title.trim());
    form.append('category', input.category);
    if (input.date) form.append('date', input.date);
    form.append('notes', input.notes ?? '');

    input.files.forEach((file) => {
      form.append('files', {
        // iOS rejects the file:// prefix here; Android requires it.
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name,
        type: file.mimeType,
      } as any);
    });

    // Raw fetch, not the axios instance, so React Native sets the multipart
    // boundary itself — same approach as uploadProfilePhoto.
    const response = await fetch(`${API_URL}/v1/healthcare/health-records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const body = await response.json().catch(() => ({} as any));

    if (!response.ok || body?.success === false) {
      return fail(
        body?.error || body?.message || `Upload failed (${response.status}).`
      );
    }

    return {
      success: true,
      data: medicalRecordSerializer(body?.data ?? body),
      message: body?.message || 'Health record uploaded',
    };
  } catch (error: any) {
    return fail(error?.message || 'Upload failed. Please check your connection and try again.');
  }
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
