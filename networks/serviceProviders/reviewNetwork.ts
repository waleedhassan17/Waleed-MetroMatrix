// ============================================
// REVIEW NETWORK APIs
// ============================================

import {
  ReviewData,
  SubmittedReview,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchReviewData(
  bookingId: string
): Promise<ApiResponse<ReviewData>> {
    return apiRequest<ReviewData>(`/reviews/${bookingId}/init`);
}

export async function submitReview(data: {
  bookingId: string;
  providerId: string;
  rating: number;
  feedback: string;
  tags: string[];
}): Promise<ApiResponse<SubmittedReview>> {
    return apiRequest<SubmittedReview>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
