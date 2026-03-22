import type {
  Doctor,
  Specialty,
  Clinic,
  ClinicTiming,
  Appointment,
  TimeSlot,
  Prescription,
  Medication,
  DoctorReview,
  MedicalRecord,
  VideoCall,
  PaymentRecord,
  DoctorDashboardData,
  EarningTransaction,
  ChartDataPoint,
  ConsultationBreakdown,
  PeriodFilter,
  QueuePatient,
  DaySchedule,
  VacationDate,
  MedicalNote,
  NotePatient,
  PrescriptionDetail,
  PatientRecord,
  DoctorProfileData,
  Coupon,
} from '../../models/healthcare/types';

// ── Dummy Specialties ───────────────────────

export const dummySpecialties: Specialty[] = [
  {
    specialtyId: 'spec-1',
    name: 'General Physician',
    icon: 'stethoscope',
    description: 'Primary care and general medicine',
    doctorCount: 45,
    commonConditions: ['Fever', 'Cold & Flu', 'Infections', 'Diabetes', 'Hypertension'],
    isActive: true,
  },
  {
    specialtyId: 'spec-2',
    name: 'Cardiologist',
    icon: 'heart-pulse',
    description: 'Heart and cardiovascular system',
    doctorCount: 18,
    commonConditions: ['Heart Disease', 'Chest Pain', 'High Blood Pressure', 'Arrhythmia'],
    isActive: true,
  },
  {
    specialtyId: 'spec-3',
    name: 'Dermatologist',
    icon: 'hand',
    description: 'Skin, hair and nail conditions',
    doctorCount: 22,
    commonConditions: ['Acne', 'Eczema', 'Psoriasis', 'Hair Loss', 'Skin Allergies'],
    isActive: true,
  },
  {
    specialtyId: 'spec-4',
    name: 'Orthopedic',
    icon: 'bone',
    description: 'Bones, joints and muscles',
    doctorCount: 15,
    commonConditions: ['Back Pain', 'Fractures', 'Arthritis', 'Joint Pain', 'Sports Injuries'],
    isActive: true,
  },
  {
    specialtyId: 'spec-5',
    name: 'Gynecologist',
    icon: 'baby',
    description: "Women's reproductive health",
    doctorCount: 20,
    commonConditions: ['Pregnancy', 'PCOS', 'Menstrual Issues', 'Infertility'],
    isActive: true,
  },
  {
    specialtyId: 'spec-6',
    name: 'Pediatrician',
    icon: 'smile',
    description: 'Child healthcare',
    doctorCount: 25,
    commonConditions: ['Child Fever', 'Growth Issues', 'Vaccinations', 'Allergies'],
    isActive: true,
  },
  {
    specialtyId: 'spec-7',
    name: 'ENT Specialist',
    icon: 'ear',
    description: 'Ear, nose and throat',
    doctorCount: 12,
    commonConditions: ['Ear Infection', 'Sinusitis', 'Tonsillitis', 'Hearing Loss'],
    isActive: true,
  },
  {
    specialtyId: 'spec-8',
    name: 'Neurologist',
    icon: 'brain',
    description: 'Brain and nervous system',
    doctorCount: 10,
    commonConditions: ['Migraine', 'Epilepsy', 'Stroke', 'Neuropathy'],
    isActive: true,
  },
];

// ── Dummy Clinics ───────────────────────────

const dummyClinics: Clinic[] = [
  {
    clinicId: 'clinic-1',
    doctorId: 'doc-1',
    name: 'City Medical Center',
    address: '123 Main Street, Blue Area',
    city: 'Islamabad',
    coordinates: { lat: 33.7294, lng: 73.0931 },
    phone: '+92-51-1234567',
    timings: [
      { day: 'Monday', openTime: '09:00', closeTime: '17:00', isOpen: true },
      { day: 'Tuesday', openTime: '09:00', closeTime: '17:00', isOpen: true },
      { day: 'Wednesday', openTime: '09:00', closeTime: '17:00', isOpen: true },
      { day: 'Thursday', openTime: '09:00', closeTime: '17:00', isOpen: true },
      { day: 'Friday', openTime: '09:00', closeTime: '13:00', isOpen: true },
      { day: 'Saturday', openTime: '10:00', closeTime: '14:00', isOpen: true },
      { day: 'Sunday', openTime: '00:00', closeTime: '00:00', isOpen: false },
    ],
    images: [],
    amenities: ['Parking', 'Wheelchair Access', 'Pharmacy', 'Lab'],
  },
  {
    clinicId: 'clinic-2',
    doctorId: 'doc-2',
    name: 'Heart Care Clinic',
    address: '45 F-8 Markaz',
    city: 'Islamabad',
    coordinates: { lat: 33.7100, lng: 73.0479 },
    phone: '+92-51-7654321',
    timings: [
      { day: 'Monday', openTime: '10:00', closeTime: '18:00', isOpen: true },
      { day: 'Tuesday', openTime: '10:00', closeTime: '18:00', isOpen: true },
      { day: 'Wednesday', openTime: '10:00', closeTime: '18:00', isOpen: true },
      { day: 'Thursday', openTime: '10:00', closeTime: '18:00', isOpen: true },
      { day: 'Friday', openTime: '10:00', closeTime: '15:00', isOpen: true },
      { day: 'Saturday', openTime: '00:00', closeTime: '00:00', isOpen: false },
      { day: 'Sunday', openTime: '00:00', closeTime: '00:00', isOpen: false },
    ],
    images: [],
    amenities: ['Parking', 'ECG', 'Echo Lab', 'Pharmacy'],
  },
];

