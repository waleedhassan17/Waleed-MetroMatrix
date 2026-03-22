// ============================================
// Provider Domain - Serializers
// ============================================

import type {
  TodayStats,
  DoctorDashboardEarnings,
  DoctorDashboardData,
  EarningTransaction,
  ConsultationBreakdown,
  ChartDataPoint,
  QueuePatient,
  PatientQueueHistoryItem,
  DaySchedule,
  VacationDate,
  MedicalNote,
  NoteAttachment,
  NotePatient,
  PrescriptionDetail,
  PatientRecord,
  PastVisit,
  DoctorProfileData,
  Coupon,
  Medication,
} from '../../models/healthcare/types';
import { appointmentSerializer } from './healthcareSerializer';

// ── Today Stats ─────────────────────────────

export function todayStatsSerializer(data: any): TodayStats {
  return {
    totalAppointments: data?.totalAppointments || 0,
    patientsSeen: data?.patientsSeen || 0,
    pending: data?.pending || 0,
    cancelled: data?.cancelled || 0,
  };
}

// ── Dashboard Earnings ──────────────────────

export function dashboardEarningsSerializer(data: any): DoctorDashboardEarnings {
  return {
    today: data?.today || 0,
    thisWeek: data?.thisWeek || 0,
    thisMonth: data?.thisMonth || 0,
    currency: data?.currency || 'PKR',
  };
}

// ── Dashboard Data ──────────────────────────

export function dashboardDataSerializer(data: any): DoctorDashboardData {
  return {
    doctorName: data?.doctorName || '',
    todayStats: todayStatsSerializer(data?.todayStats),
    upcomingAppointments: (data?.upcomingAppointments || []).map(appointmentSerializer),
    earnings: dashboardEarningsSerializer(data?.earnings),
  };
}

// ── Earning Transaction ─────────────────────

export function earningTransactionSerializer(data: any): EarningTransaction {
  return {
    transactionId: data?.transactionId || '',
    patientName: data?.patientName || '',
    appointmentId: data?.appointmentId || '',
    type: data?.type || 'in-clinic',
    amount: data?.amount || 0,
    method: data?.method || 'cash',
    status: data?.status || 'pending',
    date: data?.date || '',
  };
}

// ── Consultation Breakdown ──────────────────

export function consultationBreakdownSerializer(data: any): ConsultationBreakdown {
  return {
    type: data?.type || 'in-clinic',
    count: data?.count || 0,
    total: data?.total || 0,
    percentage: data?.percentage || 0,
  };
}

// ── Chart Data Point ────────────────────────

export function chartDataPointSerializer(data: any): ChartDataPoint {
  return {
    label: data?.label || '',
    value: data?.value || 0,
  };
}

// ── Queue Patient ───────────────────────────

export function patientQueueHistoryItemSerializer(data: any): PatientQueueHistoryItem {
  return {
    date: data?.date || '',
    diagnosis: data?.diagnosis || '',
    type: data?.type || 'in-clinic',
  };
}

export function queuePatientSerializer(data: any): QueuePatient {
  return {
    queueId: data?.queueId || '',
    patientId: data?.patientId || '',
    patientName: data?.patientName || '',
    age: data?.age || 0,
    gender: data?.gender || 'Male',
    appointmentId: data?.appointmentId || '',
    type: data?.type || 'in-clinic',
    timeSlot: {
      start: data?.timeSlot?.start || '',
      end: data?.timeSlot?.end || '',
    },
    symptoms: data?.symptoms || '',
    status: data?.status || 'waiting',
    tokenNumber: data?.tokenNumber || 0,
    estimatedWaitMinutes: data?.estimatedWaitMinutes || 0,
    checkedInAt: data?.checkedInAt,
    startedAt: data?.startedAt,
    completedAt: data?.completedAt,
    history: (data?.history || []).map(patientQueueHistoryItemSerializer),
  };
}

// ── Day Schedule ────────────────────────────

export function dayScheduleSerializer(data: any): DaySchedule {
  return {
    day: data?.day || 'Monday',
    isWorking: data?.isWorking ?? false,
    startTime: data?.startTime || '09:00',
    endTime: data?.endTime || '17:00',
  };
}

// ── Vacation Date ───────────────────────────

export function vacationDateSerializer(data: any): VacationDate {
  return {
    id: data?.id || '',
    startDate: data?.startDate || '',
    endDate: data?.endDate || '',
    reason: data?.reason || '',
  };
}

// ── Note Attachment ─────────────────────────

