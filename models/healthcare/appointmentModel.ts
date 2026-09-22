// ============================================
// Appointment Domain - Zod Validation Schemas
// ============================================

import { z } from 'zod';

// ── Payment Record Schema ───────────────────

export const PaymentRecordSchema = z.object({
  paymentId: z.string(),
  amount: z.number(),
  // Mirrors the backend enum on Appointment.payment.method.
  method: z.enum(['wallet', 'cash_at_clinic']),
  status: z.enum(['unpaid', 'paid', 'refunded']),
  transactionId: z.string().optional(),
  paidAt: z.string().optional(),
});

// ── Medication Schema ───────────────────────

export const MedicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string(),
});

// ── Prescription Schema ─────────────────────

export const PrescriptionSchema = z.object({
  prescriptionId: z.string(),
  appointmentId: z.string(),
  doctorId: z.string(),
  patientId: z.string(),
  diagnosis: z.string(),
  medications: z.array(MedicationSchema),
  tests: z.array(z.string()),
  advice: z.string(),
  followUpDate: z.string().optional(),
  signature: z.string(),
  createdAt: z.string(),
});

// ── Time Slot Schema ────────────────────────

export const TimeSlotSchema = z.object({
  slotId: z.string(),
  doctorId: z.string(),
  clinicId: z.string().optional(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean(),
  appointmentType: z.enum(['in-clinic', 'video', 'both']),
  maxPatients: z.number(),
  bookedCount: z.number(),
});

// ── Appointment Schema ──────────────────────

export const AppointmentSchema = z.object({
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  clinicId: z.string().optional(),
  type: z.enum(['in-clinic', 'video']),
  date: z.string(),
  timeSlot: z.object({
    start: z.string(),
    end: z.string(),
  }),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no-show']),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
  prescription: PrescriptionSchema.optional(),
  payment: PaymentRecordSchema,
  confirmationCode: z.string().optional(),
  confirmedAt: z.string().optional(),
  createdAt: z.string(),
});

// ── Medical Record Schema ───────────────────

export const MedicalRecordSchema = z.object({
  recordId: z.string(),
  patientId: z.string(),
  type: z.enum(['report', 'prescription', 'discharge', 'imaging']),
  title: z.string(),
  description: z.string(),
  fileUrl: z.string(),
  fileSize: z.string().optional(),
  uploadedAt: z.string(),
  linkedAppointmentId: z.string().optional(),
});

// ── Video Call Schema ───────────────────────

export const VideoCallSchema = z.object({
  callId: z.string(),
  appointmentId: z.string(),
  roomId: z.string(),
  status: z.enum(['waiting', 'connecting', 'active', 'ended']),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  duration: z.number().optional(),
  recording: z.string().optional(),
});

// ── API Request Schemas ─────────────────────

export const BookAppointmentRequestSchema = z.object({
  doctorId: z.string(),
  // Backend books against a concrete slot; supply the selected slotId.
  slotId: z.string().optional(),
  clinicId: z.string().optional(),
  type: z.enum(['in-clinic', 'video']),
  date: z.string(),
  timeSlot: z.object({
    start: z.string(),
    end: z.string(),
  }),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
  patientDetails: z.object({
    name: z.string(),
    phone: z.string(),
    age: z.number().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    relation: z.string().optional(),
  }).optional(),
  paymentMethod: z.string().optional(),
  couponCode: z.string().optional(),
});

export const RescheduleAppointmentRequestSchema = z.object({
  appointmentId: z.string(),
  // The backend reschedules to a concrete slot and requires this — it is the
  // ONLY field that goes on the wire. It used to be optional while `date` and
  // `timeSlot` were required, which is backwards: the one caller dutifully
  // filled in the two fields nothing reads and left out the one that matters,
  // so every reschedule was rejected by the route's validator before it
  // reached the controller.
  newSlotId: z.string(),
  // Kept for the caller's own bookkeeping; not sent.
  date: z.string().optional(),
  timeSlot: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});

export const FetchTimeSlotsParamsSchema = z.object({
  doctorId: z.string(),
  date: z.string(),
  clinicId: z.string().optional(),
  // The backend's /slots endpoint has always accepted `type`; nothing sent it,
  // so the video list was narrowed only by a filter running on this device.
  // Letting the server do it keeps the two consultation types symmetrical —
  // in-clinic was already narrowed server-side by `clinicId`.
  type: z.enum(['in-clinic', 'video']).optional(),
});

export const FetchAppointmentsParamsSchema = z.object({
  // Optional: the backend reads the patient off the auth token and
  // `fetchAppointmentsApi` never sends this. Requiring it only ever produced
  // placeholder values like 'patient-1' at the call sites.
  patientId: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no-show']).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const UploadMedicalRecordRequestSchema = z.object({
  patientId: z.string(),
  type: z.enum(['report', 'prescription', 'discharge', 'imaging']),
  title: z.string(),
  description: z.string(),
  fileUrl: z.string(),
  linkedAppointmentId: z.string().optional(),
});

// ── List Schemas ────────────────────────────

export const AppointmentListSchema = z.array(AppointmentSchema);
export const TimeSlotListSchema = z.array(TimeSlotSchema);
export const MedicalRecordListSchema = z.array(MedicalRecordSchema);

// ── Type Exports (inferred from schemas) ────

export type AppointmentZ = z.infer<typeof AppointmentSchema>;
export type TimeSlotZ = z.infer<typeof TimeSlotSchema>;
export type PrescriptionZ = z.infer<typeof PrescriptionSchema>;
export type MedicationZ = z.infer<typeof MedicationSchema>;
export type PaymentRecordZ = z.infer<typeof PaymentRecordSchema>;
export type MedicalRecordZ = z.infer<typeof MedicalRecordSchema>;
export type VideoCallZ = z.infer<typeof VideoCallSchema>;
export type BookAppointmentRequest = z.infer<typeof BookAppointmentRequestSchema>;
export type RescheduleAppointmentRequest = z.infer<typeof RescheduleAppointmentRequestSchema>;
export type FetchTimeSlotsParams = z.infer<typeof FetchTimeSlotsParamsSchema>;
export type FetchAppointmentsParams = z.infer<typeof FetchAppointmentsParamsSchema>;
export type UploadMedicalRecordRequest = z.infer<typeof UploadMedicalRecordRequestSchema>;

// ── Validation Helpers ──────────────────────

export function validateAppointment(data: unknown) {
  return AppointmentSchema.safeParse(data);
}

export function validateAppointmentList(data: unknown) {
  return AppointmentListSchema.safeParse(data);
}

export function validateTimeSlot(data: unknown) {
  return TimeSlotSchema.safeParse(data);
}

export function validateTimeSlotList(data: unknown) {
  return TimeSlotListSchema.safeParse(data);
}

export function validatePrescription(data: unknown) {
  return PrescriptionSchema.safeParse(data);
}

export function validateMedicalRecord(data: unknown) {
  return MedicalRecordSchema.safeParse(data);
}

export function validateVideoCall(data: unknown) {
  return VideoCallSchema.safeParse(data);
}

export function validateBookAppointmentRequest(data: unknown) {
  return BookAppointmentRequestSchema.safeParse(data);
}

export function validateRescheduleRequest(data: unknown) {
  return RescheduleAppointmentRequestSchema.safeParse(data);
}

export function validateUploadMedicalRecordRequest(data: unknown) {
  return UploadMedicalRecordRequestSchema.safeParse(data);
}