// ── Dummy Doctors ───────────────────────────

export const dummyDoctors: Doctor[] = [
  {
    doctorId: 'doc-1',
    userId: 'user-doc-1',
    pmcNumber: 'PMC-12345',
    specialtyId: 'spec-1',
    subspecialties: ['Internal Medicine', 'Diabetology'],
    qualifications: ['MBBS', 'FCPS Medicine'],
    experience: 15,
    bio: 'Dr. Ahmed Khan is a highly experienced general physician with over 15 years of practice in primary care and internal medicine.',
    profileImage: '',
    clinics: [dummyClinics[0]],
    consultationFee: 2000,
    videoConsultationFee: 1500,
    rating: 4.8,
    totalReviews: 245,
    totalPatients: 3200,
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'verified',
    languages: ['English', 'Urdu'],
    awards: ['Best GP Award 2022'],
    publications: [],
    createdAt: '2023-01-15T00:00:00.000Z',
  },
  {
    doctorId: 'doc-2',
    userId: 'user-doc-2',
    pmcNumber: 'PMC-23456',
    specialtyId: 'spec-2',
    subspecialties: ['Interventional Cardiology'],
    qualifications: ['MBBS', 'FCPS Cardiology', 'Fellowship (UK)'],
    experience: 20,
    bio: 'Dr. Sara Ali is a renowned cardiologist specializing in interventional cardiology with international training.',
    profileImage: '',
    clinics: [dummyClinics[1]],
    consultationFee: 3500,
    videoConsultationFee: 3000,
    rating: 4.9,
    totalReviews: 180,
    totalPatients: 5000,
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'verified',
    languages: ['English', 'Urdu', 'Punjabi'],
    awards: ['Top Cardiologist 2023', 'Excellence in Medicine 2021'],
    publications: ['Cardiac Interventions in Pakistan - PMJ 2022'],
    createdAt: '2022-06-10T00:00:00.000Z',
  },
  {
    doctorId: 'doc-3',
    userId: 'user-doc-3',
    pmcNumber: 'PMC-34567',
    specialtyId: 'spec-3',
    subspecialties: ['Cosmetic Dermatology'],
    qualifications: ['MBBS', 'FCPS Dermatology'],
    experience: 10,
    bio: 'Dr. Fatima Zahra specializes in skin conditions and cosmetic dermatology, helping patients achieve healthy skin.',
    profileImage: '',
    clinics: [],
    consultationFee: 2500,
    videoConsultationFee: 2000,
    rating: 4.7,
    totalReviews: 312,
    totalPatients: 4100,
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'verified',
    languages: ['English', 'Urdu'],
    awards: [],
    publications: [],
    createdAt: '2023-03-20T00:00:00.000Z',
  },
  {
    doctorId: 'doc-4',
    userId: 'user-doc-4',
    pmcNumber: 'PMC-45678',
    specialtyId: 'spec-6',
    subspecialties: ['Neonatology'],
    qualifications: ['MBBS', 'FCPS Pediatrics'],
    experience: 12,
    bio: 'Dr. Usman Tariq is a compassionate pediatrician dedicated to child healthcare and developmental medicine.',
    profileImage: '',
    clinics: [],
    consultationFee: 1800,
    videoConsultationFee: 1200,
    rating: 4.6,
    totalReviews: 198,
    totalPatients: 2800,
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'verified',
    languages: ['English', 'Urdu', 'Pashto'],
    awards: ['Pediatric Excellence Award 2023'],
    publications: [],
    createdAt: '2023-05-01T00:00:00.000Z',
  },
  {
    doctorId: 'doc-5',
    userId: 'user-doc-5',
    pmcNumber: 'PMC-56789',
    specialtyId: 'spec-4',
    subspecialties: ['Sports Medicine', 'Spine Surgery'],
    qualifications: ['MBBS', 'MS Orthopedics'],
    experience: 18,
    bio: 'Dr. Hassan Raza is an experienced orthopedic surgeon with expertise in sports injuries and spine conditions.',
    profileImage: '',
    clinics: [],
    consultationFee: 3000,
    videoConsultationFee: 2500,
    rating: 4.5,
    totalReviews: 150,
    totalPatients: 2200,
    isAvailable: false,
    isVerified: true,
    verificationStatus: 'verified',
    languages: ['English', 'Urdu'],
    awards: [],
    publications: ['Advances in Spine Surgery - JPOA 2021'],
    createdAt: '2022-11-15T00:00:00.000Z',
  },
];

// ── Dummy Time Slots ────────────────────────

