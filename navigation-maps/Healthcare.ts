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
  RecordDetail: 'RecordDetail',
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
  // Prefixed: the patient stack already owns 'AppointmentDetail', and an
  // unresolved name bubbles up to the root navigator.
  AppointmentDetail: 'DoctorAppointmentDetail',
  ConsultationNotes: 'ConsultationNotes',
  PrescriptionWriter: 'PrescriptionWriter',
  PatientHistory: 'PatientHistory',
  EditDoctorProfile: 'EditDoctorProfile',
  AvailabilityHub: 'AvailabilityHub',
  DoctorMyReviews: 'DoctorMyReviews',
  DoctorNotifications: 'DoctorNotifications',
} as const;

/** The doctor's bottom tabs, inside DoctorTabs. */
export const DoctorTabNames = {
  Home: 'DoctorHome',
  Schedule: 'Schedule',
  Patients: 'Patients',
  Earnings: 'Earnings',
  Account: 'Account',
} as const;

export type HealthcareRouteName = typeof HealthcareRouteNames[keyof typeof HealthcareRouteNames];
export type DoctorRouteName = typeof DoctorRouteNames[keyof typeof DoctorRouteNames];
