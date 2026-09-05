import { HS } from '../../constants/HomeServiceTheme';
import { ThemeColors } from '../../theme';

// ============================================================================
// A deliberate, temporary compromise. Read before using.
//
// THE BUG THIS DOES NOT FIX
// -------------------------
// Button, Chip, SectionHeader and HeroBanner reach for `HS` — the home-service
// green — directly, because they were written when home services was the only
// vertical here. AppBar was later taught to read `useTheme().colors` instead,
// and these were not. The consequence is live today, in light mode: a primary
// Button on a HEALTHCARE screen renders green, not clinical blue, and 35
// healthcare screens import these primitives.
//
// That is a real bug and the fix is one line — read `c.accent`. It is not
// fixed here because fixing it repaints 35 shipped light screens, which is a
// visible design change nobody asked for while adding dark mode.
//
// WHAT THIS DOES INSTEAD
// ----------------------
// Light keeps precisely the colours it has always had, byte for byte. Dark —
// which has no shipped appearance to preserve, and where the green measures
// 1.6:1 against the canvas and is simply unreadable — gets the module accent
// it should have had all along.
//
// TO REMOVE: return the `c.*` branch unconditionally, delete the `HS` import,
// and eyeball the healthcare and shopping screens in light. That is the whole
// follow-up.
// ============================================================================

export interface UIAccent {
  accent: string;
  accentDeep: string;
  accentSoft: string;
  accentLine: string;
  onAccent: string;
}

export const uiAccent = (c: ThemeColors, isDark: boolean): UIAccent =>
  isDark
    ? {
        accent: c.accent,
        accentDeep: c.accentDeep,
        accentSoft: c.accentSoft,
        accentLine: c.accentLine,
        onAccent: c.onAccent,
      }
    : {
        accent: HS.accent,
        accentDeep: HS.accentDeep,
        accentSoft: HS.accentSoft,
        accentLine: HS.accentLine,
        // White on HS.accent measures 3.77 — below AA. Preserved, not endorsed;
        // it is what these buttons have always rendered.
        onAccent: c.inkInverse,
      };
