// ============================================
// CHAT MODELS
// ============================================

export type RoomType = 'homeservice' | 'healthcare';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'provider';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface ChatParticipant {
  id: string;
  name: string;
  image?: string;
  // Supplied by the realtime service. The call screen hands this to the phone's
  // native dialer — there is no in-app audio.
  phoneNumber?: string;
}

export interface ChatData {
  bookingId: string;
  roomId?: string;
  roomType?: RoomType;
  // Which side the CURRENT user is on, derived server-side from room
  // membership rather than inferred from the token on the client.
  role?: 'user' | 'provider';
  participants: {
    user: ChatParticipant;
    /** The provider for a home-service room, the doctor for a healthcare room. */
    provider: ChatParticipant;
    counterpart?: ChatParticipant;
  };
  messages: ChatMessage[];
  hasMore?: boolean;
  nextCursor?: string | null;
}
