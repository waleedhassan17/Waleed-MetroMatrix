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
import { USE_HEALTHCARE_DUMMY_DATA, healthcareApiRequest } from './config';
import { dummyAppointments, dummyTimeSlots, dummyMedicalRecords } from './dummyData';
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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    let filtered = dummyTimeSlots.filter(
      (s) => s.doctorId === params.doctorId && s.date === params.date
    );
    if (params.clinicId) {
      filtered = filtered.filter((s) => s.clinicId === params.clinicId);
    }

    return {
      success: true,
      data: filtered.map(timeSlotSerializer),
      message: 'Time slots fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newAppointment: Appointment = {
      appointmentId: `apt-${Date.now()}`,
      patientId: 'patient-1',
      doctorId: data.doctorId,
      clinicId: data.clinicId,
      type: data.type,
      date: data.date,
      timeSlot: data.timeSlot,
      status: 'pending',
      symptoms: data.symptoms,
      payment: {
        paymentId: `pay-${Date.now()}`,
        amount: 0,
        method: 'cash',
        status: 'pending',
      },
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: appointmentSerializer(newAppointment),
      message: 'Appointment booked successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    let filtered = dummyAppointments.filter((a) => a.patientId === params.patientId);
    if (params.status) {
      filtered = filtered.filter((a) => a.status === params.status);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      success: true,
      data: {
        appointments: paginated.map(appointmentSerializer),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filtered.length / limit),
          totalItems: filtered.length,
          itemsPerPage: limit,
          hasNext: start + limit < filtered.length,
          hasPrevious: page > 1,
        },
      },
      message: 'Appointments fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const appointment = dummyAppointments.find(
      (a) => a.appointmentId === appointmentId
    );
    if (!appointment) {
      return { success: false, data: null as any, message: 'Appointment not found' };
    }

    return {
      success: true,
      data: appointmentSerializer(appointment),
      message: 'Appointment fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, data: { success: true }, message: 'Appointment cancelled' };
  }

  return healthcareApiRequest(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
    method: 'PATCH',
    data: { reason: reason || 'Cancelled by patient' },
  });
}

// ── Reschedule Appointment ──────────────────

export async function rescheduleAppointmentApi(
  data: RescheduleAppointmentRequest
): Promise<ApiResponse<Appointment>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const existing = dummyAppointments.find(
      (a) => a.appointmentId === data.appointmentId
    );
    if (!existing) {
      return { success: false, data: null as any, message: 'Appointment not found' };
    }

    const rescheduled: Appointment = {
      ...existing,
      date: data.date,
      timeSlot: data.timeSlot,
      status: 'pending',
    };

    return {
      success: true,
      data: appointmentSerializer(rescheduled),
      message: 'Appointment rescheduled successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const appointment = dummyAppointments.find(
      (a) => a.prescription?.prescriptionId === prescriptionId
    );
    if (!appointment?.prescription) {
      return { success: false, data: null as any, message: 'Prescription not found' };
    }

    return {
      success: true,
      data: prescriptionSerializer(appointment.prescription),
      message: 'Prescription fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const records = dummyMedicalRecords.filter((r) => r.patientId === patientId);

    return {
      success: true,
      data: records.map(medicalRecordSerializer),
      message: 'Medical records fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const newRecord: MedicalRecord = {
      recordId: `rec-${Date.now()}`,
      patientId: data.patientId,
      type: data.type,
      title: data.title,
      description: data.description,
      fileUrl: data.fileUrl,
      uploadedAt: new Date().toISOString(),
      linkedAppointmentId: data.linkedAppointmentId,
    };

    return {
      success: true,
      data: medicalRecordSerializer(newRecord),
      message: 'Medical record uploaded successfully',
    };
  }

  return healthcareApiRequest<MedicalRecord>('/medical-records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Start Video Call ────────────────────────

export async function startVideoCallApi(
  appointmentId: string
): Promise<ApiResponse<VideoCall>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const videoCall: VideoCall = {
      callId: `call-${Date.now()}`,
      appointmentId,
      roomId: `room-${Date.now()}`,
      status: 'connecting',
      startedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: videoCallSerializer(videoCall),
      message: 'Video call started',
    };
  }

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
