// ============================================
// CHAT NETWORK APIs
//
// These target the REALTIME service (Heroku), not the main Vercel API. Chat
// history lives there because the realtime service owns chat and calling;
// sending these to the main base URL 404s.
//
// A "room" is polymorphic:
//   roomType 'homeservice' → the id is an HSBooking  _id
//   roomType 'healthcare'  → the id is an Appointment _id
// ============================================

import { ChatData, ChatMessage, ApiResponse } from '../../models/serviceProviders';
import { realtimeRequest } from '../realtime/realtimeClient';

export type RoomType = 'homeservice' | 'healthcare';

export async function fetchChatData(
  roomId: string,
  roomType: RoomType = 'homeservice',
  opts: { before?: string; limit?: number } = {}
): Promise<ApiResponse<ChatData>> {
  const qs = new URLSearchParams({ roomType });
  if (opts.before) qs.set('before', opts.before);
  if (opts.limit) qs.set('limit', String(opts.limit));
  return realtimeRequest<ChatData>(`/chat/${roomId}?${qs.toString()}`);
}

export async function sendChatMessage(data: {
  bookingId: string;
  message: string;
  roomType?: RoomType;
  clientMsgId?: string;
}): Promise<ApiResponse<ChatMessage>> {
  return realtimeRequest<ChatMessage>(`/chat/${data.bookingId}/messages`, {
    method: 'POST',
    // The server accepts `message` or `text`; `message` matches the main
    // backend's older contract, so keep sending it.
    body: JSON.stringify({
      message: data.message,
      roomType: data.roomType || 'homeservice',
      clientMsgId: data.clientMsgId,
    }),
  });
}
