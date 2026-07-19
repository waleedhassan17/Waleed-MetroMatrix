// ============================================
// Healthcare Admin - Network API Functions
// ============================================
// Admin healthcare endpoints live under /api/v1/admin/* on the backend.

import type { ApiResponse, Pagination } from '../../models/serviceProviders/common';
import type { Doctor, Specialty } from '../../models/healthcare/types';
import { healthcareAdminApiRequest } from './config';
import {
  doctorSerializer,
  specialtySerializer,
  normalizePagination,
} from '../../serializers/healthcare/healthcareSerializer';

// ── Doctors (verification) ──────────────────

export async function fetchPendingDoctorsApi(): Promise<ApiResponse<Doctor[]>> {
  const res = await healthcareAdminApiRequest<any>('/doctors/pending');
  if (res.success) {
    const list = res.data?.doctors || (Array.isArray(res.data) ? res.data : []);
    return { ...res, data: list.map(doctorSerializer) };
  }
  return res as ApiResponse<Doctor[]>;
}

export async function fetchAllDoctorsAdminApi(
  params: { status?: string; specialtyId?: string; search?: string; page?: number; limit?: number } = {}
): Promise<ApiResponse<{ doctors: Doctor[]; pagination: Pagination }>> {
  const qp = new URLSearchParams();
  if (params.status) qp.set('status', params.status);
  if (params.specialtyId) qp.set('specialtyId', params.specialtyId);
  if (params.search) qp.set('search', params.search);
  qp.set('page', String(params.page || 1));
  qp.set('limit', String(params.limit || 50));

  const res = await healthcareAdminApiRequest<any>(`/doctors?${qp}`);
  if (res.success) {
    return {
      ...res,
      data: {
        doctors: (res.data?.doctors || []).map(doctorSerializer),
        pagination: normalizePagination(res.data?.pagination),
      },
    };
  }
  return res as ApiResponse<{ doctors: Doctor[]; pagination: Pagination }>;
}

export async function approveDoctorApi(
  doctorId: string,
  notes?: string
): Promise<ApiResponse<{ doctorId: string }>> {
  const res = await healthcareAdminApiRequest<any>(`/doctors/${encodeURIComponent(doctorId)}/approve`, {
    method: 'PATCH',
    data: { notes: notes || '' },
  });
  return { success: res.success, data: { doctorId }, message: res.message };
}

export async function rejectDoctorApi(
  doctorId: string,
  reason: string,
  canReapply = true
): Promise<ApiResponse<{ doctorId: string }>> {
  const res = await healthcareAdminApiRequest<any>(`/doctors/${encodeURIComponent(doctorId)}/reject`, {
    method: 'PATCH',
    data: { reason, canReapply },
  });
  return { success: res.success, data: { doctorId }, message: res.message };
}

// ── Specialties (CRUD) ──────────────────────

export async function fetchAdminSpecialtiesApi(): Promise<ApiResponse<Specialty[]>> {
  const res = await healthcareAdminApiRequest<any>('/specialties');
  if (res.success) {
    const list = res.data?.specialties || (Array.isArray(res.data) ? res.data : []);
    return { ...res, data: list.map(specialtySerializer) };
  }
  return res as ApiResponse<Specialty[]>;
}

export async function createSpecialtyApi(data: {
  name: string;
  icon?: string;
  description?: string;
  commonConditions?: string[];
}): Promise<ApiResponse<Specialty>> {
  const res = await healthcareAdminApiRequest<any>('/specialties', { method: 'POST', data });
  if (res.success) {
    return { ...res, data: specialtySerializer(res.data?.specialty || res.data) };
  }
  return res as ApiResponse<Specialty>;
}

export async function updateSpecialtyApi(
  id: string,
  data: { name?: string; icon?: string; description?: string; commonConditions?: string[] }
): Promise<ApiResponse<Specialty>> {
  const res = await healthcareAdminApiRequest<any>(`/specialties/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    data,
  });
  if (res.success) {
    return { ...res, data: specialtySerializer(res.data?.specialty || res.data) };
  }
  return res as ApiResponse<Specialty>;
}

export async function deleteSpecialtyApi(id: string): Promise<ApiResponse<{ id: string }>> {
  const res = await healthcareAdminApiRequest<any>(`/specialties/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return { success: res.success, data: { id }, message: res.message };
}

// ── Analytics ───────────────────────────────

export async function fetchAdminStatsApi(): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>('/analytics/stats');
}

