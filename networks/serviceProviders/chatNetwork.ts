// ============================================
// CHAT NETWORK APIs
// ============================================

import { ChatData, ChatMessage, ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchChatData(
  bookingId: string
): Promise<ApiResponse<ChatData>> {
    return apiRequest<ChatData>(`/chat/${bookingId}`);
}

export async function sendChatMessage(data: {
  bookingId: string;
  message: string;
}): Promise<ApiResponse<ChatMessage>> {
    return apiRequest<ChatMessage>(`/chat/${data.bookingId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: data.message }),
  });
}
