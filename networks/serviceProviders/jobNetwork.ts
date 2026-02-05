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
import { apiRequest, USE_DUMMY_DATA } from './config';

export async function fetchProviderJobs(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ jobs: Job[]; stats: JobStats; pagination: Pagination }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const allJobs: Job[] = [
      { id: '1', title: 'Wiring Repair', category: 'Electrical', serviceType: 'Electrical Repair', customer: 'Sarah M.', customerAvatar: 'https://randomuser.me/api/portraits/women/1.jpg', customerPhone: '+92 300 1111111', location: 'Gulberg III, Lahore', city: 'Lahore', date: '2024-01-20', time: '2:00 PM', price: 1500, status: 'upcoming', coordinates: { latitude: 31.5204, longitude: 74.3587 } },
      { id: '2', title: 'Switch Installation', category: 'Electrical', serviceType: 'Installation', customer: 'Ali K.', customerAvatar: 'https://randomuser.me/api/portraits/men/4.jpg', customerPhone: '+92 300 2222222', location: 'DHA Phase 5, Lahore', city: 'Lahore', date: '2024-01-20', time: '4:00 PM', price: 800, status: 'today', coordinates: { latitude: 31.4697, longitude: 74.4077 } },
      { id: '3', title: 'Full House Wiring', category: 'Electrical', serviceType: 'Full Wiring', customer: 'Maria J.', customerAvatar: 'https://randomuser.me/api/portraits/women/2.jpg', customerPhone: '+92 300 3333333', location: 'Model Town, Lahore', city: 'Lahore', date: '2024-01-19', time: '10:00 AM', price: 5000, status: 'completed', coordinates: { latitude: 31.4833, longitude: 74.3172 } },
    ];

    const filteredJobs = params?.status
      ? allJobs.filter((j) => j.status === params.status)
      : allJobs;

    return {
      success: true,
      data: {
        jobs: filteredJobs,
        stats: {
          total: allJobs.length,
          upcoming: allJobs.filter((j) => j.status === 'upcoming').length,
          today: allJobs.filter((j) => j.status === 'today').length,
          completed: allJobs.filter((j) => j.status === 'completed').length,
          cancelled: 0,
        },
        pagination: {
          currentPage: params?.page || 1,
          totalPages: 1,
          totalItems: filteredJobs.length,
          itemsPerPage: params?.limit || 15,
          hasNext: false,
          hasPrevious: false,
        },
      },
      message: 'Jobs fetched',
    };
  }

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
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        id: jobId,
        title: 'Wiring Repair',
        category: 'Electrical',
        serviceType: 'Electrical Repair',
        customer: 'Sarah M.',
        customerName: 'Sarah M.',
        customerAvatar: 'https://randomuser.me/api/portraits/women/1.jpg',
        customerPhone: '+92 300 1111111',
        location: '123 Main Street, Gulberg III, Lahore',
        city: 'Lahore',
        date: '2024-01-20',
        time: '2:00 PM',
        price: 1500,
        estimatedPrice: 1500,
        status: 'upcoming',
        coordinates: { latitude: 31.5204, longitude: 74.3587 },
        specialInstructions: 'Please bring extra wire for backup',
      },
      message: 'Job detail fetched',
    };
  }

  return apiRequest<JobDetail>(`/provider/jobs/${jobId}`);
}

export async function acceptJob(
  jobId: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, data: { success: true }, message: 'Job accepted' };
  }

  return apiRequest(`/provider/jobs/${jobId}/accept`, { method: 'POST' });
}

export async function rejectJob(
  jobId: string,
  reason?: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, data: { success: true }, message: 'Job rejected' };
  }

  return apiRequest(`/provider/jobs/${jobId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function startJob(
  jobId: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, data: { success: true }, message: 'Job started' };
  }

  return apiRequest(`/provider/jobs/${jobId}/start`, { method: 'POST' });
}

export async function completeJob(data: {
  jobId: string;
  finalAmount: number;
  notes?: string;
  photos?: string[];
}): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, data: { success: true }, message: 'Job completed' };
  }

  return apiRequest(`/provider/jobs/${data.jobId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function arrivedAtLocation(
  jobId: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { success: true, data: { success: true }, message: 'Arrival confirmed' };
  }

  return apiRequest(`/provider/jobs/${jobId}/arrived`, { method: 'POST' });
}

export async function startJobWork(jobId: string): Promise<ApiResponse<{ startTime: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { startTime: new Date().toISOString() },
      message: 'Work started',
    };
  }

  return apiRequest(`/provider/jobs/${jobId}/start-work`, {
    method: 'POST',
  });
}

export async function completeJobWork(jobId: string): Promise<ApiResponse<{ endTime: string; duration: number }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: {
        endTime: new Date().toISOString(),
        duration: 45,
      },
      message: 'Work completed',
    };
  }

  return apiRequest(`/provider/jobs/${jobId}/complete-work`, {
    method: 'POST',
  });
}

export async function submitJobCompletion(jobId: string): Promise<ApiResponse<{ completed: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: { completed: true },
      message: 'Job marked as completed',
    };
  }

  return apiRequest(`/provider/jobs/${jobId}/finalize`, {
    method: 'POST',
  });
}

export async function fetchAwaitingApprovalData(jobId: string): Promise<ApiResponse<AwaitingApprovalData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        jobId,
        serviceType: 'Electrical Repair',
        customerName: 'Ali Ahmed',
        address: '123 Main Street, Gulberg III',
        actualDuration: 45,
        estimatedPrice: 2500,
      },
      message: 'Awaiting approval data fetched',
    };
  }

  return apiRequest<AwaitingApprovalData>(`/provider/jobs/${jobId}/awaiting-approval`);
}

export async function checkJobApprovalStatus(jobId: string): Promise<ApiResponse<{ isApproved: boolean; approvalTime?: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: {
        isApproved: true,
        approvalTime: new Date().toISOString(),
      },
      message: 'Approval status fetched',
    };
  }

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
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        jobId,
        serviceType: 'Electrical Repair',
        category: 'electricians',
        customerName: 'Ali Ahmed',
        customerPhone: '+92 300 1234567',
        address: '123 Main Street, Gulberg III',
        city: 'Lahore',
        specialInstructions: 'Ring the doorbell twice. Ask for Ali.',
        estimatedPrice: 2500,
        coordinates: { latitude: 31.4504, longitude: 73.1350 },
      },
      message: 'Job in progress data fetched',
    };
  }

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
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        jobId,
        serviceType: 'Electrical Repair',
        customerName: 'Ali Ahmed',
        actualDuration: 45,
        earnings: 2500,
        paymentMethod: 'online',
        transactionId: `TXN-${Date.now()}`,
        stats: {
          totalJobsDone: 156,
          averageRating: 4.8,
          levelProgress: 85,
        },
      },
      message: 'Job completion data fetched',
    };
  }

  return apiRequest<JobCompletionData>(`/provider/jobs/${jobId}/completion`);
}