export async function fetchAppointmentAnalyticsApi(
  period: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/analytics/appointments?period=${period}`);
}

export async function fetchRevenueAnalyticsApi(
  groupBy: 'specialty' | 'doctor' = 'specialty'
): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/analytics/revenue?groupBy=${groupBy}`);
}

// ── H3/H7 additions: oversight endpoints ──

export async function fetchAdminHealthcareDashboardApi(): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>('/healthcare/dashboard');
}

export async function fetchAdminAppointmentsApi(params: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  doctorId?: string;
  patient?: string;
} = {}): Promise<ApiResponse<any[]>> {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qp.append(k, String(v));
  });
  const res = await healthcareAdminApiRequest<any>(`/appointments?${qp}`);
  if (res.success) {
    const list = Array.isArray(res.data) ? res.data : res.data?.appointments || [];
    return { ...res, data: list };
  }
  return res as ApiResponse<any[]>;
}

export async function fetchAdminAppointmentDetailApi(id: string): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/appointments/${encodeURIComponent(id)}`);
}

export async function forceAppointmentStatusApi(
  id: string,
  status: string,
  reason: string
): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/appointments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    data: { status, reason },
  });
}

export async function refundAppointmentAdminApi(id: string, reason: string): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/appointments/${encodeURIComponent(id)}/refund`, {
    method: 'POST',
    data: { reason },
  });
}

export async function fetchAdminDoctorDetailApi(doctorId: string): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/doctors/${encodeURIComponent(doctorId)}`);
}

export async function setDoctorStatusApi(
  doctorId: string,
  status: 'active' | 'suspended',
  reason: string
): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/doctors/${encodeURIComponent(doctorId)}/status`, {
    method: 'PATCH',
    data: { status, reason },
  });
}

export async function fetchAdminClinicsApi(params: { page?: number; city?: string; doctorId?: string } = {}): Promise<ApiResponse<any[]>> {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qp.append(k, String(v));
  });
  const res = await healthcareAdminApiRequest<any>(`/clinics?${qp}`);
  if (res.success) {
    const list = Array.isArray(res.data) ? res.data : res.data?.clinics || [];
    return { ...res, data: list };
  }
  return res as ApiResponse<any[]>;
}

export async function setClinicStatusApi(id: string, isActive: boolean, reason?: string): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/clinics/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    data: { isActive, reason },
  });
}

export async function fetchAdminHealthcareReviewsApi(params: { rating?: number; maxRating?: number; doctorId?: string } = {}): Promise<ApiResponse<any[]>> {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qp.append(k, String(v));
  });
  const res = await healthcareAdminApiRequest<any>(`/healthcare/reviews?${qp}`);
  if (res.success) {
    const list = Array.isArray(res.data) ? res.data : res.data?.reviews || [];
    return { ...res, data: list };
  }
  return res as ApiResponse<any[]>;
}

export async function deleteHealthcareReviewApi(id: string, reason: string): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>(`/healthcare/reviews/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    data: { reason },
  });
}

export interface HealthcareSettingsView {
  commissionPercent: number;
  cancellationWindowHours: number;
  lateCancelRefundPercent: number;
  defaultSlotDurationMinutes: number;
  maxAdvanceBookingDays: number;
  autoApproveDoctors: boolean;
}

export async function fetchHealthcareSettingsApi(): Promise<ApiResponse<HealthcareSettingsView>> {
  return healthcareAdminApiRequest<HealthcareSettingsView>('/healthcare/settings');
}

export async function updateHealthcareSettingsApi(
  patch: Partial<HealthcareSettingsView>
): Promise<ApiResponse<HealthcareSettingsView>> {
  return healthcareAdminApiRequest<HealthcareSettingsView>('/healthcare/settings', {
    method: 'PATCH',
    data: patch,
  });
}
