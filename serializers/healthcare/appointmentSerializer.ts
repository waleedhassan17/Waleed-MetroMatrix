// ============================================
// Appointment Domain - Serializers
// ============================================

import type {
  Appointment,
  TimeSlot,
  Prescription,
  Medication,
  MedicalRecord,
  VideoCall,
  PaymentRecord,
} from '../../models/healthcare/types';
import {
  AppointmentSchema,
  AppointmentListSchema,
  TimeSlotSchema,
  TimeSlotListSchema,
  PrescriptionSchema,
  MedicationSchema,
  MedicalRecordSchema,
  MedicalRecordListSchema,
  VideoCallSchema,
  PaymentRecordSchema,
} from '../../models/healthcare/appointmentModel';

// ── Safe Serializers (with Zod validation) ──
// These parse and validate the data, returning
// a typed result or throwing on invalid data.

export function serializeAppointment(data: unknown): Appointment {
  return AppointmentSchema.parse(data);
}

export function serializeAppointmentList(data: unknown): Appointment[] {
  return AppointmentListSchema.parse(data);
}

export function serializeTimeSlot(data: unknown): TimeSlot {
  return TimeSlotSchema.parse(data);
}

export function serializeTimeSlotList(data: unknown): TimeSlot[] {
  return TimeSlotListSchema.parse(data);
}

export function serializePrescription(data: unknown): Prescription {
  return PrescriptionSchema.parse(data);
}

export function serializeMedication(data: unknown): Medication {
  return MedicationSchema.parse(data);
}

export function serializeMedicalRecord(data: unknown): MedicalRecord {
  return MedicalRecordSchema.parse(data);
}

export function serializeMedicalRecordList(data: unknown): MedicalRecord[] {
  return MedicalRecordListSchema.parse(data);
}

export function serializeVideoCall(data: unknown): VideoCall {
  return VideoCallSchema.parse(data);
}

export function serializePaymentRecord(data: unknown): PaymentRecord {
  return PaymentRecordSchema.parse(data);
}

// ── Safe Serializers (non-throwing) ─────────
// Return { success, data, error } instead of throwing.

export function safeAppointmentSerialize(data: unknown) {
  return AppointmentSchema.safeParse(data);
}

export function safeAppointmentListSerialize(data: unknown) {
  return AppointmentListSchema.safeParse(data);
}

export function safeTimeSlotSerialize(data: unknown) {
  return TimeSlotSchema.safeParse(data);
}

export function safeTimeSlotListSerialize(data: unknown) {
  return TimeSlotListSchema.safeParse(data);
}

export function safePrescriptionSerialize(data: unknown) {
  return PrescriptionSchema.safeParse(data);
}

export function safeMedicalRecordSerialize(data: unknown) {
  return MedicalRecordSchema.safeParse(data);
}

export function safeMedicalRecordListSerialize(data: unknown) {
  return MedicalRecordListSchema.safeParse(data);
}

export function safeVideoCallSerialize(data: unknown) {
  return VideoCallSchema.safeParse(data);
}

export function safePaymentRecordSerialize(data: unknown) {
  return PaymentRecordSchema.safeParse(data);
}
