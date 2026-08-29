// ============================================================================
// The inbox. Served by the REALTIME service, not the main API — that service
// owns chat, so it is the only one that knows the messages, the read state and
// the room-authorization rules.
// ============================================================================

import { realtimeRequest } from './realtimeClient';
import type { RoomType } from '../../services/socket/socketClient';

export interface ConversationSummary {
  /** HSBooking _id or Appointment _id — the room, and the call target. */
  roomId: string;
  roomType: RoomType;
  /** The VIEWER's role in this room, derived server-side from membership. */
  role: 'user' | 'provider';
  /** Booking/appointment status, in that vertical's own vocabulary. */
  status: string;
  /** Service name, or the consultation kind for healthcare. */
  subtitle: string;
  counterpart: {
    id: string;
    name: string;
    image?: string;
    presence: 'online' | 'offline';
    lastSeen: string | null;
  };
  lastMessage: {
    text: string;
    at: string;
    fromSelf: boolean;
  } | null;
  unread: number;
  /** Last message time, or room creation time when nobody has spoken yet. */
  activityAt: string;
}

export interface ConversationsPayload {
  conversations: ConversationSummary[];
  totalUnread: number;
}

export async function fetchConversations() {
  return realtimeRequest<ConversationsPayload>('/conversations');
}
