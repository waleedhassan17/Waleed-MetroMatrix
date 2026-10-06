// ============================================
// Healthcare Admin - Network API Functions
// ============================================
// Admin healthcare endpoints live under /api/v1/admin/* on the backend.
//
// Doctors, appointments, clinics, reviews and specialties moved to the admin
// data layer (networks/admin/healthcareApi.ts). What is left here are the
// dashboard and settings calls their screens still make.

import type { ApiResponse } from '../../models/serviceProviders/common';
import { healthcareAdminApiRequest } from './config';

export async function fetchAdminHealthcareDashboardApi(): Promise<ApiResponse<any>> {
  return healthcareAdminApiRequest<any>('/healthcare/dashboard');
}

// What the server stores and enforces. Slot length, booking horizon and
// auto-approval were editable once but read by nothing; the backend removed them.
// There is no commission: doctors are paid the full fee.
export interface HealthcareSettingsView {
  cancellationWindowHours: number;
  lateCancelRefundPercent: number;
}

export async function fetchHealthcareSettingsApi(): Promise<ApiResponse<HealthcareSettingsView>> {
  return healthcareAdminApiRequest<HealthcareSettingsView>('/healthcare/settings');
}

export async function updateHealthcareSettingsApi(
  patch: Partial<HealthcareSettingsView>
): Promise<ApiResponse<HealthcareSettingsView>> {
  return healthcareAdminApiRequest<HealthcareSettingsView>('/healthcare/settings', {
    method: 'PATCH',
    data: patch,
  });
}
