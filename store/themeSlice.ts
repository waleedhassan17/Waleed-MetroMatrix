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
 * What the user chose. Two values, and deliberately not three.
 *
 * There USED to be a 'system' option that subscribed to the OS setting, and it
 * was the default. That is exactly the behaviour being removed: MetroMatrix has
 * a designed light appearance, and a user whose phone happens to be dark was
 * being shown the dark one on first launch without ever asking for it. Light is
 * the product; dark is an opt-in, chosen here and nowhere else.
 *
 * Because there is no live OS subscription any more, the preference IS the
 * resolved mode — see `useResolvedMode()` in theme/mode.ts, which is now a
 * straight read rather than a collapse of three values into two.
 */
export type ThemePreference = 'light' | 'dark';

export interface ThemeState {
  preference: ThemePreference;
}

// Light by default. A fresh install opens in the appearance the app was
// designed and reviewed in, on every phone.
const initialState: ThemeState = { preference: 'light' };

/**
 * Anything that is not exactly 'dark' is light.
 *
 * This slice is in redux-persist's whitelist, so installs that predate this
 * change have the literal string 'system' sitting on disk — as do any that
 * stored a value we no longer recognise. Rather than adding a persist
 * `version`/`migrate` (there is none today, and introducing one touches every
 * whitelisted slice), the legacy value is normalised on the way in and on the
 * way out. Upgrading such an install lands on light, which is the new default
 * and the safe direction: a screen that has not been checked in dark is never
 * shown in dark by accident.
 */
const normalise = (value: unknown): ThemePreference =>
  value === 'dark' ? 'dark' : 'light';

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.preference = normalise(action.payload);
    },
  },
});

export const { setThemePreference } = themeSlice.actions;
export default themeSlice.reducer;

/** The stored preference. Use `useResolvedMode()` to render with it. */
export const selectThemePreference = (state: any): ThemePreference =>
  normalise(state.theme?.preference);
