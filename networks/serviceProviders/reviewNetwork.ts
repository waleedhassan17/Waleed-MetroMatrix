// ============================================
// REVIEW NETWORK APIs
// ============================================

import {
  ReviewData,
  SubmittedReview,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

export async function fetchReviewData(
  bookingId: string
): Promise<ApiResponse<ReviewData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        provider: {
          id: '1',
          name: 'John Smith',
          image: 'https://randomuser.me/api/portraits/men/1.jpg',
          category: 'electricians',
        },
        serviceDetails: {
          type: 'Electrical Repair',
          description: 'Wiring repair and inspection',
          completedAt: new Date().toISOString(),
          amount: 2500,
        },
        availableTags: [
          { id: '1', label: 'Professional', icon: 'star' },
          { id: '2', label: 'On Time', icon: 'time' },
          { id: '3', label: 'Good Value', icon: 'wallet' },
          { id: '4', label: 'Friendly', icon: 'happy' },
          { id: '5', label: 'Expert', icon: 'ribbon' },
          { id: '6', label: 'Clean Work', icon: 'sparkles' },
        ],
      },
      message: 'Review data fetched',
    };
  }

  return apiRequest<ReviewData>(`/reviews/${bookingId}/init`);
}

export async function submitReview(data: {
  bookingId: string;
  providerId: string;
  rating: number;
  feedback: string;
  tags: string[];
}): Promise<ApiResponse<SubmittedReview>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      data: {
        id: `review_${Date.now()}`,
        rating: data.rating,
        feedback: data.feedback,
        tags: data.tags,
        createdAt: new Date().toISOString(),
      },
      message: 'Review submitted successfully',
    };
  }

  return apiRequest<SubmittedReview>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
