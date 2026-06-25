// ============================================
// Doctor Domain - Network API Functions
// ============================================

import type { Doctor, Specialty, DoctorReview, Appointment } from '../../models/healthcare/types';
import type { ApiResponse, Pagination } from '../../models/serviceProviders/common';
import type { FetchDoctorsParams, FetchDoctorReviewsParams } from '../../models/healthcare/doctorModel';
import { USE_HEALTHCARE_DUMMY_DATA, healthcareApiRequest } from './config';
import { dummySpecialties, dummyDoctors, dummyReviews, dummyAppointments } from './dummyData';
import {
  doctorSerializer,
  specialtySerializer,
  reviewSerializer,
  appointmentSerializer,
  normalizePagination,
} from '../../serializers/healthcare/healthcareSerializer';

// ── Fetch Specialties ───────────────────────

export async function fetchSpecialtiesApi(): Promise<ApiResponse<Specialty[]>> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      success: true,
      data: dummySpecialties.map(specialtySerializer),
      message: 'Specialties fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    let filtered = [...dummyDoctors];

    if (params.specialtyId) {
      filtered = filtered.filter((d) => d.specialtyId === params.specialtyId);
    }
    if (params.city) {
      filtered = filtered.filter((d) =>
        d.clinics.some((c) => c.city.toLowerCase() === params.city!.toLowerCase())
      );
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.bio.toLowerCase().includes(q) ||
          d.qualifications.some((qual) => qual.toLowerCase().includes(q)) ||
          d.subspecialties.some((sub) => sub.toLowerCase().includes(q))
      );
    }
    if (params.availableOnly) {
      filtered = filtered.filter((d) => d.isAvailable);
    }

    // Sort
    if (params.sort) {
      switch (params.sort) {
        case 'rating':
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        case 'experience':
          filtered.sort((a, b) => b.experience - a.experience);
          break;
        case 'fee-low':
          filtered.sort((a, b) => a.consultationFee - b.consultationFee);
          break;
        case 'fee-high':
          filtered.sort((a, b) => b.consultationFee - a.consultationFee);
          break;
      }
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      success: true,
      data: {
        doctors: paginated.map(doctorSerializer),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filtered.length / limit),
          totalItems: filtered.length,
          itemsPerPage: limit,
          hasNext: start + limit < filtered.length,
          hasPrevious: page > 1,
        },
      },
      message: 'Doctors fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const doctor = dummyDoctors.find((d) => d.doctorId === doctorId);
    if (!doctor) {
      return { success: false, data: null as any, message: 'Doctor not found' };
    }

    return {
      success: true,
      data: doctorSerializer(doctor),
      message: 'Doctor fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const filtered = dummyReviews.filter((r) => r.doctorId === params.doctorId);
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      success: true,
      data: {
        reviews: paginated.map(reviewSerializer),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filtered.length / limit),
          totalItems: filtered.length,
          itemsPerPage: limit,
          hasNext: start + limit < filtered.length,
          hasPrevious: page > 1,
        },
      },
      message: 'Reviews fetched successfully',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const q = query.toLowerCase();
    const results = dummyDoctors.filter(
      (d) =>
        d.bio.toLowerCase().includes(q) ||
        d.qualifications.some((qual) => qual.toLowerCase().includes(q)) ||
        d.subspecialties.some((sub) => sub.toLowerCase().includes(q)) ||
        d.languages.some((lang) => lang.toLowerCase().includes(q))
    );

    return {
      success: true,
      data: results.map(doctorSerializer),
      message: 'Search completed',
    };
  }

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
  if (USE_HEALTHCARE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const upcoming = dummyAppointments
      .filter((a) => a.status === 'confirmed' || a.status === 'pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      success: true,
      data: upcoming.length > 0 ? upcoming[0] : null,
      message: 'Next appointment fetched',
    };
  }

  // No dedicated endpoint — use the patient's upcoming appointments list.
  const res = await healthcareApiRequest<any>('/appointments?status=upcoming&page=1&limit=1');
  if (res.success) {
    const list = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);
    const next = list.length > 0 ? appointmentSerializer(list[0]) : null;
    return { ...res, data: next };
  }
  return res as ApiResponse<Appointment | null>;
}
