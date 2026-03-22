// ============================================
// Doctor Domain - Zod Validation Schemas
// ============================================

import { z } from 'zod';

// ── Clinic Timing Schema ────────────────────

export const ClinicTimingSchema = z.object({
  day: z.string(),
  openTime: z.string(),
  closeTime: z.string(),
  isOpen: z.boolean(),
});

// ── Clinic Schema ───────────────────────────

export const ClinicSchema = z.object({
  clinicId: z.string(),
  doctorId: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  phone: z.string(),
  timings: z.array(ClinicTimingSchema),
  images: z.array(z.string()),
  amenities: z.array(z.string()),
});

// ── Specialty Schema ────────────────────────

export const SpecialtySchema = z.object({
  specialtyId: z.string(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  doctorCount: z.number(),
  commonConditions: z.array(z.string()),
  parentSpecialtyId: z.string().optional(),
  isActive: z.boolean(),
});

// ── Doctor Schema ───────────────────────────

export const DoctorSchema = z.object({
  doctorId: z.string(),
  userId: z.string(),
  pmcNumber: z.string(),
  specialtyId: z.string(),
  subspecialties: z.array(z.string()),
  qualifications: z.array(z.string()),
  experience: z.number(),
  bio: z.string(),
  profileImage: z.string(),
  clinics: z.array(ClinicSchema),
  consultationFee: z.number(),
  videoConsultationFee: z.number(),
  rating: z.number(),
  totalReviews: z.number(),
  totalPatients: z.number(),
  isAvailable: z.boolean(),
  isVerified: z.boolean(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']),
  languages: z.array(z.string()),
  awards: z.array(z.string()),
  publications: z.array(z.string()),
  availableSlots: z.array(z.object({ dateTime: z.string() })).optional(),
  createdAt: z.string(),
});

// ── Doctor Review Schemas ───────────────────

export const DoctorReviewResponseSchema = z.object({
  text: z.string(),
  respondedAt: z.string(),
});

export const DoctorReviewSchema = z.object({
  reviewId: z.string(),
  doctorId: z.string(),
  patientId: z.string(),
  appointmentId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  isAnonymous: z.boolean(),
  tags: z.array(z.string()).optional(),
  helpfulCount: z.number().optional(),
  createdAt: z.string(),
  response: DoctorReviewResponseSchema.optional(),
});

// ── API Request Schemas ─────────────────────

export const FetchDoctorsParamsSchema = z.object({
  specialtyId: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: z.enum(['rating', 'experience', 'fee-low', 'fee-high']).optional(),
  availableOnly: z.boolean().optional(),
});

export const FetchDoctorReviewsParamsSchema = z.object({
  doctorId: z.string(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

// ── List Schemas ────────────────────────────

export const DoctorListSchema = z.array(DoctorSchema);
export const SpecialtyListSchema = z.array(SpecialtySchema);
export const DoctorReviewListSchema = z.array(DoctorReviewSchema);

// ── Type Exports (inferred from schemas) ────

export type DoctorZ = z.infer<typeof DoctorSchema>;
export type SpecialtyZ = z.infer<typeof SpecialtySchema>;
export type ClinicZ = z.infer<typeof ClinicSchema>;
export type ClinicTimingZ = z.infer<typeof ClinicTimingSchema>;
export type DoctorReviewZ = z.infer<typeof DoctorReviewSchema>;
export type DoctorReviewResponseZ = z.infer<typeof DoctorReviewResponseSchema>;
export type FetchDoctorsParams = z.infer<typeof FetchDoctorsParamsSchema>;
export type FetchDoctorReviewsParams = z.infer<typeof FetchDoctorReviewsParamsSchema>;

// ── Validation Helpers ──────────────────────

export function validateDoctor(data: unknown) {
  return DoctorSchema.safeParse(data);
}

export function validateDoctorList(data: unknown) {
  return DoctorListSchema.safeParse(data);
}

export function validateSpecialty(data: unknown) {
  return SpecialtySchema.safeParse(data);
}

export function validateSpecialtyList(data: unknown) {
  return SpecialtyListSchema.safeParse(data);
}

export function validateDoctorReview(data: unknown) {
  return DoctorReviewSchema.safeParse(data);
}

export function validateDoctorReviewList(data: unknown) {
  return DoctorReviewListSchema.safeParse(data);
}
