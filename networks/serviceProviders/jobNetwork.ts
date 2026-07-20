// ============================================
// JOB NETWORK APIs (Provider View)
// ============================================

import {
  Job,
  JobStats,
  JobDetail,
  AwaitingApprovalData,
  Pagination,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchProviderJobs(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ jobs: Job[]; stats: JobStats; pagination: Pagination }>> {
    const queryParams = new URLSearchParams({
    page: String(params?.page || 1),
    limit: String(params?.limit || 15),
    ...(params?.status && { status: params.status }),
  });

  return apiRequest(`/provider/jobs?${queryParams}`);
}

export async function fetchJobDetail(
  jobId: string
): Promise<ApiResponse<JobDetail>> {
    return apiRequest<JobDetail>(`/provider/jobs/${jobId}`);
}

export async function acceptJob(
  jobId: string
): Promise<ApiResponse<{ success: boolean }>> {
    return apiRequest(`/provider/jobs/${jobId}/accept`, { method: 'POST' });
}

export async function rejectJob(
  jobId: string,
  reason?: string
): Promise<ApiResponse<{ success: boolean }>> {
    return apiRequest(`/provider/jobs/${jobId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function startJob(
  jobId: string
): Promise<ApiResponse<{ success: boolean }>> {
    return apiRequest(`/provider/jobs/${jobId}/start`, { method: 'POST' });
}

export async function completeJob(data: {
  jobId: string;
  finalAmount: number;
  notes?: string;
  photos?: string[];
}): Promise<ApiResponse<{ success: boolean }>> {
    return apiRequest(`/provider/jobs/${data.jobId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function arrivedAtLocation(
  jobId: string
): Promise<ApiResponse<{ success: boolean }>> {
    return apiRequest(`/provider/jobs/${jobId}/arrived`, { method: 'POST' });
}

export async function startJobWork(jobId: string): Promise<ApiResponse<{ startTime: string }>> {
    return apiRequest(`/provider/jobs/${jobId}/start-work`, {
    method: 'POST',
  });
}

export async function completeJobWork(jobId: string): Promise<ApiResponse<{ endTime: string; duration: number }>> {
    return apiRequest(`/provider/jobs/${jobId}/complete-work`, {
    method: 'POST',
  });
}

export async function submitJobCompletion(jobId: string): Promise<ApiResponse<{ completed: boolean }>> {
    return apiRequest(`/provider/jobs/${jobId}/finalize`, {
    method: 'POST',
  });
}

export async function fetchAwaitingApprovalData(jobId: string): Promise<ApiResponse<AwaitingApprovalData>> {
    return apiRequest<AwaitingApprovalData>(`/provider/jobs/${jobId}/awaiting-approval`);
}

export async function checkJobApprovalStatus(jobId: string): Promise<ApiResponse<{ isApproved: boolean; approvalTime?: string }>> {
    return apiRequest(`/provider/jobs/${jobId}/approval-status`);
}

export interface JobInProgressData {
  jobId: string;
  serviceType: string;
  category: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  specialInstructions: string;
  estimatedPrice: number;
  coordinates: { latitude: number; longitude: number };
}

export async function fetchJobInProgressData(jobId: string): Promise<ApiResponse<JobInProgressData>> {
    return apiRequest<JobInProgressData>(`/provider/jobs/${jobId}/in-progress`);
}

export interface JobCompletionData {
  jobId: string;
  serviceType: string;
  customerName: string;
  actualDuration: number;
  earnings: number;
  paymentMethod: 'online' | 'cash';
  transactionId: string;
  stats: {
    totalJobsDone: number;
    averageRating: number;
    levelProgress: number;
  };
}

export async function fetchJobCompletionData(jobId: string): Promise<ApiResponse<JobCompletionData>> {
    return apiRequest<JobCompletionData>(`/provider/jobs/${jobId}/completion`);
}
