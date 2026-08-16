// ============================================
// CHAT SERIALIZERS
// ============================================

import { ChatMessage, ChatData, ChatParticipant } from '../../models/serviceProviders';

export function chatMessageSerializer(data: any): ChatMessage {
  return {
    id: data?.id || '',
    text: data?.text || data?.message || '',
    sender: data?.sender || 'user',
    timestamp: data?.timestamp || new Date().toISOString(),
    status: data?.status || 'sent',
  };
}

function participantSerializer(p: any): ChatParticipant {
  return {
    id: p?.id || '',
    name: p?.name || '',
    image: p?.image,
    // Load-bearing: the call screen dials this. Dropping it here is what left
    // the Dial button permanently disabled.
    phoneNumber: p?.phoneNumber,
  };
}

export function chatDataSerializer(payload: any): ChatData {
  // The realtime service returns `counterpart` (vertical-neutral) and
  // `provider` (legacy alias) as the same object. Prefer whichever is present
  // so this works against either backend.
  const counterpart = payload?.participants?.counterpart || payload?.participants?.provider;

  return {
    bookingId: payload?.bookingId || payload?.roomId || '',
    roomId: payload?.roomId || payload?.bookingId || '',
    roomType: payload?.roomType || 'homeservice',
    role: payload?.role,
    participants: {
      user: participantSerializer(payload?.participants?.user),
      provider: participantSerializer(counterpart),
      counterpart: participantSerializer(counterpart),
    },
    messages: (payload?.messages || []).map(chatMessageSerializer),
    hasMore: payload?.hasMore,
    nextCursor: payload?.nextCursor ?? null,
  };
}