export const dummyTimeSlots: TimeSlot[] = [
  { slotId: 'slot-1', doctorId: 'doc-1', clinicId: 'clinic-1', date: '2026-03-20', startTime: '09:00', endTime: '09:30', isAvailable: true, appointmentType: 'both', maxPatients: 1, bookedCount: 0 },
  { slotId: 'slot-2', doctorId: 'doc-1', clinicId: 'clinic-1', date: '2026-03-20', startTime: '09:30', endTime: '10:00', isAvailable: true, appointmentType: 'both', maxPatients: 1, bookedCount: 0 },
  { slotId: 'slot-3', doctorId: 'doc-1', clinicId: 'clinic-1', date: '2026-03-20', startTime: '10:00', endTime: '10:30', isAvailable: false, appointmentType: 'in-clinic', maxPatients: 1, bookedCount: 1 },
  { slotId: 'slot-4', doctorId: 'doc-1', clinicId: 'clinic-1', date: '2026-03-20', startTime: '10:30', endTime: '11:00', isAvailable: true, appointmentType: 'both', maxPatients: 1, bookedCount: 0 },
  { slotId: 'slot-5', doctorId: 'doc-1', clinicId: 'clinic-1', date: '2026-03-20', startTime: '11:00', endTime: '11:30', isAvailable: true, appointmentType: 'video', maxPatients: 1, bookedCount: 0 },
  { slotId: 'slot-6', doctorId: 'doc-2', clinicId: 'clinic-2', date: '2026-03-20', startTime: '10:00', endTime: '10:30', isAvailable: true, appointmentType: 'both', maxPatients: 1, bookedCount: 0 },
  { slotId: 'slot-7', doctorId: 'doc-2', clinicId: 'clinic-2', date: '2026-03-20', startTime: '10:30', endTime: '11:00', isAvailable: true, appointmentType: 'in-clinic', maxPatients: 1, bookedCount: 0 },
  { slotId: 'slot-8', doctorId: 'doc-2', clinicId: 'clinic-2', date: '2026-03-20', startTime: '11:00', endTime: '11:30', isAvailable: false, appointmentType: 'both', maxPatients: 1, bookedCount: 1 },
];

// ── Dummy Appointments ──────────────────────

export const dummyAppointments: Appointment[] = [
  {
    appointmentId: 'apt-1',
    patientId: 'patient-1',
    doctorId: 'doc-1',
    clinicId: 'clinic-1',
    type: 'in-clinic',
    date: '2026-03-20',
    timeSlot: { start: '09:00', end: '09:30' },
    status: 'confirmed',
    symptoms: 'Persistent fever and headache for 3 days',
    notes: '',
    payment: { paymentId: 'pay-1', amount: 2000, method: 'cash', status: 'pending' },
    createdAt: '2026-03-18T10:00:00.000Z',
  },
  {
    appointmentId: 'apt-2',
    patientId: 'patient-1',
    doctorId: 'doc-2',
    clinicId: 'clinic-2',
    type: 'video',
    date: '2026-03-22',
    timeSlot: { start: '10:00', end: '10:30' },
    status: 'pending',
    symptoms: 'Chest discomfort during exercise',
    payment: { paymentId: 'pay-2', amount: 3000, method: 'online', status: 'completed', transactionId: 'txn-9876', paidAt: '2026-03-19T14:00:00.000Z' },
    createdAt: '2026-03-19T14:00:00.000Z',
  },
  {
    appointmentId: 'apt-3',
    patientId: 'patient-1',
    doctorId: 'doc-3',
    type: 'video',
    date: '2026-03-15',
    timeSlot: { start: '14:00', end: '14:30' },
    status: 'completed',
    symptoms: 'Acne treatment follow-up',
    prescription: {
      prescriptionId: 'presc-1',
      appointmentId: 'apt-3',
      doctorId: 'doc-3',
      patientId: 'patient-1',
      diagnosis: 'Moderate Acne Vulgaris',
      medications: [
        { name: 'Adapalene Gel 0.1%', dosage: 'Pea-sized amount', frequency: 'Once daily at night', duration: '3 months', instructions: 'Apply on clean, dry face. Avoid sun exposure.' },
        { name: 'Benzoyl Peroxide 2.5%', dosage: 'Thin layer', frequency: 'Once daily in morning', duration: '3 months', instructions: 'Use with sunscreen SPF 50+' },
      ],
      tests: [],
      advice: 'Avoid oily foods. Use oil-free moisturizer. Follow up in 6 weeks.',
      followUpDate: '2026-04-26',
      signature: 'Dr. Fatima Zahra',
      createdAt: '2026-03-15T14:30:00.000Z',
    },
    payment: { paymentId: 'pay-3', amount: 2000, method: 'card', status: 'completed', transactionId: 'txn-5432', paidAt: '2026-03-15T13:50:00.000Z' },
    createdAt: '2026-03-14T09:00:00.000Z',
  },
];

// ── Dummy Reviews ───────────────────────────

export const dummyReviews: DoctorReview[] = [
  {
    reviewId: 'rev-1',
    doctorId: 'doc-1',
    patientId: 'patient-2',
    appointmentId: 'apt-old-1',
    rating: 5,
    comment: 'Excellent doctor! Very thorough and caring. Explained everything clearly.',
    isAnonymous: false,
    createdAt: '2026-03-10T00:00:00.000Z',
    response: { text: 'Thank you for your kind words! Wishing you good health.', respondedAt: '2026-03-11T00:00:00.000Z' },
  },
  {
    reviewId: 'rev-2',
    doctorId: 'doc-1',
    patientId: 'patient-3',
    appointmentId: 'apt-old-2',
    rating: 4,
    comment: 'Good experience overall. Wait time was a bit long but the consultation was great.',
    isAnonymous: true,
    createdAt: '2026-03-08T00:00:00.000Z',
  },
  {
    reviewId: 'rev-3',
    doctorId: 'doc-2',
    patientId: 'patient-1',
    appointmentId: 'apt-old-3',
    rating: 5,
    comment: 'Best cardiologist in Islamabad. Very professional and knowledgeable.',
    isAnonymous: false,
    createdAt: '2026-03-05T00:00:00.000Z',
  },
];

