// ============================================
// Provider Domain - Zod Validation Schemas
// ============================================

import { z } from 'zod';
import { AppointmentSchema, PaymentRecordSchema, MedicationSchema } from './appointmentModel';

// ── Doctor Dashboard ────────────────────────

export const TodayStatsSchema = z.object({
  totalAppointments: z.number(),
  patientsSeen: z.number(),
  pending: z.number(),
  cancelled: z.number(),
});

export const DoctorDashboardEarningsSchema = z.object({
  today: z.number(),
  thisWeek: z.number(),
  thisMonth: z.number(),
  currency: z.string(),
});

export const DoctorDashboardDataSchema = z.object({
  doctorName: z.string(),
  todayStats: TodayStatsSchema,
  upcomingAppointments: z.array(AppointmentSchema),
  earnings: DoctorDashboardEarningsSchema,
});

// ── Doctor Earnings ─────────────────────────

export const EarningTransactionSchema = z.object({
  transactionId: z.string(),
  patientName: z.string(),
  appointmentId: z.string(),
  type: z.enum(['in-clinic', 'video']),
  amount: z.number(),
  method: z.enum(['cash', 'card', 'online', 'insurance']),
  status: z.enum(['completed', 'pending', 'refunded']),
  date: z.string(),
});

export const ConsultationBreakdownSchema = z.object({
  type: z.enum(['in-clinic', 'video']),
  count: z.number(),
  total: z.number(),
  percentage: z.number(),
});

export const ChartDataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});

// ── Patient Queue ───────────────────────────

export const PatientQueueHistoryItemSchema = z.object({
  date: z.string(),
  diagnosis: z.string(),
  type: z.enum(['in-clinic', 'video']),
});

export const QueuePatientSchema = z.object({
  queueId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  age: z.number(),
  gender: z.enum(['Male', 'Female', 'Other']),
  appointmentId: z.string(),
  type: z.enum(['in-clinic', 'video']),
  timeSlot: z.object({ start: z.string(), end: z.string() }),
  symptoms: z.string(),
  status: z.enum(['waiting', 'in-progress', 'completed', 'skipped']),
  tokenNumber: z.number(),
  estimatedWaitMinutes: z.number(),
  checkedInAt: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  history: z.array(PatientQueueHistoryItemSchema),
});

// ── Availability Settings ───────────────────

export const DayScheduleSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  isWorking: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
});

export const VacationDateSchema = z.object({
  id: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
});

// ── Medical Notes ───────────────────────────

export const NoteAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'file']),
  uri: z.string(),
  size: z.number(),
});

export const MedicalNoteSchema = z.object({
  noteId: z.string(),
  appointmentId: z.string(),
  date: z.string(),
  title: z.string(),
  content: z.string(),
  attachments: z.array(NoteAttachmentSchema),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const NotePatientSchema = z.object({
  patientId: z.string(),
  patientName: z.string(),
  age: z.number(),
  gender: z.enum(['Male', 'Female', 'Other']),
  bloodGroup: z.string(),
  allergies: z.array(z.string()),
  chronicConditions: z.array(z.string()),
});

// ── Prescription Writer ─────────────────────

export const PrescriptionPatientSchema = z.object({
  patientId: z.string(),
  patientName: z.string(),
  age: z.number(),
  gender: z.enum(['Male', 'Female', 'Other']),
  appointmentId: z.string(),
  type: z.enum(['in-clinic', 'video']),
});

// ── Prescription View (enriched) ────────────

export const PrescriptionDetailSchema = z.object({
  prescriptionId: z.string(),
  appointmentId: z.string(),
  doctor: z.object({
    doctorId: z.string(),
    name: z.string(),
    specialty: z.string(),
    profileImage: z.string(),
    qualifications: z.array(z.string()),
  }),
  patient: z.object({
    patientId: z.string(),
    name: z.string(),
    age: z.number(),
    gender: z.string(),
  }),
  diagnosis: z.string(),
  medications: z.array(MedicationSchema),
  testsRecommended: z.array(z.string()),
  specialInstructions: z.string(),
  followUpDate: z.string().nullable(),
  issuedAt: z.string(),
});

// ── Patient History ─────────────────────────

export const PastVisitSchema = z.object({
  visitId: z.string(),
  date: z.string(),
  type: z.enum(['in-clinic', 'video']),
  diagnosis: z.string(),
  symptoms: z.array(z.string()),
  prescriptionId: z.string().optional(),
  notes: z.string().optional(),
  followUp: z.string().optional(),
});

export const PatientRecordSchema = z.object({
  patientId: z.string(),
  patientName: z.string(),
  age: z.number(),
  gender: z.string(),
  bloodGroup: z.string(),
  phone: z.string(),
  allergies: z.array(z.string()),
  chronicConditions: z.array(z.string()),
  visits: z.array(PastVisitSchema),
});

// ── Doctor Profile ──────────────────────────

export const DoctorProfileDataSchema = z.object({
  doctorId: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  specialization: z.string(),
  qualification: z.string(),
  experience: z.number(),
  pmcNumber: z.string(),
  bio: z.string(),
  clinicName: z.string(),
  clinicAddress: z.string(),
  consultationFee: z.number(),
  videoConsultationFee: z.number(),
  currency: z.string(),
  languages: z.array(z.string()),
  rating: z.number(),
  totalReviews: z.number(),
  totalPatients: z.number(),
  isVerified: z.boolean(),
  isAvailable: z.boolean(),
});

// ── Coupon ──────────────────────────────────

export const CouponSchema = z.object({
  code: z.string(),
  discountPercent: z.number(),
  maxDiscount: z.number(),
  isValid: z.boolean(),
  message: z.string(),
});

// ── List Schemas ────────────────────────────

export const EarningTransactionListSchema = z.array(EarningTransactionSchema);
export const QueuePatientListSchema = z.array(QueuePatientSchema);
export const DayScheduleListSchema = z.array(DayScheduleSchema);
export const VacationDateListSchema = z.array(VacationDateSchema);
export const MedicalNoteListSchema = z.array(MedicalNoteSchema);
export const PastVisitListSchema = z.array(PastVisitSchema);

// ── Type Exports (inferred from schemas) ────

export type TodayStatsZ = z.infer<typeof TodayStatsSchema>;
export type DoctorDashboardEarningsZ = z.infer<typeof DoctorDashboardEarningsSchema>;
export type DoctorDashboardDataZ = z.infer<typeof DoctorDashboardDataSchema>;
export type EarningTransactionZ = z.infer<typeof EarningTransactionSchema>;
export type ConsultationBreakdownZ = z.infer<typeof ConsultationBreakdownSchema>;
export type ChartDataPointZ = z.infer<typeof ChartDataPointSchema>;
export type QueuePatientZ = z.infer<typeof QueuePatientSchema>;
export type DayScheduleZ = z.infer<typeof DayScheduleSchema>;
export type VacationDateZ = z.infer<typeof VacationDateSchema>;
export type MedicalNoteZ = z.infer<typeof MedicalNoteSchema>;
export type NotePatientZ = z.infer<typeof NotePatientSchema>;
export type PrescriptionDetailZ = z.infer<typeof PrescriptionDetailSchema>;
export type PatientRecordZ = z.infer<typeof PatientRecordSchema>;
export type PastVisitZ = z.infer<typeof PastVisitSchema>;
export type DoctorProfileDataZ = z.infer<typeof DoctorProfileDataSchema>;
export type CouponZ = z.infer<typeof CouponSchema>;
