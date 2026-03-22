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

  const res = await healthcareApiRequest<TimeSlot[]>(
    `/doctors/${encodeURIComponent(params.doctorId)}/slots?${queryParams}`
  );
  if (res.success) {
    return { ...res, data: res.data.map(timeSlotSerializer) };
  }
  return res;
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

  const res = await healthcareApiRequest<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res.success) {
    return { ...res, data: appointmentSerializer(res.data) };
  }
  return res;
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

  const queryParams = new URLSearchParams({
    patientId: params.patientId,
    ...(params.status && { status: params.status }),
    page: String(params.page || 1),
    limit: String(params.limit || 10),
  });

  return healthcareApiRequest(`/appointments?${queryParams}`);
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
    method: 'POST',
    body: JSON.stringify({ reason }),
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

  return healthcareApiRequest<Appointment>(
    `/appointments/${encodeURIComponent(data.appointmentId)}/reschedule`,
    {
      method: 'PUT',
      body: JSON.stringify({ date: data.date, timeSlot: data.timeSlot }),
    }
  );
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

  const res = await healthcareApiRequest<Prescription>(
    `/prescriptions/${encodeURIComponent(prescriptionId)}`
  );
  if (res.success) {
    return { ...res, data: prescriptionSerializer(res.data) };
  }
  return res;
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

  const res = await healthcareApiRequest<MedicalRecord[]>(
    `/medical-records?patientId=${encodeURIComponent(patientId)}`
  );
  if (res.success) {
    return { ...res, data: res.data.map(medicalRecordSerializer) };
  }
  return res;
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

  return healthcareApiRequest<VideoCall>(
    `/appointments/${encodeURIComponent(appointmentId)}/video-call`,
    { method: 'POST' }
  );
}
