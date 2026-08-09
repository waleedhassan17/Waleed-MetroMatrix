import type { Specialty, Doctor, TimeSlot, Appointment } from '../../models/healthcare/types';
import { healthcareApiRequest } from './config';

export async function fetchSpecialties(): Promise<Specialty[]> {
  const res = await healthcareApiRequest<Specialty[]>('/specialties');
  return res.success ? res.data : [];
}

export async function fetchDoctors(specialtyId?: string): Promise<Doctor[]> {
  const query = specialtyId ? `?specialtyId=${encodeURIComponent(specialtyId)}` : '';
  const res = await healthcareApiRequest<Doctor[]>(`/doctors${query}`);
  return res.success ? res.data : [];
}

export async function fetchDoctorById(doctorId: string): Promise<Doctor | null> {
  const res = await healthcareApiRequest<Doctor>(`/doctors/${encodeURIComponent(doctorId)}`);
  return res.success ? res.data : null;
}

export async function fetchTimeSlots(doctorId: string, date: string): Promise<TimeSlot[]> {
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
  const res = await healthcareApiRequest<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.success ? res.data : null;
}

export async function fetchAppointments(patientId: string): Promise<Appointment[]> {
  const res = await healthcareApiRequest<Appointment[]>(
    `/appointments?patientId=${encodeURIComponent(patientId)}`
  );
  return res.success ? res.data : [];
}

export async function cancelAppointment(appointmentId: string): Promise<boolean> {
  const res = await healthcareApiRequest<{ success: boolean }>(
    `/appointments/${encodeURIComponent(appointmentId)}/cancel`,
    { method: 'POST' }
  );
  return res.success;
}
