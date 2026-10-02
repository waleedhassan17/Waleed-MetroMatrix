// ============================================================================
// Vital signs (backend: /api/v1/healthcare/vitals, and the treating doctor's
// read-only view under /doctors/me/patients/:patientId/vitals).
// ============================================================================

import { healthcareApiRequest } from './config';

export type VitalType = 'heart_rate' | 'blood_pressure';

export interface VitalReading {
  id: string;
  type: VitalType;
  heartRate?: { bpm: number };
  bloodPressure?: { systolic: number; diastolic: number; meanArterial?: number; pulse?: number };
  source: { kind: 'ble' | 'manual'; deviceName?: string };
  measuredAt: string;
}

export interface VitalsPage {
  items: VitalReading[];
  latest: { heartRate: VitalReading | null; bloodPressure: VitalReading | null };
}

export interface NewReading {
  type: VitalType;
  bpm?: number;
  systolic?: number;
  diastolic?: number;
  meanArterial?: number;
  pulse?: number;
  measuredAt: string;
  source: { kind: 'ble' | 'manual'; deviceName?: string };
  /** Idempotency key: a retried save is not stored twice. */
  clientId: string;
}

export const fetchMyVitals = (type?: VitalType) =>
  healthcareApiRequest<VitalsPage>(`/vitals${type ? `?type=${type}` : ''}`);

export const saveVitals = (readings: NewReading[]) =>
  healthcareApiRequest<{ saved: VitalReading[]; duplicates: number; rejected: { index: number; error: string }[] }>(
    '/vitals',
    { method: 'POST', body: JSON.stringify({ readings }) }
  );

export const deleteVital = (id: string) =>
  healthcareApiRequest<void>(`/vitals/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** A treating doctor's view of one patient's readings. */
export const fetchPatientVitals = (patientId: string) =>
  healthcareApiRequest<VitalsPage>(`/doctors/me/patients/${encodeURIComponent(patientId)}/vitals`, { bestEffort: true });

/** "72 bpm" / "120/80 mmHg · pulse 64". */
export function describeVital(v: Pick<VitalReading, 'type' | 'heartRate' | 'bloodPressure'>): string {
  if (v.type === 'heart_rate' && v.heartRate) return `${v.heartRate.bpm} bpm`;
  if (v.type === 'blood_pressure' && v.bloodPressure) {
    const { systolic, diastolic, pulse } = v.bloodPressure;
    return `${Math.round(systolic)}/${Math.round(diastolic)} mmHg${pulse ? ` · pulse ${pulse}` : ''}`;
  }
  return '—';
}