// ── Dummy Medical Records ───────────────────

export const dummyMedicalRecords: MedicalRecord[] = [
  {
    recordId: 'rec-1',
    patientId: 'patient-1',
    type: 'report',
    title: 'Complete Blood Count',
    description: 'Routine CBC test results',
    fileUrl: '',
    uploadedAt: '2026-03-10T00:00:00.000Z',
    linkedAppointmentId: 'apt-old-1',
  },
  {
    recordId: 'rec-2',
    patientId: 'patient-1',
    type: 'prescription',
    title: 'Acne Treatment Prescription',
    description: 'Prescription from Dr. Fatima Zahra',
    fileUrl: '',
    uploadedAt: '2026-03-15T00:00:00.000Z',
    linkedAppointmentId: 'apt-3',
  },
  {
    recordId: 'rec-3',
    patientId: 'patient-1',
    type: 'imaging',
    title: 'Chest X-Ray',
    description: 'Pre-appointment chest X-ray',
    fileUrl: '',
    uploadedAt: '2026-03-01T00:00:00.000Z',
  },
];

// ── Dummy Doctor Dashboard ──────────────────

export const dummyDashboardData: DoctorDashboardData = {
  doctorName: 'Dr. Ahmed Khan',
  todayStats: {
    totalAppointments: 12,
    patientsSeen: 7,
    pending: 4,
    cancelled: 1,
  },
  upcomingAppointments: [
    {
      appointmentId: 'apt-101', patientId: 'pat-010', doctorId: 'doc-001', clinicId: 'cli-001',
      type: 'in-clinic', date: '2026-03-19', timeSlot: { start: '14:00', end: '14:30' },
      status: 'confirmed', symptoms: 'Persistent cough, mild fever',
      payment: { paymentId: 'pay-101', amount: 2000, method: 'cash', status: 'pending' },
      createdAt: '2026-03-18T09:00:00Z',
    },
    {
      appointmentId: 'apt-102', patientId: 'pat-011', doctorId: 'doc-001',
      type: 'video', date: '2026-03-19', timeSlot: { start: '15:00', end: '15:30' },
      status: 'confirmed', symptoms: 'Skin rash on arms',
      payment: { paymentId: 'pay-102', amount: 1500, method: 'online', status: 'completed' },
      createdAt: '2026-03-17T14:00:00Z',
    },
    {
      appointmentId: 'apt-103', patientId: 'pat-012', doctorId: 'doc-001', clinicId: 'cli-001',
      type: 'in-clinic', date: '2026-03-19', timeSlot: { start: '16:00', end: '16:30' },
      status: 'pending',
      payment: { paymentId: 'pay-103', amount: 2000, method: 'card', status: 'pending' },
      createdAt: '2026-03-18T18:00:00Z',
    },
    {
      appointmentId: 'apt-104', patientId: 'pat-013', doctorId: 'doc-001',
      type: 'video', date: '2026-03-19', timeSlot: { start: '17:00', end: '17:30' },
      status: 'confirmed',
      payment: { paymentId: 'pay-104', amount: 1500, method: 'online', status: 'completed' },
      createdAt: '2026-03-19T06:00:00Z',
    },
  ],
  earnings: { today: 8500, thisWeek: 42000, thisMonth: 168000, currency: 'PKR' },
};

// ── Dummy Earning Transactions ──────────────

export const dummyEarningTransactions: EarningTransaction[] = [
  { transactionId: 'txn-001', patientName: 'Ali Hassan', appointmentId: 'apt-101', type: 'in-clinic', amount: 2000, method: 'cash', status: 'completed', date: '2026-03-19T14:30:00Z' },
  { transactionId: 'txn-002', patientName: 'Sara Ahmed', appointmentId: 'apt-102', type: 'video', amount: 1500, method: 'online', status: 'completed', date: '2026-03-19T11:00:00Z' },
  { transactionId: 'txn-003', patientName: 'Usman Malik', appointmentId: 'apt-103', type: 'in-clinic', amount: 2000, method: 'card', status: 'pending', date: '2026-03-18T16:00:00Z' },
  { transactionId: 'txn-004', patientName: 'Fatima Noor', appointmentId: 'apt-104', type: 'video', amount: 1500, method: 'online', status: 'completed', date: '2026-03-18T10:00:00Z' },
  { transactionId: 'txn-005', patientName: 'Kamran Shah', appointmentId: 'apt-105', type: 'in-clinic', amount: 2000, method: 'cash', status: 'completed', date: '2026-03-17T15:30:00Z' },
  { transactionId: 'txn-006', patientName: 'Ayesha Khan', appointmentId: 'apt-106', type: 'video', amount: 1500, method: 'online', status: 'refunded', date: '2026-03-16T09:00:00Z' },
  { transactionId: 'txn-007', patientName: 'Bilal Iqbal', appointmentId: 'apt-107', type: 'in-clinic', amount: 2000, method: 'card', status: 'completed', date: '2026-03-15T13:00:00Z' },
  { transactionId: 'txn-008', patientName: 'Zainab Raza', appointmentId: 'apt-108', type: 'in-clinic', amount: 2000, method: 'cash', status: 'completed', date: '2026-03-14T17:00:00Z' },
];

