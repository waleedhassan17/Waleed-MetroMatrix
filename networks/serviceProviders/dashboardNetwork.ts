// ============================================
// DASHBOARD NETWORK APIs (Provider View)
// ============================================

import { DashboardData, ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchProviderDashboard(): Promise<ApiResponse<DashboardData>> {
    return apiRequest<DashboardData>('/provider/dashboard');
}
