import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AdminNotification, PaginationInfo, NotificationFilters, NotificationType } from '../../../models/admin';
import {
  getNotificationsAPI,
  getUnreadCountAPI,
  markNotificationReadAPI,
  markAllNotificationsReadAPI,
  deleteNotificationAPI,
  clearAllNotificationsAPI,
} from '../../../networks/admin/adminAPIs';

interface NotificationsState {
  notifications: AdminNotification[];
  unreadCount: number;
  pagination: PaginationInfo | null;
  filters: NotificationFilters;
  status: 'idle' | 'loading' | 'failed';
  error: string | null;
  actionStatus: 'idle' | 'loading' | 'success' | 'failed';
  actionError: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  pagination: null,
  filters: { type: undefined, isRead: undefined, page: 1, limit: 20 },
  status: 'idle',
  error: null,
  actionStatus: 'idle',
  actionError: null,
};

export const getNotificationsAsync = createAsyncThunk(
  'notifications/getNotifications',
  async (filters: Partial<NotificationFilters> = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const { page = 1, limit = 20, isRead } = filters;
      const response = await getNotificationsAPI(token, page, limit, isRead);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

export const getUnreadCountAsync = createAsyncThunk(
  'notifications/getUnreadCount',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await getUnreadCountAPI(token);
      return response.unreadCount || 0;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch unread count');
    }
  }
);

export const markAsReadAsync = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await markNotificationReadAPI(token, notificationId);
      return { notificationId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllAsReadAsync = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await markAllNotificationsReadAPI(token);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark all notifications as read');
    }
  }
);

export const deleteNotificationAsync = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await deleteNotificationAPI(token, notificationId);
      return { notificationId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete notification');
    }
  }
);

export const clearAllNotificationsAsync = createAsyncThunk(
  'notifications/clearAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await clearAllNotificationsAPI(token);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to clear notifications');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.actionError = null;
    },
    clearActionStatus: (state) => {
      state.actionStatus = 'idle';
      state.actionError = null;
    },
    setFilters: (state, action: PayloadAction<Partial<NotificationFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    addNotification: (state, action: PayloadAction<AdminNotification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    decrementUnreadCount: (state) => {
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getNotificationsAsync.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getNotificationsAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        state.notifications = action.payload.notifications || [];
        state.pagination = action.payload.pagination;
        state.unreadCount = action.payload.unreadCount || 0;
        state.error = null;
      })
      .addCase(getNotificationsAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    builder.addCase(getUnreadCountAsync.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });

    builder
      .addCase(markAsReadAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(markAsReadAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        const index = state.notifications.findIndex(
          (n) => n.id === action.payload.notificationId || n._id === action.payload.notificationId
        );
        if (index !== -1 && !state.notifications[index].isRead) {
          state.notifications[index].isRead = true;
          state.notifications[index].readAt = new Date().toISOString();
          if (state.unreadCount > 0) {
            state.unreadCount -= 1;
          }
        }
        state.actionError = null;
      })
      .addCase(markAsReadAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(markAllAsReadAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(markAllAsReadAsync.fulfilled, (state) => {
        state.actionStatus = 'success';
        state.notifications = state.notifications.map((n: AdminNotification) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        }));
        state.unreadCount = 0;
        state.actionError = null;
      })
      .addCase(markAllAsReadAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(deleteNotificationAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(deleteNotificationAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        const index = state.notifications.findIndex(
          (n) => n.id === action.payload.notificationId || n._id === action.payload.notificationId
        );
        if (index !== -1) {
          const notification = state.notifications[index];
          if (!notification.isRead && state.unreadCount > 0) {
            state.unreadCount -= 1;
          }
          state.notifications.splice(index, 1);
        }
        state.actionError = null;
      })
      .addCase(deleteNotificationAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(clearAllNotificationsAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(clearAllNotificationsAsync.fulfilled, (state) => {
        state.actionStatus = 'success';
        state.notifications = [];
        state.unreadCount = 0;
        state.actionError = null;
      })
      .addCase(clearAllNotificationsAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearActionStatus,
  setFilters,
  resetFilters,
  addNotification,
  setUnreadCount,
  incrementUnreadCount,
  decrementUnreadCount,
} = notificationsSlice.actions;

export const selectNotifications = (state: any) => state.notifications?.notifications || [];
export const selectUnreadCount = (state: any) => state.notifications?.unreadCount || 0;
export const selectPagination = (state: any) => state.notifications?.pagination || null;
export const selectFilters = (state: any) => state.notifications?.filters || {};
export const selectIsLoading = (state: any) => state.notifications?.status === 'loading';
export const selectIsActionLoading = (state: any) => state.notifications?.actionStatus === 'loading';
export const selectUnreadNotifications = (state: any) => state.notifications?.notifications.filter((n: AdminNotification) => !n.isRead) || [];
export const selectNotificationsByType = (type: NotificationType) => (state: any) => state.notifications?.notifications.filter((n: AdminNotification) => n.type === type) || [];

export default notificationsSlice.reducer;