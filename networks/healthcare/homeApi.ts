// ============================================
// Health home - Network API
// ============================================

import type { HealthcareHome } from '../../models/healthcare/types';
import type { ApiResponse } from '../../models/serviceProviders/common';
import { healthcareApiRequest } from './config';
import { healthcareHomeSerializer } from '../../serializers/healthcare/homeSerializer';

/**
 * GET /v1/healthcare/home — the whole Health home in one call: the city's top
 * doctors, who is free today, specialties, concerns, banners and (signed in)
 * the patient's next visit. No city: the patient's own, else Lahore.
 */
export async function fetchHealthcareHomeApi(city?: string | null): Promise<ApiResponse<HealthcareHome>> {
  const res = await healthcareApiRequest<any>('/home', { params: city ? { city } : undefined });
  if (res.success) return { ...res, data: healthcareHomeSerializer(res.data) };
  return res as ApiResponse<HealthcareHome>;
}
