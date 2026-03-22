// ============================================
// Doctor Domain - Network API Functions
// ============================================

import type { Doctor, Specialty, DoctorReview } from '../../models/healthcare/types';
import type { ApiResponse, Pagination } from '../../models/serviceProviders/common';
import type { FetchDoctorsParams, FetchDoctorReviewsParams } from '../../models/healthcare/doctorModel';
import { USE_HEALTHCARE_DUMMY_DATA, healthcareApiRequest } from './config';
import { dummySpecialties, dummyDoctors, dummyReviews } from './dummyData';
import {
  doctorSerializer,
  specialtySerializer,
  reviewSerializer,
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

  const res = await healthcareApiRequest<Specialty[]>('/specialties');
  if (res.success) {
    return { ...res, data: res.data.map(specialtySerializer) };
  }
  return res;
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

  const queryParams = new URLSearchParams();
  if (params.specialtyId) queryParams.set('specialtyId', params.specialtyId);
  if (params.city) queryParams.set('city', params.city);
  if (params.search) queryParams.set('search', params.search);
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.sort) queryParams.set('sort', params.sort);
  if (params.availableOnly) queryParams.set('availableOnly', 'true');

  const query = queryParams.toString();
  return healthcareApiRequest(`/doctors${query ? `?${query}` : ''}`);
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

  return healthcareApiRequest(
    `/doctors/${encodeURIComponent(params.doctorId)}/reviews?${queryParams}`
  );
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

  return healthcareApiRequest<Doctor[]>(
    `/doctors/search?q=${encodeURIComponent(query)}`
  );
}
