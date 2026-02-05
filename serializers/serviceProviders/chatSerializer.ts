// ============================================
// CHAT SERIALIZERS
// ============================================

import { ChatMessage, ChatData } from '../../models/serviceProviders';

export function chatMessageSerializer(data: any): ChatMessage {
  return {
    id: data?.id || '',
    text: data?.text || data?.message || '',
    sender: data?.sender || 'user',
    timestamp: data?.timestamp || new Date().toISOString(),
    status: data?.status || 'sent',
  };
}

export function chatDataSerializer(payload: any): ChatData {
  return {
    bookingId: payload?.bookingId || '',
    participants: {
      user: {
        id: payload?.participants?.user?.id || '',
        name: payload?.participants?.user?.name || '',
        image: payload?.participants?.user?.image,
      },
      provider: {
        id: payload?.participants?.provider?.id || '',
        name: payload?.participants?.provider?.name || '',
        image: payload?.participants?.provider?.image,
      },
    },
    messages: (payload?.messages || []).map(chatMessageSerializer),
  };
}