export const dummyEarningsChartData: Record<PeriodFilter, ChartDataPoint[]> = {
  today: [{ label: '9 AM', value: 2000 }, { label: '11 AM', value: 1500 }, { label: '2 PM', value: 2000 }],
  thisWeek: [
    { label: 'Mon', value: 6000 }, { label: 'Tue', value: 5500 }, { label: 'Wed', value: 7000 },
    { label: 'Thu', value: 4000 }, { label: 'Fri', value: 8500 }, { label: 'Sat', value: 6500 }, { label: 'Sun', value: 4500 },
  ],
  thisMonth: [{ label: 'Wk 1', value: 32000 }, { label: 'Wk 2', value: 38000 }, { label: 'Wk 3', value: 42000 }, { label: 'Wk 4', value: 28000 }],
  custom: [],
};

export const dummyEarningsBreakdown: ConsultationBreakdown[] = [
  { type: 'in-clinic', count: 65, total: 130000, percentage: 68 },
  { type: 'video', count: 42, total: 63000, percentage: 32 },
];

export const dummyEarningsTotals: Record<PeriodFilter, number> = {
  today: 5500, thisWeek: 42000, thisMonth: 168000, custom: 0,
};

// ── Dummy Schedule Appointments ─────────────

export function generateDummyScheduleAppointments(): Appointment[] {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i - 1);
    return d.toISOString().split('T')[0];
  });
  return [
    { appointmentId: 'sch-001', patientId: 'p-001', doctorId: 'doc-001', clinicId: 'cli-001', type: 'in-clinic', date: dates[0], timeSlot: { start: '09:00', end: '09:30' }, status: 'completed', symptoms: 'Fever and cold', payment: { paymentId: 'pay-001', amount: 2000, method: 'cash', status: 'completed' }, createdAt: dates[0] },
    { appointmentId: 'sch-002', patientId: 'p-002', doctorId: 'doc-001', type: 'video', date: dates[1], timeSlot: { start: '09:00', end: '09:30' }, status: 'confirmed', symptoms: 'Skin rash', payment: { paymentId: 'pay-002', amount: 1500, method: 'online', status: 'completed' }, createdAt: dates[1] },
    { appointmentId: 'sch-003', patientId: 'p-003', doctorId: 'doc-001', clinicId: 'cli-001', type: 'in-clinic', date: dates[1], timeSlot: { start: '10:00', end: '10:30' }, status: 'confirmed', symptoms: 'Back pain', payment: { paymentId: 'pay-003', amount: 2000, method: 'card', status: 'completed' }, createdAt: dates[1] },
    { appointmentId: 'sch-004', patientId: 'p-004', doctorId: 'doc-001', type: 'video', date: dates[1], timeSlot: { start: '11:30', end: '12:00' }, status: 'pending', symptoms: 'Follow-up consultation', payment: { paymentId: 'pay-004', amount: 1500, method: 'online', status: 'pending' }, createdAt: dates[1] },
    { appointmentId: 'sch-005', patientId: 'p-005', doctorId: 'doc-001', clinicId: 'cli-001', type: 'in-clinic', date: dates[1], timeSlot: { start: '14:00', end: '14:30' }, status: 'confirmed', symptoms: 'Headache', payment: { paymentId: 'pay-005', amount: 2000, method: 'cash', status: 'completed' }, createdAt: dates[1] },
    { appointmentId: 'sch-006', patientId: 'p-006', doctorId: 'doc-001', type: 'video', date: dates[2], timeSlot: { start: '09:30', end: '10:00' }, status: 'confirmed', symptoms: 'Anxiety', payment: { paymentId: 'pay-006', amount: 1500, method: 'online', status: 'completed' }, createdAt: dates[2] },
    { appointmentId: 'sch-007', patientId: 'p-007', doctorId: 'doc-001', clinicId: 'cli-001', type: 'in-clinic', date: dates[2], timeSlot: { start: '11:00', end: '11:30' }, status: 'pending', symptoms: 'Chest pain', payment: { paymentId: 'pay-007', amount: 2000, method: 'card', status: 'pending' }, createdAt: dates[2] },
    { appointmentId: 'sch-008', patientId: 'p-008', doctorId: 'doc-001', clinicId: 'cli-001', type: 'in-clinic', date: dates[3], timeSlot: { start: '10:00', end: '10:30' }, status: 'confirmed', symptoms: 'Diabetes follow-up', payment: { paymentId: 'pay-008', amount: 2000, method: 'cash', status: 'completed' }, createdAt: dates[3] },
    { appointmentId: 'sch-009', patientId: 'p-009', doctorId: 'doc-001', type: 'video', date: dates[3], timeSlot: { start: '15:00', end: '15:30' }, status: 'confirmed', payment: { paymentId: 'pay-009', amount: 1500, method: 'online', status: 'completed' }, createdAt: dates[3] },
    { appointmentId: 'sch-010', patientId: 'p-010', doctorId: 'doc-001', clinicId: 'cli-001', type: 'in-clinic', date: dates[4], timeSlot: { start: '09:00', end: '09:30' }, status: 'pending', symptoms: 'Allergy', payment: { paymentId: 'pay-010', amount: 2000, method: 'cash', status: 'pending' }, createdAt: dates[4] },
  ];
}

// ── Dummy Patient Queue ─────────────────────

