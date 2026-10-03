// ============================================================================
// Auth events — how the network layer tells the UI a session has ended.
//
// The interceptors run outside React, so they cannot navigate. When a refresh
// fails for good they clear that audience's tokens and emit here; whoever owns
// navigation (AdminSessionManager for the admin console) listens and resets to
// the right sign-in screen with a message, instead of the next screen just
// failing with a 401.
// ============================================================================

export type SessionAudience = 'admin' | 'account';
export type SessionEndReason = 'expired' | 'revoked' | 'signed_out';

type Listener = (audience: SessionAudience, reason: SessionEndReason) => void;

const listeners = new Set<Listener>();

export const onSessionEnded = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitSessionEnded = (audience: SessionAudience, reason: SessionEndReason): void => {
  for (const listener of [...listeners]) {
    try {
      listener(audience, reason);
    } catch {
      // A broken listener must not stop the others or the interceptor.
    }
  }
};

// ── Admin session refreshed ─────────────────────────────────────────────────
// A refresh returns the admin's current profile and restriction. Listeners
// (the admin auth slice) pick up permission or restriction changes made on the
// server without waiting for the next profile fetch.

type RefreshListener = (data: { admin?: unknown; restrict?: string | null }) => void;

const refreshListeners = new Set<RefreshListener>();

export const onAdminSessionRefreshed = (listener: RefreshListener): (() => void) => {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
};

export const emitAdminSessionRefreshed = (data: { admin?: unknown; restrict?: string | null }): void => {
  for (const listener of [...refreshListeners]) {
    try {
      listener(data);
    } catch {
      // see emitSessionEnded
    }
  }
};

// ── Admin session restricted mid-session ────────────────────────────────────
// A super admin can turn on a policy (password expiry, required two-factor)
// while another admin is working. Their next call answers 403
// PASSWORD_CHANGE_REQUIRED / TOTP_ENROLMENT_REQUIRED; the network layer reports
// it here and the admin gate moves them to the screen that fixes it.

type RestrictedListener = (restrict: 'password_change' | 'totp_enrol') => void;

const restrictedListeners = new Set<RestrictedListener>();

export const onAdminRestricted = (listener: RestrictedListener): (() => void) => {
  restrictedListeners.add(listener);
  return () => {
    restrictedListeners.delete(listener);
  };
};

export const emitAdminRestricted = (restrict: 'password_change' | 'totp_enrol'): void => {
  for (const listener of [...restrictedListeners]) {
    try {
      listener(restrict);
    } catch {
      // see emitSessionEnded
    }
  }
};