export function noteAttachmentSerializer(data: any): NoteAttachment {
  return {
    id: data?.id || '',
    name: data?.name || '',
    type: data?.type || 'file',
    uri: data?.uri || '',
    size: data?.size || 0,
  };
}

// ── Medical Note ────────────────────────────

export function medicalNoteSerializer(data: any): MedicalNote {
  return {
    noteId: data?.noteId || '',
    appointmentId: data?.appointmentId || '',
    date: data?.date || '',
    title: data?.title || '',
    content: data?.content || '',
    attachments: (data?.attachments || []).map(noteAttachmentSerializer),
    tags: data?.tags || [],
    createdAt: data?.createdAt || '',
    updatedAt: data?.updatedAt || '',
  };
}

// ── Note Patient ────────────────────────────

export function notePatientSerializer(data: any): NotePatient {
  return {
    patientId: data?.patientId || '',
    patientName: data?.patientName || '',
    age: data?.age || 0,
    gender: data?.gender || 'Male',
    bloodGroup: data?.bloodGroup || '',
    allergies: data?.allergies || [],
    chronicConditions: data?.chronicConditions || [],
  };
}

// ── Prescription Detail (enriched) ──────────

function medicationViewSerializer(data: any): Medication {
  return {
    name: data?.name || '',
    dosage: data?.dosage || '',
    frequency: data?.frequency || '',
    duration: data?.duration || '',
    instructions: data?.instructions || '',
  };
}

export function prescriptionDetailSerializer(data: any): PrescriptionDetail {
  return {
    prescriptionId: data?.prescriptionId || '',
    appointmentId: data?.appointmentId || '',
    doctor: {
      doctorId: data?.doctor?.doctorId || '',
      name: data?.doctor?.name || '',
      specialty: data?.doctor?.specialty || '',
      profileImage: data?.doctor?.profileImage || '',
      qualifications: data?.doctor?.qualifications || [],
    },
    patient: {
      patientId: data?.patient?.patientId || '',
      name: data?.patient?.name || '',
      age: data?.patient?.age || 0,
      gender: data?.patient?.gender || '',
    },
    diagnosis: data?.diagnosis || '',
    medications: (data?.medications || []).map(medicationViewSerializer),
    testsRecommended: data?.testsRecommended || [],
    specialInstructions: data?.specialInstructions || '',
    followUpDate: data?.followUpDate ?? null,
    issuedAt: data?.issuedAt || '',
  };
}

// ── Past Visit ──────────────────────────────

export function pastVisitSerializer(data: any): PastVisit {
  return {
    visitId: data?.visitId || '',
    date: data?.date || '',
    type: data?.type || 'in-clinic',
    diagnosis: data?.diagnosis || '',
    symptoms: data?.symptoms || [],
    prescriptionId: data?.prescriptionId,
    notes: data?.notes,
    followUp: data?.followUp,
  };
}

// ── Patient Record ──────────────────────────

export function patientRecordSerializer(data: any): PatientRecord {
  return {
    patientId: data?.patientId || '',
    patientName: data?.patientName || '',
    age: data?.age || 0,
    gender: data?.gender || '',
    bloodGroup: data?.bloodGroup || '',
    phone: data?.phone || '',
    allergies: data?.allergies || [],
    chronicConditions: data?.chronicConditions || [],
    visits: (data?.visits || []).map(pastVisitSerializer),
  };
}

// ── Doctor Profile Data ─────────────────────

export function doctorProfileDataSerializer(data: any): DoctorProfileData {
  return {
    doctorId: data?.doctorId || '',
    fullName: data?.fullName || '',
    email: data?.email || '',
    phone: data?.phone || '',
    specialization: data?.specialization || '',
    qualification: data?.qualification || '',
    experience: data?.experience || 0,
    pmcNumber: data?.pmcNumber || '',
    bio: data?.bio || '',
    clinicName: data?.clinicName || '',
    clinicAddress: data?.clinicAddress || '',
    consultationFee: data?.consultationFee || 0,
    videoConsultationFee: data?.videoConsultationFee || 0,
    currency: data?.currency || 'PKR',
    languages: data?.languages || [],
    rating: data?.rating || 0,
    totalReviews: data?.totalReviews || 0,
    totalPatients: data?.totalPatients || 0,
    isVerified: data?.isVerified ?? false,
    isAvailable: data?.isAvailable ?? false,
  };
}

// ── Coupon ──────────────────────────────────

export function couponSerializer(data: any): Coupon {
  return {
    code: data?.code || '',
    discountPercent: data?.discountPercent || 0,
    maxDiscount: data?.maxDiscount || 0,
    isValid: data?.isValid ?? false,
    message: data?.message || '',
  };
}
