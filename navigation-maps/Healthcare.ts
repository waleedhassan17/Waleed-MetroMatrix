// ============================================
// Healthcare Module - Route Constants
// ============================================

// Patient / User Routes
export const HealthcareRouteNames = {
  HealthcareTabs: 'HealthcareTabs',
  HealthcareHome: 'HealthcareHome',
  SpecialtyList: 'SpecialtyList',
  DoctorSearch: 'DoctorSearch',
  DoctorList: 'DoctorList',
  DoctorDetail: 'DoctorDetail',
  DoctorReviews: 'DoctorReviews',
  ClinicSelection: 'ClinicSelection',
  SlotSelection: 'SlotSelection',
  BookAppointment: 'BookAppointment',
  BookingConfirmation: 'BookingConfirmation',
  AppointmentConfirm: 'AppointmentConfirm',
  MyAppointments: 'MyAppointments',
  AppointmentDetail: 'AppointmentDetail',
  RescheduleAppointment: 'RescheduleAppointment',
  VideoCall: 'VideoCall',
  VideoWaitingRoom: 'VideoWaitingRoom',
  PrescriptionView: 'PrescriptionView',
  HealthRecords: 'HealthRecords',
  UploadRecord: 'UploadRecord',
  Emergency: 'Emergency',
  HealthcareNotifications: 'HealthcareNotifications',
  HealthcareProfile: 'HealthcareProfile',
  AppointmentPayment: 'AppointmentPayment',
  MyPrescriptions: 'MyPrescriptions',
  SymptomChecker: 'SymptomChecker',
} as const;

// Doctor / Provider Routes
export const DoctorRouteNames = {
  DoctorTabs: 'DoctorTabs',
  DoctorDashboard: 'DoctorDashboard',
  DoctorSchedule: 'DoctorSchedule',
  DoctorAppointments: 'DoctorAppointments',
  ConsultationNotes: 'ConsultationNotes',
  PrescriptionWriter: 'PrescriptionWriter',
  PatientHistory: 'PatientHistory',
  DoctorEarnings: 'DoctorEarnings',
  DoctorProfile: 'DoctorProfile',
  DoctorAvailability: 'DoctorAvailability',
  ManageSlots: 'ManageSlots',
  DoctorVideoConsultation: 'DoctorVideoConsultation',
  DoctorMyReviews: 'DoctorMyReviews',
  DoctorNotifications: 'DoctorNotifications',
  DoctorPatients: 'DoctorPatients',
} as const;

export type HealthcareRouteName = typeof HealthcareRouteNames[keyof typeof HealthcareRouteNames];
export type DoctorRouteName = typeof DoctorRouteNames[keyof typeof DoctorRouteNames];
