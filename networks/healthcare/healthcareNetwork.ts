import type { Specialty, Doctor, TimeSlot, Appointment } from '../../models/healthcare/types';
import { USE_HEALTHCARE_DUMMY_DATA, healthcareApiRequest } from './config';
import { dummySpecialties, dummyDoctors, dummyTimeSlots, dummyAppointments } from './dummyData';

export async function fetchSpecialties(): Promise<Specialty[]> {
  if (USE_HEALTHCARE_DUMMY_DATA) return dummySpecialties;
  const res = await healthcareApiRequest<Specialty[]>('/specialties');
  return res.success ? res.data : [];
}

export async function fetchDoctors(specialtyId?: string): Promise<Doctor[]> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    return specialtyId
      ? dummyDoctors.filter(d => d.specialtyId === specialtyId)
      : dummyDoctors;
  }
  const query = specialtyId ? `?specialtyId=${encodeURIComponent(specialtyId)}` : '';
  const res = await healthcareApiRequest<Doctor[]>(`/doctors${query}`);
  return res.success ? res.data : [];
}

export async function fetchDoctorById(doctorId: string): Promise<Doctor | null> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    return dummyDoctors.find(d => d.doctorId === doctorId) ?? null;
  }
  const res = await healthcareApiRequest<Doctor>(`/doctors/${encodeURIComponent(doctorId)}`);
  return res.success ? res.data : null;
}

export async function fetchTimeSlots(doctorId: string, date: string): Promise<TimeSlot[]> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    return dummyTimeSlots.filter(s => s.doctorId === doctorId && s.date === date);
  }
  const res = await healthcareApiRequest<TimeSlot[]>(
    `/doctors/${encodeURIComponent(doctorId)}/slots?date=${encodeURIComponent(date)}`
  );
  return res.success ? res.data : [];
}

export async function bookAppointment(data: {
  doctorId: string;
  clinicId?: string;
  type: 'in-clinic' | 'video';
  date: string;
  timeSlot: { start: string; end: string };
  symptoms?: string;
}): Promise<Appointment | null> {
  if (USE_HEALTHCARE_DUMMY_DATA) {
    return dummyAppointments[0];
  }
  const res = await healthcareApiRequest<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.success ? res.data : null;
}

export async function fetchAppointments(patientId: string): Promise<Appointment[]> {
  if (USE_HEALTHCARE_DUMMY_DATA) return dummyAppointments;
  const res = await healthcareApiRequest<Appointment[]>(
    `/appointments?patientId=${encodeURIComponent(patientId)}`
  );
  return res.success ? res.data : [];
}

export async function cancelAppointment(appointmentId: string): Promise<boolean> {
  if (USE_HEALTHCARE_DUMMY_DATA) return true;
  const res = await healthcareApiRequest<{ success: boolean }>(
    `/appointments/${encodeURIComponent(appointmentId)}/cancel`,
    { method: 'POST' }
  );
  return res.success;
}
