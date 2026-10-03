// ============================================================================
// Who is signed in to the admin console, and what they may do.
//
// Holds the admin's profile (with EFFECTIVE permissions, recomputed by the
// server on every response) and the session restriction. Tokens are not here
// — see networks/admin/session.ts.
//
// status:
//   unknown    nothing checked yet this launch
//   restoring  a stored session is being verified with the server
//   signedIn   profile loaded; `restrict` says whether the console is open
//   signedOut  no admin session (or it ended — `notice` says why)
//   offline    a session exists but the server could not be reached to verify it
// ============================================================================

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAdminProfile,
  restrictionFrom,
  type AdminProfile,
  type SessionRestriction,
} from '../../../networks/admin/auth';
import { loadAdminSession } from '../../../networks/admin/session';
import { toAdminApiError } from '../../../networks/admin/errors';

export type AdminAuthStatus = 'unknown' | 'restoring' | 'signedIn' | 'signedOut' | 'offline';

export interface AdminAuthState {
  status: AdminAuthStatus;
  admin: AdminProfile | null;
  restrict: SessionRestriction;
  /** Shown once on the sign-in screen ("Your session expired"). */
  notice: string | null;
}

const initialState: AdminAuthState = {
  status: 'unknown',
  admin: null,
  restrict: null,
  notice: null,
};

/**
 * Verify the stored session by loading the profile. An expired access token is
 * refreshed by the interceptor on the way; a dead session ends as signedOut.
 */
export const restoreAdminSession = createAsyncThunk<
  AdminProfile | null,
  void,
  { rejectValue: 'offline' }
>('adminAuth/restore', async (_, { rejectWithValue }) => {
  const session = await loadAdminSession();
  if (!session) return null;
  try {
    return await fetchAdminProfile();
  } catch (err) {
    const error = toAdminApiError(err);
    if (error.status === 0 || error.status >= 500) return rejectWithValue('offline');
    return null;
  }
});

export const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    adminSignedIn: (state, action: PayloadAction<{ admin: AdminProfile; restrict: SessionRestriction }>) => {
      state.status = 'signedIn';
      state.admin = action.payload.admin;
      state.restrict = action.payload.restrict;
      state.notice = null;
    },
    /** A fresh profile from any response (profile, refresh, change-password). */
    adminProfileReceived: (state, action: PayloadAction<AdminProfile>) => {
      state.admin = action.payload;
      if ('restrict' in action.payload) state.restrict = restrictionFrom(action.payload.restrict);
    },
    adminRestrictionChanged: (state, action: PayloadAction<SessionRestriction>) => {
      state.restrict = action.payload;
    },
    adminSignedOut: (state, action: PayloadAction<{ notice?: string } | undefined>) => {
      state.status = 'signedOut';
      state.admin = null;
      state.restrict = null;
      state.notice = action.payload?.notice ?? null;
    },
    clearAdminNotice: (state) => {
      state.notice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreAdminSession.pending, (state) => {
        state.status = 'restoring';
      })
      .addCase(restoreAdminSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = 'signedIn';
          state.admin = action.payload;
          state.restrict = restrictionFrom(action.payload.restrict);
        } else {
          state.status = 'signedOut';
          state.admin = null;
          state.restrict = null;
        }
      })
      .addCase(restoreAdminSession.rejected, (state) => {
        state.status = 'offline';
      });
  },
});

export const {
  adminSignedIn,
  adminProfileReceived,
  adminRestrictionChanged,
  adminSignedOut,
  clearAdminNotice,
} = adminAuthSlice.actions;

type WithAdminAuth = { adminAuth: AdminAuthState };

export const selectAdminAuth = (state: WithAdminAuth) => state.adminAuth;
export const selectAdminProfile = (state: WithAdminAuth) => state.adminAuth.admin;

export default adminAuthSlice.reducer;
