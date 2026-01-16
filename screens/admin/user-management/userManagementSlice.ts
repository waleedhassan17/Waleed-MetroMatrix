import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, PaginationInfo, UserFilters } from '../../../models/admin';
import {
  getAllUsersAPI,
  getUserDetailsAPI,
  activateUserAPI,
  deactivateUserAPI,
  deleteUserAPI,
} from '../../../networks/admin/adminAPIs';

interface UserManagementState {
  users: User[];
  selectedUser: User | null;
  pagination: PaginationInfo | null;
  filters: UserFilters;
  stats: { total: number; active: number; inactive: number };
  status: 'idle' | 'loading' | 'failed';
  error: string | null;
  actionStatus: 'idle' | 'loading' | 'success' | 'failed';
  actionError: string | null;
}

const initialState: UserManagementState = {
  users: [],
  selectedUser: null,
  pagination: null,
  filters: { search: '', isActive: undefined, page: 1, limit: 15 },
  stats: { total: 0, active: 0, inactive: 0 },
  status: 'idle',
  error: null,
  actionStatus: 'idle',
  actionError: null,
};

export const getAllUsersAsync = createAsyncThunk(
  'userManagement/getAllUsers',
  async (filters: Partial<UserFilters> = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await getAllUsersAPI(token, filters.page || 1, filters.limit || 15, filters.search, filters.isActive);
      return { ...response, filters };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch users');
    }
  }
);

export const getUserDetailsAsync = createAsyncThunk(
  'userManagement/getUserDetails',
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await getUserDetailsAPI(token, userId);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch user details');
    }
  }
);

export const activateUserAsync = createAsyncThunk(
  'userManagement/activateUser',
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await activateUserAPI(token, userId);
      return { userId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to activate user');
    }
  }
);

export const deactivateUserAsync = createAsyncThunk(
  'userManagement/deactivateUser',
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await deactivateUserAPI(token, userId);
      return { userId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to deactivate user');
    }
  }
);

export const deleteUserAsync = createAsyncThunk(
  'userManagement/deleteUser',
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await deleteUserAPI(token, userId);
      return { userId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete user');
    }
  }
);

const userManagementSlice = createSlice({
  name: 'userManagement',
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
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
    setSelectedUser: (state, action: PayloadAction<User>) => {
      state.selectedUser = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<UserFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.filters.page = action.payload;
    },
    updateStats: (state) => {
      state.stats = {
        total: state.users.length,
        active: state.users.filter((u) => u.isActive).length,
        inactive: state.users.filter((u) => !u.isActive).length,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllUsersAsync.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getAllUsersAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        state.users = action.payload.users || [];
        state.pagination = action.payload.pagination;
        if (action.payload.filters) {
          state.filters = { ...state.filters, ...action.payload.filters };
        }
        state.stats = {
          total: state.users.length,
          active: state.users.filter((u) => u.isActive).length,
          inactive: state.users.filter((u) => !u.isActive).length,
        };
        state.error = null;
      })
      .addCase(getAllUsersAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    builder
      .addCase(getUserDetailsAsync.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getUserDetailsAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        state.selectedUser = action.payload || null;
        state.error = null;
      })
      .addCase(getUserDetailsAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    builder
      .addCase(activateUserAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(activateUserAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        const index = state.users.findIndex(
          (u) => u.id === action.payload.userId || u._id === action.payload.userId
        );
        if (index !== -1) {
          state.users[index].isActive = true;
        }
        if (state.selectedUser && (state.selectedUser.id === action.payload.userId || state.selectedUser._id === action.payload.userId)) {
          state.selectedUser.isActive = true;
        }
        state.stats.active = state.users.filter((u) => u.isActive).length;
        state.stats.inactive = state.users.filter((u) => !u.isActive).length;
        state.actionError = null;
      })
      .addCase(activateUserAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(deactivateUserAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(deactivateUserAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        const index = state.users.findIndex(
          (u) => u.id === action.payload.userId || u._id === action.payload.userId
        );
        if (index !== -1) {
          state.users[index].isActive = false;
        }
        if (state.selectedUser && (state.selectedUser.id === action.payload.userId || state.selectedUser._id === action.payload.userId)) {
          state.selectedUser.isActive = false;
        }
        state.stats.active = state.users.filter((u) => u.isActive).length;
        state.stats.inactive = state.users.filter((u) => !u.isActive).length;
        state.actionError = null;
      })
      .addCase(deactivateUserAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(deleteUserAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(deleteUserAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        state.users = state.users.filter(
          (u) => u.id !== action.payload.userId && u._id !== action.payload.userId
        );
        if (state.selectedUser && (state.selectedUser.id === action.payload.userId || state.selectedUser._id === action.payload.userId)) {
          state.selectedUser = null;
        }
        state.stats = {
          total: state.users.length,
          active: state.users.filter((u) => u.isActive).length,
          inactive: state.users.filter((u) => !u.isActive).length,
        };
        state.actionError = null;
      })
      .addCase(deleteUserAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearActionStatus,
  clearSelectedUser,
  setSelectedUser,
  setFilters,
  resetFilters,
  setPage,
  updateStats,
} = userManagementSlice.actions;

export const selectUsers = (state: any) => state.userManagement.users as User[];
export const selectSelectedUser = (state: any) => state.userManagement.selectedUser as User | null;
export const selectPagination = (state: any) => state.userManagement.pagination as PaginationInfo | null;
export const selectFilters = (state: any) => state.userManagement.filters as UserFilters;
export const selectStats = (state: any) => state.userManagement.stats as { total: number; active: number; inactive: number };
export const selectIsLoading = (state: any) => state.userManagement.status === 'loading';
export const selectIsActionLoading = (state: any) => state.userManagement.actionStatus === 'loading';

export default userManagementSlice.reducer;