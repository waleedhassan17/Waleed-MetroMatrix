// ============================================
// JOB SERIALIZERS (Provider View)
// ============================================

import { Job, JobStats, JobDetail } from '../../models/serviceProviders';

export function jobSerializer(data: any): Job {
  return {
    id: data?.id || '',
    title: data?.title || data?.serviceType || '',
    category: data?.category || '',
    serviceType: data?.serviceType || data?.title || '',
    customer: data?.customer || data?.customerName || '',
    customerAvatar: data?.customerAvatar || data?.customerImage || '',
    customerPhone: data?.customerPhone || data?.phone || '',
    customerImage: data?.customerImage,
    location: data?.location || data?.address || '',
    city: data?.city || '',
    date: data?.date || '',
    time: data?.time || '',
    price: data?.price || data?.estimatedPrice || 0,
    status: data?.status || 'upcoming',
    coordinates: {
      latitude: data?.coordinates?.latitude || 0,
      longitude: data?.coordinates?.longitude || 0,
    },
    specialInstructions: data?.specialInstructions,
  };
}

export function jobListSerializer(payload: any): { jobs: Job[]; stats: JobStats } {
  const jobs = (payload?.jobs || payload?.data || []).map(jobSerializer);
  return {
    jobs,
    stats: {
      total: payload?.stats?.total || jobs.length,
      upcoming: payload?.stats?.upcoming || 0,
      today: payload?.stats?.today || 0,
      completed: payload?.stats?.completed || 0,
      cancelled: payload?.stats?.cancelled || 0,
    },
  };
}

export function jobDetailSerializer(data: any): JobDetail {
  const baseJob = jobSerializer(data);
  return {
    ...baseJob,
    customerName: data?.customerName || data?.customer || '',
    estimatedPrice: data?.estimatedPrice || data?.price || 0,
  };
}