export function generateDummyQueue(): QueuePatient[] {
  const todayISO = new Date().toISOString().split('T')[0];
  return [
    { queueId: 'q-001', patientId: 'p-001', patientName: 'Ali Hassan', age: 34, gender: 'Male', appointmentId: 'apt-201', type: 'in-clinic', timeSlot: { start: '09:00', end: '09:30' }, symptoms: 'Persistent headache, dizziness', status: 'completed', tokenNumber: 1, estimatedWaitMinutes: 0, checkedInAt: `${todayISO}T08:45:00Z`, startedAt: `${todayISO}T09:02:00Z`, completedAt: `${todayISO}T09:24:00Z`, history: [{ date: '2026-02-10', diagnosis: 'Migraine', type: 'in-clinic' }, { date: '2025-11-05', diagnosis: 'Hypertension follow-up', type: 'video' }] },
    { queueId: 'q-002', patientId: 'p-002', patientName: 'Sara Ahmed', age: 28, gender: 'Female', appointmentId: 'apt-202', type: 'in-clinic', timeSlot: { start: '09:30', end: '10:00' }, symptoms: 'Skin rash on arms', status: 'in-progress', tokenNumber: 2, estimatedWaitMinutes: 0, checkedInAt: `${todayISO}T09:15:00Z`, startedAt: `${todayISO}T09:28:00Z`, history: [{ date: '2026-01-20', diagnosis: 'Eczema', type: 'in-clinic' }] },
    { queueId: 'q-003', patientId: 'p-003', patientName: 'Usman Malik', age: 45, gender: 'Male', appointmentId: 'apt-203', type: 'video', timeSlot: { start: '10:00', end: '10:30' }, symptoms: 'Follow-up for diabetes management', status: 'waiting', tokenNumber: 3, estimatedWaitMinutes: 12, checkedInAt: `${todayISO}T09:50:00Z`, history: [{ date: '2026-03-05', diagnosis: 'Type 2 Diabetes', type: 'in-clinic' }, { date: '2026-01-15', diagnosis: 'Diabetes check-up', type: 'video' }, { date: '2025-10-22', diagnosis: 'HbA1c review', type: 'in-clinic' }] },
    { queueId: 'q-004', patientId: 'p-004', patientName: 'Fatima Noor', age: 22, gender: 'Female', appointmentId: 'apt-204', type: 'in-clinic', timeSlot: { start: '10:30', end: '11:00' }, symptoms: 'Sore throat and fever', status: 'waiting', tokenNumber: 4, estimatedWaitMinutes: 25, checkedInAt: `${todayISO}T10:10:00Z`, history: [] },
    { queueId: 'q-005', patientId: 'p-005', patientName: 'Kamran Shah', age: 55, gender: 'Male', appointmentId: 'apt-205', type: 'in-clinic', timeSlot: { start: '11:00', end: '11:30' }, symptoms: 'Chest tightness, shortness of breath', status: 'waiting', tokenNumber: 5, estimatedWaitMinutes: 40, history: [{ date: '2026-02-28', diagnosis: 'Angina evaluation', type: 'in-clinic' }] },
    { queueId: 'q-006', patientId: 'p-006', patientName: 'Ayesha Khan', age: 31, gender: 'Female', appointmentId: 'apt-206', type: 'video', timeSlot: { start: '11:30', end: '12:00' }, symptoms: 'Anxiety and insomnia', status: 'waiting', tokenNumber: 6, estimatedWaitMinutes: 55, history: [{ date: '2026-03-01', diagnosis: 'Generalized anxiety', type: 'video' }] },
  ];
}

// ── Dummy Manage Slots Clinics ──────────────

export const dummyManageSlotsClinics: Clinic[] = [
  {
    clinicId: 'cli-001', doctorId: 'doc-001', name: 'City Medical Center', address: 'F-8 Markaz, Islamabad', city: 'Islamabad',
    coordinates: { lat: 33.7104, lng: 73.0488 }, phone: '+92-51-1234567',
    timings: [
      { day: 'Monday', openTime: '09:00', closeTime: '17:00', isOpen: true }, { day: 'Tuesday', openTime: '09:00', closeTime: '17:00', isOpen: true },
      { day: 'Wednesday', openTime: '09:00', closeTime: '17:00', isOpen: true }, { day: 'Thursday', openTime: '09:00', closeTime: '17:00', isOpen: true },
      { day: 'Friday', openTime: '09:00', closeTime: '14:00', isOpen: true }, { day: 'Saturday', openTime: '10:00', closeTime: '14:00', isOpen: true },
      { day: 'Sunday', openTime: '00:00', closeTime: '00:00', isOpen: false },
    ],
    images: [], amenities: ['Parking', 'Wheelchair Access', 'Pharmacy'],
  },
  {
    clinicId: 'cli-002', doctorId: 'doc-001', name: 'Green Valley Hospital', address: 'G-9, Islamabad', city: 'Islamabad',
    coordinates: { lat: 33.6938, lng: 73.0351 }, phone: '+92-51-7654321',
    timings: [
      { day: 'Monday', openTime: '14:00', closeTime: '20:00', isOpen: true }, { day: 'Tuesday', openTime: '14:00', closeTime: '20:00', isOpen: true },
      { day: 'Wednesday', openTime: '14:00', closeTime: '20:00', isOpen: true }, { day: 'Thursday', openTime: '14:00', closeTime: '20:00', isOpen: true },
      { day: 'Friday', openTime: '00:00', closeTime: '00:00', isOpen: false }, { day: 'Saturday', openTime: '10:00', closeTime: '16:00', isOpen: true },
      { day: 'Sunday', openTime: '00:00', closeTime: '00:00', isOpen: false },
    ],
    images: [], amenities: ['Parking', 'Lab'],
  },
];

