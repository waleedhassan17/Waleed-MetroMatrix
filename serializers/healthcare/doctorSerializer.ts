// ============================================
// Doctor Domain - Serializers
// ============================================

import type { Doctor, Specialty, Clinic, ClinicTiming, DoctorReview } from '../../models/healthcare/types';
import {
  DoctorSchema,
  SpecialtySchema,
  ClinicSchema,
  ClinicTimingSchema,
  DoctorReviewSchema,
  DoctorListSchema,
  SpecialtyListSchema,
  DoctorReviewListSchema,
} from '../../models/healthcare/doctorModel';

// ── Safe Serializers (with Zod validation) ──
// These parse and validate the data, returning
// a typed result or throwing on invalid data.

export function serializeDoctor(data: unknown): Doctor {
  return DoctorSchema.parse(data);
}

export function serializeDoctorList(data: unknown): Doctor[] {
  return DoctorListSchema.parse(data);
}

export function serializeSpecialty(data: unknown): Specialty {
  return SpecialtySchema.parse(data);
}

export function serializeSpecialtyList(data: unknown): Specialty[] {
  return SpecialtyListSchema.parse(data);
}

export function serializeClinic(data: unknown): Clinic {
  return ClinicSchema.parse(data);
}

export function serializeClinicTiming(data: unknown): ClinicTiming {
  return ClinicTimingSchema.parse(data);
}

export function serializeDoctorReview(data: unknown): DoctorReview {
  return DoctorReviewSchema.parse(data);
}

export function serializeDoctorReviewList(data: unknown): DoctorReview[] {
  return DoctorReviewListSchema.parse(data);
}

// ── Safe Serializers (non-throwing) ─────────
// Return { success, data, error } instead of throwing.

export function safeDoctorSerialize(data: unknown) {
  return DoctorSchema.safeParse(data);
}

export function safeDoctorListSerialize(data: unknown) {
  return DoctorListSchema.safeParse(data);
}

export function safeSpecialtySerialize(data: unknown) {
  return SpecialtySchema.safeParse(data);
}

export function safeSpecialtyListSerialize(data: unknown) {
  return SpecialtyListSchema.safeParse(data);
}

export function safeDoctorReviewSerialize(data: unknown) {
  return DoctorReviewSchema.safeParse(data);
}

export function safeDoctorReviewListSerialize(data: unknown) {
  return DoctorReviewListSchema.safeParse(data);
}
