// ============================================
// REVIEW SERIALIZERS
// ============================================

import {
  Review,
  ReviewData,
  SubmittedReview,
} from '../../models/serviceProviders';

export function reviewSerializer(data: any): Review {
  return {
    id: data?.id || '',
    reviewerName: data?.reviewerName || data?.reviewer?.name || '',
    reviewerInitial: data?.reviewerInitial || (data?.reviewerName?.[0] || 'U'),
    rating: data?.rating || 0,
    comment: data?.comment || data?.feedback || '',
    date: data?.date || data?.createdAt || '',
    helpfulCount: data?.helpfulCount || 0,
    avatarColor: data?.avatarColor || '#4F46E5',
    tags: data?.tags || [],
    providerResponse: data?.providerResponse,
  };
}

export function reviewDataSerializer(payload: any): ReviewData {
  return {
    provider: {
      id: payload?.provider?.id || '',
      name: payload?.provider?.name || '',
      image: payload?.provider?.image || '',
      category: payload?.provider?.category || 'electricians',
    },
    serviceDetails: {
      type: payload?.serviceDetails?.type || '',
      description: payload?.serviceDetails?.description || '',
      completedAt: payload?.serviceDetails?.completedAt || '',
      amount: payload?.serviceDetails?.amount || 0,
    },
    availableTags: (payload?.availableTags || []).map((tag: any) => ({
      id: tag?.id || '',
      label: tag?.label || '',
      icon: tag?.icon || '',
    })),
  };
}

export function submittedReviewSerializer(data: any): SubmittedReview {
  return {
    id: data?.id || '',
    rating: data?.rating || 0,
    feedback: data?.feedback || '',
    tags: data?.tags || [],
    createdAt: data?.createdAt || new Date().toISOString(),
  };
}