export function generateDummySlots(clinicId: string, date: string, duration: number, maxPatients: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startHour = 9;
  const endHour = 17;
  let slotIndex = 0;
  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += duration) {
      if (hour === endHour - 1 && min + duration > 60) break;
      const startTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const endMin = min + duration;
      const endH = hour + Math.floor(endMin / 60);
      const endM = endMin % 60;
      if (endH > endHour || (endH === endHour && endM > 0)) break;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      const bookedCount = slotIndex % 5 === 0 ? 1 : 0;
      slots.push({
        slotId: `slot-${clinicId}-${date}-${slotIndex}`,
        doctorId: 'doc-001', clinicId, date, startTime, endTime,
        isAvailable: slotIndex % 7 !== 3,
        appointmentType: 'both', maxPatients, bookedCount,
      });
      slotIndex++;
    }
  }
  return slots;
}

// ── Dummy Availability Settings ─────────────

export const dummyWeeklySchedule: DaySchedule[] = [
  { day: 'Monday', isWorking: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Tuesday', isWorking: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Wednesday', isWorking: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Thursday', isWorking: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Friday', isWorking: true, startTime: '09:00', endTime: '14:00' },
  { day: 'Saturday', isWorking: true, startTime: '10:00', endTime: '14:00' },
  { day: 'Sunday', isWorking: false, startTime: '00:00', endTime: '00:00' },
];

export const dummyVacationDates: VacationDate[] = [
  { id: 'vac-001', startDate: '2026-04-10', endDate: '2026-04-12', reason: 'Family event' },
  { id: 'vac-002', startDate: '2026-05-01', endDate: '2026-05-01', reason: 'Public holiday' },
];

// ── Dummy Medical Notes ─────────────────────

export const dummyNotePatient: NotePatient = {
  patientId: 'pat-001', patientName: 'Ahmed Khan', age: 34, gender: 'Male',
  bloodGroup: 'B+', allergies: ['Penicillin', 'Sulfa drugs'], chronicConditions: ['Hypertension'],
};

export const dummyMedicalNotes: MedicalNote[] = [
  {
    noteId: 'note-001', appointmentId: 'apt-001', date: '2026-03-15', title: 'Follow-up: Hypertension',
    content: 'Patient reports improved BP readings at home (avg 130/85). Compliant with medications. No side effects reported. Continue current regimen. Advised dietary salt restriction and 30-min walk daily.',
    attachments: [{ id: 'att-001', name: 'BP_Chart_Mar.pdf', type: 'file', uri: '', size: 245000 }],
    tags: ['Hypertension', 'Follow-up'], createdAt: '2026-03-15T10:30:00Z', updatedAt: '2026-03-15T10:30:00Z',
  },
  {
    noteId: 'note-002', appointmentId: 'apt-002', date: '2026-02-20', title: 'Initial Consultation',
    content: 'Patient presented with persistent headaches for 2 weeks. Vitals: BP 145/92, HR 78. Diagnosed Stage 1 Hypertension. Started on Amlodipine 5mg OD. Ordered CBC, LFT, RFT, Lipid profile.',
    attachments: [], tags: ['New Patient', 'Hypertension'], createdAt: '2026-02-20T11:15:00Z', updatedAt: '2026-02-20T11:15:00Z',
  },
  {
    noteId: 'note-003', appointmentId: 'apt-003', date: '2026-01-10', title: 'Lab Results Review',
    content: 'Reviewed lab results: CBC normal, LFT normal, Creatinine 1.0. LDL slightly elevated at 142. Advised lifestyle modification before starting statins. Recheck in 3 months.',
    attachments: [
      { id: 'att-002', name: 'Lab_Report_Jan.pdf', type: 'file', uri: '', size: 183000 },
      { id: 'att-003', name: 'ECG_Jan.jpg', type: 'image', uri: '', size: 520000 },
    ],
    tags: ['Lab Review', 'Lipids'], createdAt: '2026-01-10T09:45:00Z', updatedAt: '2026-01-10T10:00:00Z',
  },
];

// ── Dummy Prescription Detail ───────────────

