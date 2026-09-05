import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

import { ThemeMode } from '../constants/theme';
import type { ThemePreference } from '../store/themeSlice';

// ============================================================================
// Preference -> mode
//
// The stored preference has three values; a ramp has two. This is the one
// place that collapses them, so 'system' means the same thing everywhere.
//
// `useColorScheme()` is a live subscription — it re-renders when the OS theme
// changes while the app is open, which is why 'system' is stored as itself
// rather than resolved once at the moment the user picks it.
//
// IT ONLY WORKS IF app.json SAYS SO
// ---------------------------------
// With `userInterfaceStyle: "light"` the platform clamps the app and this hook
// returns 'light' forever, however the phone is set. app.json now says
// "automatic". If dark mode ever stops following the system, check there first.
// ============================================================================

/** Typed just enough to read the slice, so the theme layer stays free of the store graph. */
type ThemeAwareState = { theme?: { preference?: ThemePreference } };

/**
 * The mode to render in, honouring the OS when the user chose 'system'.
 *
 * Call this ONCE, at the root, and let `ThemeProvider` carry it down —
 * every nested provider inherits it. Calling it deeper works but re-subscribes
 * a component to OS theme changes for no reason.
 */
export const useResolvedMode = (): ThemeMode => {
  const preference = useSelector(
    (state: ThemeAwareState) => state.theme?.preference ?? 'system',
  );
  const osScheme = useColorScheme();

  if (preference === 'system') return osScheme === 'dark' ? 'dark' : 'light';
  return preference;
};
