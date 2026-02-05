// ============================================
// CHAT NETWORK APIs
// ============================================

import { ChatData, ChatMessage, ApiResponse } from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

export async function fetchChatData(
  bookingId: string
): Promise<ApiResponse<ChatData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        bookingId,
        participants: {
          user: { id: 'user1', name: 'Current User', image: undefined },
          provider: { id: '1', name: 'John Smith', image: 'https://randomuser.me/api/portraits/men/1.jpg' },
        },
        messages: [
          { id: '1', text: 'Hello! I\'m on my way to your location.', sender: 'provider', timestamp: new Date(Date.now() - 10 * 60000).toISOString(), status: 'read' },
          { id: '2', text: 'Great, thank you! How long will you take?', sender: 'user', timestamp: new Date(Date.now() - 8 * 60000).toISOString(), status: 'read' },
          { id: '3', text: 'I should be there in about 15 minutes.', sender: 'provider', timestamp: new Date(Date.now() - 5 * 60000).toISOString(), status: 'read' },
        ],
      },
      message: 'Chat data fetched',
    };
  }

  return apiRequest<ChatData>(`/chat/${bookingId}`);
}

export async function sendChatMessage(data: {
  bookingId: string;
  message: string;
}): Promise<ApiResponse<ChatMessage>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      success: true,
      data: {
        id: `msg_${Date.now()}`,
        text: data.message,
        sender: 'user',
        timestamp: new Date().toISOString(),
        status: 'sent',
      },
      message: 'Message sent',
    };
  }

  return apiRequest<ChatMessage>(`/chat/${data.bookingId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: data.message }),
  });
}
