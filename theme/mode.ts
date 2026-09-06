import { useSelector } from 'react-redux';

import { ThemeMode } from '../constants/theme';
import { selectThemePreference, type ThemePreference } from '../store/themeSlice';

// ============================================================================
// Preference -> mode
//
// THE APP DOES NOT READ THE PHONE'S THEME
// ---------------------------------------
// This file used to call `useColorScheme()` — it was the app's only OS-theme
// subscription — and collapse a three-value preference ('system' | 'light' |
// 'dark') into the two a ramp has. Both are gone. The stored preference is
// already 'light' | 'dark', so there is nothing left to collapse, and this hook
// is a straight read of the slice.
//
// The reason is a product decision, not a technical one: MetroMatrix is
// designed, reviewed and shipped in light. Following the OS meant a user whose
// phone was dark saw the dark appearance on their very first launch, having
// never chosen it. Dark is now something you turn on, from the Dark Mode switch
// in Settings.
//
// app.json SAYS SO TOO
// --------------------
// `userInterfaceStyle` is "light". That clamp covers the native surfaces this
// layer cannot paint — launch screen, system alerts, keyboard appearance,
// WebView overscroll — so they stay light on a dark phone rather than
// contradicting the app around them. Dark mode is painted entirely by
// `ThemeProvider`, in JS, and is unaffected by the clamp.
//
// If dark mode ever starts following the phone again, something has
// reintroduced `useColorScheme` or `Appearance`. There should be no such call
// anywhere in the app.
// ============================================================================

/** Typed just enough to read the slice, so the theme layer stays free of the store graph. */
type ThemeAwareState = { theme?: { preference?: ThemePreference } };

/**
 * The mode to render in.
 *
 * Call this ONCE, at the root, and let `ThemeProvider` carry it down — every
 * nested provider inherits it. Calling it deeper works but subscribes another
 * component to the store for a value it could have read from `useTheme()`.
 */
export const useResolvedMode = (): ThemeMode =>
  useSelector((state: ThemeAwareState) => selectThemePreference(state));
