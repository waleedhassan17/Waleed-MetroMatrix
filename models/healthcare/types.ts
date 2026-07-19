// ============================================
// Healthcare Module - TypeScript Types
// ============================================

// ── Doctor ──────────────────────────────────

export interface Doctor {
  doctorId: string;
  userId: string;
  name?: string;
  pmcNumber: string;
  specialtyId: string;
  specialtyName?: string;
  subspecialties: string[];
  qualifications: string[];
  experience: number; // years
  bio: string;
  profileImage: string;
  clinics: Clinic[];
  consultationFee: number;
  videoConsultationFee: number;
  rating: number;
  totalReviews: number;
  totalPatients: number;
  isAvailable: boolean;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  languages: string[];
  awards: string[];
  publications: string[];
  availableSlots?: Array<{ dateTime: string }>;
  createdAt: string;
}

// ── Specialty ───────────────────────────────

export interface Specialty {
  specialtyId: string;
  name: string;
  icon: string;
  description: string;
  doctorCount: number;
  commonConditions: string[];
  parentSpecialtyId?: string;
  isActive: boolean;
}

// ── Clinic ──────────────────────────────────

export interface ClinicTiming {
  day: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface Clinic {
  clinicId: string;
  doctorId: string;
  name: string;
  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  phone: string;
  timings: ClinicTiming[];
  images: string[];
  amenities: string[];
}

// ── Appointment ─────────────────────────────

export interface Appointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  clinicId?: string;
  type: 'in-clinic' | 'video';
  date: string;
  timeSlot: { start: string; end: string };
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  symptoms?: string;
  notes?: string;
  prescription?: Prescription;
  payment: PaymentRecord;
  confirmationCode?: string;
  confirmedAt?: string;
  createdAt: string;
  // Display-only (populated on backend list/detail responses)
  doctorName?: string;
  doctorImage?: string;
  specialtyName?: string;
  clinicName?: string;
  clinicAddress?: string;
  patientName?: string;
}

// ── TimeSlot ────────────────────────────────

export interface TimeSlot {
  slotId: string;
  doctorId: string;
  clinicId?: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  appointmentType: 'in-clinic' | 'video' | 'both';
  maxPatients: number;
  bookedCount: number;
}

// ── Prescription ────────────────────────────

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  prescriptionId: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  diagnosis: string;
  medications: Medication[];
  tests: string[];
  advice: string;
  followUpDate?: string;
  signature: string;
  createdAt: string;
}

// ── Review ──────────────────────────────────

export interface DoctorReviewResponse {
  text: string;
  respondedAt: string;
}

export interface DoctorReview {
  reviewId: string;
  doctorId: string;
  patientId: string;
  appointmentId: string;
  rating: number; // 1-5
  comment: string;
  isAnonymous: boolean;
  tags?: string[];
  helpfulCount?: number;
  createdAt: string;
  response?: DoctorReviewResponse;
}

// ── Medical Record ──────────────────────────

export interface MedicalRecord {
  recordId: string;
  patientId: string;
  type: 'report' | 'prescription' | 'discharge' | 'imaging';
  title: string;
  description: string;
  fileUrl: string;
  fileSize?: string;
  uploadedAt: string;
  linkedAppointmentId?: string;
}

// ── Video Call ──────────────────────────────

export interface VideoCall {
  callId: string;
  appointmentId: string;
  roomId: string;
  status: 'waiting' | 'connecting' | 'active' | 'ended';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  recording?: string;
  /** Jitsi room URL (H6 transport) — rendered in a WebView on both sides */
  roomUrl?: string;
  provider?: string;
}

// ── Payment Record ──────────────────────────

export interface PaymentRecord {
  paymentId: string;
  amount: number;
  method: 'cash' | 'card' | 'online' | 'insurance';
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  transactionId?: string;
  paidAt?: string;
}

// ── Doctor Dashboard ────────────────────────

export interface TodayStats {
  totalAppointments: number;
  patientsSeen: number;
  pending: number;
  cancelled: number;
}

export interface DoctorDashboardEarnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  currency: string;
}

export interface DoctorDashboardData {
  doctorName: string;
  todayStats: TodayStats;
  upcomingAppointments: Appointment[];
  earnings: DoctorDashboardEarnings;
}

// ── Doctor Earnings ─────────────────────────

export type PeriodFilter = 'today' | 'thisWeek' | 'thisMonth' | 'custom';

export interface EarningTransaction {
  transactionId: string;
  patientName: string;
  appointmentId: string;
  type: 'in-clinic' | 'video';
  amount: number;
  method: 'cash' | 'card' | 'online' | 'insurance';
  status: 'completed' | 'pending' | 'refunded';
  date: string;
}

