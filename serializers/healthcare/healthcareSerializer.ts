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

// Helpers to normalise backend ObjectId / populated refs.
const idOf = (v: any): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.id || v._id || '';
};

// Backend pagination is { page, limit, total, pages }; the app expects this shape.
export function normalizePagination(p: any) {
  const currentPage = p?.currentPage ?? p?.page ?? 1;
  const totalPages = p?.totalPages ?? p?.pages ?? 1;
  const totalItems = p?.totalItems ?? p?.total ?? 0;
  const itemsPerPage = p?.itemsPerPage ?? p?.limit ?? 10;
  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
  };
}

export function specialtySerializer(data: any): Specialty {
  return {
    specialtyId: data?.specialtyId || data?.id || data?._id || '',
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
  const openTime = data?.openTime || data?.startTime || '';
  const closeTime = data?.closeTime || data?.endTime || '';
  return {
    day: data?.day || '',
    openTime,
    closeTime,
    isOpen: data?.isOpen ?? Boolean(openTime && closeTime),
  };
}

export function clinicSerializer(data: any): Clinic {
  // Backend stores GeoJSON location.coordinates as [lng, lat].
  const coords = data?.coordinates || (Array.isArray(data?.location?.coordinates)
    ? { lng: data.location.coordinates[0], lat: data.location.coordinates[1] }
    : undefined);
  return {
    clinicId: data?.clinicId || data?.id || data?._id || '',
    doctorId: idOf(data?.doctorId),
    name: data?.name || '',
    address: data?.address || '',
    city: data?.city || '',
    coordinates: {
      lat: coords?.lat || 0,
      lng: coords?.lng || 0,
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
  // Backend `tests` is an array of { name, instructions }; the frontend type
  // expects an array of strings.
  const tests = (data?.tests || []).map((t: any) =>
    typeof t === 'string' ? t : t?.name || ''
  );
  return {
    prescriptionId: data?.prescriptionId || data?.id || data?._id || '',
    appointmentId: idOf(data?.appointmentId),
    doctorId: idOf(data?.doctorId),
    patientId: idOf(data?.patientId),
    diagnosis: data?.diagnosis || '',
    medications: (data?.medications || []).map(medicationSerializer),
    tests,
    advice: data?.advice || '',
    followUpDate: data?.followUpDate,
    signature: data?.signature || '',
    createdAt: data?.createdAt || '',
  };
}

export function doctorSerializer(data: any): Doctor {
  const provider = typeof data?.providerId === 'object' ? data.providerId : null;
  const verificationStatus = data?.verificationStatus || 'pending';
  return {
    doctorId: data?.doctorId || data?.id || data?._id || '',
    // Doctor identity is a Provider on the backend; keep the linked id under userId.
    userId: idOf(data?.providerId) || data?.userId || '',
    name: provider?.fullName || data?.name || '',
    pmcNumber: data?.pmcNumber || '',
    specialtyId: idOf(data?.specialtyId),
    specialtyName:
      (typeof data?.specialtyId === 'object' ? data?.specialtyId?.name : '') ||
      data?.specialtyName ||
      '',
    subspecialties: data?.subspecialties || [],
    qualifications: data?.qualifications || [],
    experience: data?.experience || 0,
    bio: data?.bio || data?.about || '',
    profileImage: data?.profileImage || provider?.profilePhoto || '',
    clinics: (data?.clinics || []).map(clinicSerializer),
    consultationFee: data?.consultationFee || 0,
    videoConsultationFee: data?.videoConsultationFee || 0,
    rating: data?.rating || 0,
    totalReviews: data?.totalReviews || 0,
    totalPatients: data?.totalPatients || 0,
    isAvailable: data?.isAvailable ?? data?.availableToday ?? false,
    isVerified: data?.isVerified ?? verificationStatus === 'verified',
    verificationStatus,
    languages: data?.languages || [],
    awards: data?.awards || [],
    publications: data?.publications || [],
    availableSlots: data?.availableSlots,
    createdAt: data?.createdAt || '',
  } as Doctor;
}

export function appointmentSerializer(data: any): Appointment {
  const slot = typeof data?.slotId === 'object' ? data.slotId : null;
  const doctorObj = typeof data?.doctorId === 'object' ? data.doctorId : null;
  const clinicObj = typeof data?.clinicId === 'object' ? data.clinicId : null;
  const amount = data?.totalAmount ?? data?.fee ?? data?.payment?.amount ?? 0;
  return {
    appointmentId: data?.appointmentId || data?.id || data?._id || '',
    patientId: idOf(data?.patientId),
    doctorId: idOf(data?.doctorId),
    clinicId: idOf(data?.clinicId) || undefined,
    type: data?.type || 'in-clinic',
    date: data?.date || slot?.date || '',
    timeSlot: {
      start: data?.timeSlot?.start || slot?.startTime || '',
      end: data?.timeSlot?.end || slot?.endTime || '',
    },
    status: data?.status || 'pending',
    symptoms: data?.symptoms,
    notes: data?.notes || data?.cancellationReason,
    prescription: data?.prescription ? prescriptionSerializer(data.prescription) : undefined,
    payment: paymentRecordSerializer(
      data?.payment || { amount, method: 'cash', status: 'pending' }
    ),
    confirmationCode: data?.confirmationCode,
    confirmedAt: data?.confirmedAt,
    createdAt: data?.createdAt || '',
    // Display-only extras (populated refs) — used by detail/list screens.
    doctorName: doctorObj?.providerId?.fullName,
    doctorImage: doctorObj?.providerId?.profilePhoto,
    specialtyName: doctorObj?.specialtyId?.name,
    clinicName: clinicObj?.name,
    clinicAddress: clinicObj?.address,
    patientName:
      (typeof data?.patientId === 'object' ? data?.patientId?.fullName : '') ||
      data?.patientInfo?.name,
  } as Appointment;
}

export function timeSlotSerializer(data: any): TimeSlot {
  const bookedCount = data?.bookedCount || 0;
  const maxPatients = data?.maxPatients || 1;
  return {
    slotId: data?.slotId || data?.id || data?._id || '',
    doctorId: idOf(data?.doctorId),
    clinicId: idOf(data?.clinicId) || undefined,
    date: data?.date || '',
    startTime: data?.startTime || '',
    endTime: data?.endTime || '',
    isAvailable:
      data?.isAvailable ?? (data?.status ? data.status === 'available' : bookedCount < maxPatients),
    appointmentType: data?.appointmentType || data?.type || 'both',
    maxPatients,
    bookedCount,
  };
}

export function reviewSerializer(data: any): DoctorReview {
  // Backend may return a privacy-formatted `patient: { name, avatar }`.
  return {
    reviewId: data?.reviewId || data?.id || data?._id || '',
    doctorId: idOf(data?.doctorId),
    patientId: idOf(data?.patientId),
    appointmentId: idOf(data?.appointmentId),
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
  // Backend HealthRecord: { id, title, category, date, notes, files: [url] }
  const files = data?.files || [];
  const categoryMap: Record<string, MedicalRecord['type']> = {
    prescriptions: 'prescription',
    lab_reports: 'report',
    imaging: 'imaging',
    vaccination: 'report',
  };
  return {
    recordId: data?.recordId || data?.id || data?._id || '',
    patientId: idOf(data?.patientId) || idOf(data?.userId),
    type: data?.type || categoryMap[data?.category] || 'report',
    title: data?.title || '',
    description: data?.description || data?.notes || '',
    fileUrl: data?.fileUrl || files[0] || '',
    uploadedAt: data?.uploadedAt || data?.date || data?.createdAt || '',
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
