// networks/serviceProviders/chatNetwork.ts
import { network } from '../network/network'; // your existing network instance

const BASE = '/api/chat';

export const chatNetwork = {
  /**
   * Find or create a chat room between the logged-in user and a provider.
   */
  findOrCreateRoom: async (providerId: string, serviceType: string) => {
    const response = await network.post(`${BASE}/rooms`, { providerId, serviceType });
    return response.data;
  },

  /**
   * Fetch all chat rooms for the current user (inbox).
   */
  getChatRooms: async () => {
    const response = await network.get(`${BASE}/rooms`);
    return response.data;
  },

  /**
   * Fetch paginated messages for a room.
   */
  getMessages: async (roomId: string, page = 1, limit = 30) => {
    const response = await network.get(
      `${BASE}/rooms/${roomId}/messages?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Mark all messages in a room as read.
   */
  markAsRead: async (roomId: string) => {
    const response = await network.patch(`${BASE}/rooms/${roomId}/read`, {});
    return response.data;
  },

  /**
   * Request an Agora token for voice calling.
   */
  generateCallToken: async (channelName: string, uid = 0) => {
    const response = await network.post(`${BASE}/call/token`, { channelName, uid });
    return response.data;
  },

  /**
   * Save a call log after a call ends.
   */
  saveCallLog: async (params: {
    receiverId: string;
    receiverType: string;
    channelName: string;
    status: string;
    durationSeconds: number;
    serviceType: string;
  }) => {
    const response = await network.post(`${BASE}/call/log`, params);
    return response.data;
  },

  /**
   * Get call history.
   */
  getCallLogs: async () => {
    const response = await network.get(`${BASE}/call/logs`);
    return response.data;
  },
};
