// utils/socketService.ts
//
// Singleton Socket.IO client.
// Usage:
//   import SocketService from '../utils/socketService';
//   SocketService.connect(token);
//   SocketService.onMessage(handler);
//   SocketService.sendMessage(roomId, content);
//
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';

type MessageHandler = (data: {
  roomId: string;
  message: ChatMessage;
}) => void;

type CallEventHandler = (data: any) => void;

export interface ChatMessage {
  _id: string;
  senderId: string;
  senderType: 'User' | 'Provider';
  content: string;
  type: 'text' | 'image' | 'location' | 'call_log';
  mediaUrl?: string | null;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private callHandlers: Map<string, CallEventHandler[]> = new Map();

  connect(token: string): void {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // Route incoming chat messages to registered handlers
    this.socket.on('chat:message', (data) => {
      this.messageHandlers.forEach((h) => h(data));
    });

    // Route call events to registered handlers
    const callEvents = [
      'call:incoming',
      'call:ringing',
      'call:accepted',
      'call:rejected',
      'call:ended',
      'call:missed',
    ];
    callEvents.forEach((event) => {
      this.socket?.on(event, (data) => {
        const handlers = this.callHandlers.get(event) || [];
        handlers.forEach((h) => h(data));
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.messageHandlers = [];
    this.callHandlers.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Chat ────────────────────────────────────────────────────────

  joinRoom(roomId: string): void {
    this.socket?.emit('chat:join', roomId);
  }

  leaveRoom(roomId: string): void {
    this.socket?.emit('chat:leave', roomId);
  }

  sendMessage(roomId: string, content: string, type = 'text'): void {
    this.socket?.emit('chat:send', { roomId, content, type });
  }

  emitTyping(roomId: string): void {
    this.socket?.emit('chat:typing', { roomId });
  }

  emitStopTyping(roomId: string): void {
    this.socket?.emit('chat:stopTyping', { roomId });
  }

  emitRead(roomId: string): void {
    this.socket?.emit('chat:read', { roomId });
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onTyping(handler: (data: any) => void): () => void {
    this.socket?.on('chat:typing', handler);
    return () => this.socket?.off('chat:typing', handler);
  }

  onStopTyping(handler: (data: any) => void): () => void {
    this.socket?.on('chat:stopTyping', handler);
    return () => this.socket?.off('chat:stopTyping', handler);
  }

  onRead(handler: (data: any) => void): () => void {
    this.socket?.on('chat:read', handler);
    return () => this.socket?.off('chat:read', handler);
  }

  // ── Voice Call Signaling ────────────────────────────────────────

  initiateCall(params: {
    receiverId: string;
    receiverRole: string;
    channelName: string;
    callerInfo: object;
    serviceType: string;
  }): void {
    this.socket?.emit('call:initiate', params);
  }

  acceptCall(params: { callerId: string; callerRole: string; channelName: string }): void {
    this.socket?.emit('call:accept', params);
  }

  rejectCall(params: { callerId: string; callerRole: string; channelName: string }): void {
    this.socket?.emit('call:reject', params);
  }

  endCall(params: {
    otherPartyId: string;
    otherPartyRole: string;
    channelName: string;
    durationSeconds: number;
  }): void {
    this.socket?.emit('call:end', params);
  }

  onCallEvent(event: string, handler: CallEventHandler): () => void {
    const handlers = this.callHandlers.get(event) || [];
    this.callHandlers.set(event, [...handlers, handler]);
    return () => {
      const updated = (this.callHandlers.get(event) || []).filter((h) => h !== handler);
      this.callHandlers.set(event, updated);
    };
  }
}

// Export singleton
export default new SocketService();
