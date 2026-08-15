// ============================================
// Doctor Domain - Network API Functions
// ============================================

import type { Doctor, Specialty, DoctorReview, Appointment } from '../../models/healthcare/types';
import type { ApiResponse, Pagination } from '../../models/serviceProviders/common';
import type { FetchDoctorsParams, FetchDoctorReviewsParams } from '../../models/healthcare/doctorModel';
import { healthcareApiRequest } from './config';
import {
  doctorSerializer,
  specialtySerializer,
  reviewSerializer,
  appointmentSerializer,
  normalizePagination,
} from '../../serializers/healthcare/healthcareSerializer';

// ── Fetch Specialties ───────────────────────

export async function fetchSpecialtiesApi(): Promise<ApiResponse<Specialty[]>> {

  const res = await healthcareApiRequest<any>('/specialties');
  if (res.success) {
    const list = Array.isArray(res.data) ? res.data : res.data?.specialties || [];
    return { ...res, data: list.map(specialtySerializer) };
  }
  return res as ApiResponse<Specialty[]>;
}

// ── Fetch Doctors (with filtering & pagination) ─

export async function fetchDoctorsApi(
  params: FetchDoctorsParams = {}
): Promise<ApiResponse<{ doctors: Doctor[]; pagination: Pagination }>> {

  // Map frontend filter/sort params to the backend's expected names.
  const sortMap: Record<string, string> = {
    rating: 'rating',
    experience: 'experience',
    'fee-low': 'fee_low',
    'fee-high': 'fee_high',
  };
  const queryParams = new URLSearchParams();
  if (params.specialtyId) queryParams.set('specialtyId', params.specialtyId);
  if (params.city) queryParams.set('city', params.city);
  // `search` is part of FetchDoctorsParams and is populated by the doctor-list
  // slice, but used to be dropped here — every query produced an identical
  // request, so typing a name never changed the results.
  if (params.search) queryParams.set('search', params.search);
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.sort) queryParams.set('sortBy', sortMap[params.sort] || params.sort);
  if (params.availableOnly) queryParams.set('availability', 'this-week');

  const query = queryParams.toString();
  const res = await healthcareApiRequest<any>(`/doctors${query ? `?${query}` : ''}`);
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

// ── Fetch Doctor by ID ──────────────────────

export async function fetchDoctorByIdApi(
  doctorId: string
): Promise<ApiResponse<Doctor>> {

  const res = await healthcareApiRequest<Doctor>(
    `/doctors/${encodeURIComponent(doctorId)}`
  );
  if (res.success) {
    return { ...res, data: doctorSerializer(res.data) };
  }
  return res;
}

// ── Fetch Doctor Reviews ────────────────────

export async function fetchDoctorReviewsApi(
  params: FetchDoctorReviewsParams
): Promise<ApiResponse<{ reviews: DoctorReview[]; pagination: Pagination }>> {

  const queryParams = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 10),
  });

  const res = await healthcareApiRequest<any>(
    `/doctors/${encodeURIComponent(params.doctorId)}/reviews?${queryParams}`
  );
  if (res.success) {
    return {
      ...res,
      data: {
        reviews: (res.data?.reviews || []).map(reviewSerializer),
        pagination: normalizePagination(res.data?.pagination),
      },
    };
  }
  return res as ApiResponse<{ reviews: DoctorReview[]; pagination: Pagination }>;
}

// ── Search Doctors ──────────────────────────

export async function searchDoctorsApi(
  query: string
): Promise<ApiResponse<Doctor[]>> {

  const res = await healthcareApiRequest<any>(
    `/doctors/search?q=${encodeURIComponent(query)}`
  );
  if (res.success) {
    const list = Array.isArray(res.data) ? res.data : res.data?.doctors || [];
    return { ...res, data: list.map(doctorSerializer) };
  }
  return res as ApiResponse<Doctor[]>;
}

// ── Fetch Next Upcoming Appointment ─────────

export async function fetchNextAppointmentApi(): Promise<ApiResponse<Appointment | null>> {

  // No dedicated endpoint — use the patient's upcoming appointments list.
  const res = await healthcareApiRequest<any>('/appointments?status=upcoming&page=1&limit=1');
  if (res.success) {
    const list = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);
    const next = list.length > 0 ? appointmentSerializer(list[0]) : null;
    return { ...res, data: next };
  }
  return res as ApiResponse<Appointment | null>;
}
