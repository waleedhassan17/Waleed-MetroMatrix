// ============================================
// CHAT MODELS
// ============================================

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
}

export interface ChatData {
  bookingId: string;
  participants: {
    user: ChatParticipant;
    provider: ChatParticipant;
  };
  messages: ChatMessage[];
}