export interface ConsultationBreakdown {
  type: 'in-clinic' | 'video';
  count: number;
  total: number;
  percentage: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

// ── Patient Queue ───────────────────────────

export type QueueStatus = 'waiting' | 'in-progress' | 'completed' | 'skipped';

export interface PatientQueueHistoryItem {
  date: string;
  diagnosis: string;
  type: 'in-clinic' | 'video';
}

export interface QueuePatient {
  queueId: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  appointmentId: string;
  type: 'in-clinic' | 'video';
  timeSlot: { start: string; end: string };
  symptoms: string;
  status: QueueStatus;
  tokenNumber: number;
  estimatedWaitMinutes: number;
  checkedInAt?: string;
  startedAt?: string;
  completedAt?: string;
  history: PatientQueueHistoryItem[];
}

// ── Availability Settings ───────────────────

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface DaySchedule {
  day: Weekday;
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

export interface VacationDate {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
}

// ── Medical Notes ───────────────────────────

export interface NoteAttachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  uri: string;
  size: number;
}

export interface MedicalNote {
  noteId: string;
  appointmentId: string;
  date: string;
  title: string;
  content: string;
  attachments: NoteAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotePatient {
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
}

// ── Prescription Writer ─────────────────────

export interface PrescriptionPatient {
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  appointmentId: string;
  type: 'in-clinic' | 'video';
}

// ── Prescription View (enriched) ────────────

export interface PrescriptionDetail {
  prescriptionId: string;
  appointmentId: string;
  doctor: {
    doctorId: string;
    name: string;
    specialty: string;
    profileImage: string;
    qualifications: string[];
  };
  patient: {
    patientId: string;
    name: string;
    age: number;
    gender: string;
  };
  diagnosis: string;
  medications: Medication[];
  testsRecommended: string[];
  specialInstructions: string;
  followUpDate: string | null;
  issuedAt: string;
}

// ── Patient History ─────────────────────────

export interface PastVisit {
  visitId: string;
  date: string;
  type: 'in-clinic' | 'video';
  diagnosis: string;
  symptoms: string[];
  prescriptionId?: string;
  notes?: string;
  followUp?: string;
}

export interface PatientRecord {
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  allergies: string[];
  chronicConditions: string[];
  visits: PastVisit[];
}

// ── Doctor Profile ──────────────────────────

export interface DoctorProfileData {
  doctorId: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experience: number;
  pmcNumber: string;
  bio: string;
  clinicName: string;
  clinicAddress: string;
  consultationFee: number;
  videoConsultationFee: number;
  currency: string;
  languages: string[];
  rating: number;
  totalReviews: number;
  totalPatients: number;
  isVerified: boolean;
  isAvailable: boolean;
}

// ── Coupon & Payment ────────────────────────

export interface Coupon {
  code: string;
  discountPercent: number;
  maxDiscount: number;
  minOrderValue?: number;
  isValid: boolean;
  message: string;
}

// ── Navigation Param Types ──────────────────

export type HealthcareStackParamList = {
  HealthcareTabs: undefined;
  HealthcareHome: undefined;
  SpecialtyList: undefined;
  DoctorSearch: undefined;
  DoctorList: { specialtyId: string; specialtyName?: string };
  DoctorDetail: { doctorId: string };
  DoctorReviews: { doctorId: string; doctorName?: string };
  ClinicSelection: { doctorId: string; clinicId?: string };
  SlotSelection: { doctorId: string; clinicId?: string };
  BookAppointment: { doctorId: string; clinicId?: string };
  BookingConfirmation: { doctorId: string; clinicId?: string };
  AppointmentConfirm: { appointmentId: string };
  MyAppointments: undefined;
  AppointmentDetail: { appointmentId: string };
  RescheduleAppointment: { appointmentId: string };
  VideoWaitingRoom: { appointmentId: string; roomId?: string; specialtyName?: string };
  VideoCall: { appointmentId: string; roomId: string };
  PrescriptionView: { prescriptionId: string };
  HealthRecords: undefined;
  UploadRecord: { appointmentId?: string };
  Emergency: undefined;
  HealthcareNotifications: undefined;
  HealthcareProfile: undefined;
  AppointmentPayment: { appointmentId: string };
  MyPrescriptions: undefined;
  SymptomChecker: undefined;
};

export type DoctorStackParamList = {
  DoctorTabs: undefined;
  DoctorDashboard: undefined;
  DoctorSchedule: undefined;
  DoctorAppointments: undefined;
  ConsultationNotes: { appointmentId: string };
  PrescriptionWriter: { appointmentId: string; patientId: string };
  PatientHistory: { patientId: string };
  DoctorEarnings: undefined;
  DoctorProfile: undefined;
  DoctorAvailability: undefined;
  ManageSlots: undefined;
  WalletScreen: undefined;
  TopUpWebView: { url: string; sessionId: string };
  DoctorVideoConsultation: { appointmentId: string };
  DoctorMyReviews: undefined;
  DoctorNotifications: undefined;
  DoctorPatients: undefined;
};
