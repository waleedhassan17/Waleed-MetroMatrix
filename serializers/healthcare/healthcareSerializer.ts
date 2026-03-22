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
} from '../../models/healthcare/types';

export function specialtySerializer(data: any): Specialty {
  return {
    specialtyId: data?.specialtyId || '',
    name: data?.name || '',
    icon: data?.icon || '',
    description: data?.description || '',
    doctorCount: data?.doctorCount || 0,
    commonConditions: data?.commonConditions || [],
    parentSpecialtyId: data?.parentSpecialtyId,
    isActive: data?.isActive ?? true,
  };
}

export function clinicTimingSerializer(data: any): ClinicTiming {
  return {
    day: data?.day || '',
    openTime: data?.openTime || '',
    closeTime: data?.closeTime || '',
    isOpen: data?.isOpen ?? false,
  };
}

export function clinicSerializer(data: any): Clinic {
  return {
    clinicId: data?.clinicId || '',
    doctorId: data?.doctorId || '',
    name: data?.name || '',
    address: data?.address || '',
    city: data?.city || '',
    coordinates: {
      lat: data?.coordinates?.lat || 0,
      lng: data?.coordinates?.lng || 0,
    },
    phone: data?.phone || '',
    timings: (data?.timings || []).map(clinicTimingSerializer),
    images: data?.images || [],
    amenities: data?.amenities || [],
  };
}

export function paymentRecordSerializer(data: any): PaymentRecord {
  return {
    paymentId: data?.paymentId || '',
    amount: data?.amount || 0,
    method: data?.method || 'cash',
    status: data?.status || 'pending',
    transactionId: data?.transactionId,
    paidAt: data?.paidAt,
  };
}

export function medicationSerializer(data: any): Medication {
  return {
    name: data?.name || '',
    dosage: data?.dosage || '',
    frequency: data?.frequency || '',
    duration: data?.duration || '',
    instructions: data?.instructions || '',
  };
}

export function prescriptionSerializer(data: any): Prescription {
  return {
    prescriptionId: data?.prescriptionId || '',
    appointmentId: data?.appointmentId || '',
    doctorId: data?.doctorId || '',
    patientId: data?.patientId || '',
    diagnosis: data?.diagnosis || '',
    medications: (data?.medications || []).map(medicationSerializer),
    tests: data?.tests || [],
    advice: data?.advice || '',
    followUpDate: data?.followUpDate,
    signature: data?.signature || '',
    createdAt: data?.createdAt || '',
  };
}

export function doctorSerializer(data: any): Doctor {
  return {
    doctorId: data?.doctorId || '',
    userId: data?.userId || '',
    pmcNumber: data?.pmcNumber || '',
    specialtyId: data?.specialtyId || '',
    subspecialties: data?.subspecialties || [],
    qualifications: data?.qualifications || [],
    experience: data?.experience || 0,
    bio: data?.bio || '',
    profileImage: data?.profileImage || '',
    clinics: (data?.clinics || []).map(clinicSerializer),
    consultationFee: data?.consultationFee || 0,
    videoConsultationFee: data?.videoConsultationFee || 0,
    rating: data?.rating || 0,
    totalReviews: data?.totalReviews || 0,
    totalPatients: data?.totalPatients || 0,
    isAvailable: data?.isAvailable ?? false,
    isVerified: data?.isVerified ?? false,
    verificationStatus: data?.verificationStatus || 'pending',
    languages: data?.languages || [],
    awards: data?.awards || [],
    publications: data?.publications || [],
    createdAt: data?.createdAt || '',
  };
}

export function appointmentSerializer(data: any): Appointment {
  return {
    appointmentId: data?.appointmentId || '',
    patientId: data?.patientId || '',
    doctorId: data?.doctorId || '',
    clinicId: data?.clinicId,
    type: data?.type || 'in-clinic',
    date: data?.date || '',
    timeSlot: {
      start: data?.timeSlot?.start || '',
      end: data?.timeSlot?.end || '',
    },
    status: data?.status || 'pending',
    symptoms: data?.symptoms,
    notes: data?.notes,
    prescription: data?.prescription ? prescriptionSerializer(data.prescription) : undefined,
    payment: paymentRecordSerializer(data?.payment || {}),
    createdAt: data?.createdAt || '',
  };
}

export function timeSlotSerializer(data: any): TimeSlot {
  return {
    slotId: data?.slotId || '',
    doctorId: data?.doctorId || '',
    clinicId: data?.clinicId,
    date: data?.date || '',
    startTime: data?.startTime || '',
    endTime: data?.endTime || '',
    isAvailable: data?.isAvailable ?? true,
    appointmentType: data?.appointmentType || 'both',
    maxPatients: data?.maxPatients || 1,
    bookedCount: data?.bookedCount || 0,
  };
}

export function reviewSerializer(data: any): DoctorReview {
  return {
    reviewId: data?.reviewId || '',
    doctorId: data?.doctorId || '',
    patientId: data?.patientId || '',
    appointmentId: data?.appointmentId || '',
    rating: data?.rating || 0,
    comment: data?.comment || '',
    isAnonymous: data?.isAnonymous ?? false,
    createdAt: data?.createdAt || '',
    response: data?.response
      ? { text: data.response.text || '', respondedAt: data.response.respondedAt || '' }
      : undefined,
  };
}

export function medicalRecordSerializer(data: any): MedicalRecord {
  return {
    recordId: data?.recordId || '',
    patientId: data?.patientId || '',
    type: data?.type || 'report',
    title: data?.title || '',
    description: data?.description || '',
    fileUrl: data?.fileUrl || '',
    uploadedAt: data?.uploadedAt || '',
    linkedAppointmentId: data?.linkedAppointmentId,
  };
}

export function videoCallSerializer(data: any): VideoCall {
  return {
    callId: data?.callId || '',
    appointmentId: data?.appointmentId || '',
    roomId: data?.roomId || '',
    status: data?.status || 'waiting',
    startedAt: data?.startedAt,
    endedAt: data?.endedAt,
    duration: data?.duration,
    recording: data?.recording,
  };
}