export const dummyPrescriptionDetail: PrescriptionDetail = {
  prescriptionId: 'rx-001', appointmentId: 'apt-001',
  doctor: { doctorId: 'doc-001', name: 'Dr. Ahmed Khan', specialty: 'General Physician', profileImage: '', qualifications: ['MBBS', 'FCPS'] },
  patient: { patientId: 'pat-001', name: 'Ali Hassan', age: 32, gender: 'Male' },
  diagnosis: 'Acute upper respiratory tract infection with mild fever',
  medications: [
    { name: 'Amoxicillin 500mg', dosage: '1 tablet', frequency: '3 times a day', duration: '7 days', instructions: 'Take after meals' },
    { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Every 6 hours', duration: '3 days', instructions: 'Take as needed for fever' },
    { name: 'Cetirizine 10mg', dosage: '1 tablet', frequency: 'Once daily', duration: '5 days', instructions: 'Take at bedtime' },
  ],
  testsRecommended: ['Complete Blood Count (CBC)', 'Chest X-Ray (PA view)'],
  specialInstructions: 'Drink plenty of fluids. Rest for at least 2 days. Avoid cold beverages. Return if fever persists beyond 3 days.',
  followUpDate: '2026-03-26', issuedAt: '2026-03-19T10:30:00Z',
};

// ── Dummy Health Records ────────────────────

export const dummyHealthRecords: MedicalRecord[] = [
  { recordId: 'rec-001', patientId: 'pat-001', type: 'prescription', title: 'General Checkup Prescription', description: 'Prescription from Dr. Ahmed Khan for respiratory infection', fileUrl: '', uploadedAt: '2026-03-18T14:30:00Z', linkedAppointmentId: 'apt-001' },
  { recordId: 'rec-002', patientId: 'pat-001', type: 'report', title: 'Complete Blood Count (CBC)', description: 'Routine blood work - all values normal', fileUrl: '', uploadedAt: '2026-03-15T09:00:00Z' },
  { recordId: 'rec-003', patientId: 'pat-001', type: 'imaging', title: 'Chest X-Ray PA View', description: 'Chest X-Ray ordered by Dr. Ahmed Khan', fileUrl: '', uploadedAt: '2026-03-12T11:15:00Z', linkedAppointmentId: 'apt-002' },
  { recordId: 'rec-004', patientId: 'pat-001', type: 'report', title: 'Lipid Profile', description: 'Cholesterol and triglycerides panel', fileUrl: '', uploadedAt: '2026-02-28T10:00:00Z' },
  { recordId: 'rec-005', patientId: 'pat-001', type: 'discharge', title: 'COVID-19 Vaccination Certificate', description: 'Pfizer-BioNTech - 2nd dose completed', fileUrl: '', uploadedAt: '2026-01-20T16:00:00Z' },
  { recordId: 'rec-006', patientId: 'pat-001', type: 'prescription', title: 'Dermatology Follow-up', description: 'Prescription from Dr. Sara Ali for skin treatment', fileUrl: '', uploadedAt: '2026-01-10T13:45:00Z' },
];

// ── Dummy Patient History ───────────────────

export const dummyPatientRecord: PatientRecord = {
  patientId: 'pat-010', patientName: 'Ahmed Raza', age: 42, gender: 'Male',
  bloodGroup: 'B+', phone: '+92 312 4567890',
  allergies: ['Penicillin', 'Dust'], chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
  visits: [
    { visitId: 'v-001', date: '2026-03-15', type: 'in-clinic', diagnosis: 'Acute bronchitis', symptoms: ['Persistent cough', 'Mild fever', 'Chest congestion'], prescriptionId: 'rx-001', notes: 'Patient advised to avoid cold exposure. Follow-up in 1 week.', followUp: '2026-03-22' },
    { visitId: 'v-002', date: '2026-02-28', type: 'video', diagnosis: 'Hypertension follow-up', symptoms: ['Headache', 'Dizziness'], prescriptionId: 'rx-002', notes: 'BP 150/95. Medication dosage adjusted. Monitor daily.' },
    { visitId: 'v-003', date: '2026-02-10', type: 'in-clinic', diagnosis: 'Routine diabetes check', symptoms: ['Fatigue', 'Increased thirst'], prescriptionId: 'rx-003', notes: 'HbA1c at 7.2%. Metformin continued. Diet counseling provided.', followUp: '2026-03-10' },
    { visitId: 'v-004', date: '2026-01-18', type: 'in-clinic', diagnosis: 'Seasonal allergic rhinitis', symptoms: ['Sneezing', 'Runny nose', 'Itchy eyes'], notes: 'Antihistamine prescribed. Avoid dust exposure.' },
    { visitId: 'v-005', date: '2025-12-05', type: 'video', diagnosis: 'Gastroesophageal reflux', symptoms: ['Heartburn', 'Acid reflux', 'Bloating'], prescriptionId: 'rx-005', notes: 'PPI prescribed for 4 weeks. Dietary modifications advised.', followUp: '2026-01-05' },
  ],
};

// ── Dummy Doctor Profile ────────────────────

export const dummyDoctorProfile: DoctorProfileData = {
  doctorId: 'doc-001', fullName: 'Dr. Ahmed Khan', email: 'dr.ahmed@metromatrix.pk', phone: '+92 321 1234567',
  specialization: 'General Physician', qualification: 'MBBS, FCPS (Medicine)', experience: 12, pmcNumber: 'PMC-54321-P',
  bio: 'Experienced general physician with over 12 years of practice in internal medicine. Specializing in chronic disease management, preventive care, and patient-centered treatment approaches.',
  clinicName: 'Khan Medical Center', clinicAddress: 'Block 7, Gulshan-e-Iqbal, Karachi',
  consultationFee: 2000, videoConsultationFee: 1500, currency: 'PKR',
  languages: ['English', 'Urdu', 'Punjabi'], rating: 4.8, totalReviews: 256, totalPatients: 1840,
  isVerified: true, isAvailable: true,
};

// ── Dummy Coupons ───────────────────────────

export const dummyCoupons: Record<string, Coupon> = {
  HEALTH20: { code: 'HEALTH20', discountPercent: 20, maxDiscount: 500, isValid: true, message: '20% off (max Rs. 500)' },
  FIRST50: { code: 'FIRST50', discountPercent: 50, maxDiscount: 1000, isValid: true, message: '50% off on first booking (max Rs. 1000)' },
};
