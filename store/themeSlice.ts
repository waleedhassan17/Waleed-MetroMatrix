import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ============================================================================
// Appearance preference, app-wide.
//
// WHY THIS IS NOT IN userProfileSlice
// -----------------------------------
// It used to be: `userProfileSlice.user.darkMode`, seeded from the server's
// `preferences.theme`. Three things were wrong with that, and all three are the
// reason the switch never worked.
//
//   1. It was account state, so `RESET_ALL_STATE` — dispatched on login AND
//      logout — wiped it. Signing out reverted the user's theme.
//   2. It was not in redux-persist's whitelist, so it did not survive a
//      restart either.
//   3. Only the customer had one. The provider profile had a disabled "Coming
//      soon" row and admin settings had a Light/Dark/System picker wired to a
//      different field. Three controls, three sources of truth, zero consumers.
//
// A theme is a property of the DEVICE, not of the account: the same phone in
// the same room wants the same brightness whoever is signed in. So it lives
// here, is persisted, and is listed in `SHELL_SLICES` so a logout cannot clear
// it — the same treatment `appContainer` gets, for the same reason.
// ============================================================================

/**
 * What the user chose. Distinct from the RESOLVED mode: 'system' is a live
 * subscription to the OS setting, not a snapshot of it, so it has to survive as
 * itself rather than being flattened to light/dark at the moment it is picked.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeState {
  preference: ThemePreference;
}

// 'system' by default: a fresh install should match the phone the user already
// set up, not announce our own opinion on the first launch.
const initialState: ThemeState = { preference: 'system' };

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.preference = action.payload;
    },
  },
});

export const { setThemePreference } = themeSlice.actions;
export default themeSlice.reducer;

/** The stored preference. Use `useResolvedMode()` to render with it. */
export const selectThemePreference = (state: any): ThemePreference =>
  state.theme?.preference ?? 'system';
