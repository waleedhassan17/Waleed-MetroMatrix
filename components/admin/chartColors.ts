// ============================================================================
// Colours for the console's charts — read from tokens, never written here.
//
// Series hues come from CHART (constants/theme.ts), in its fixed order: a
// single-series chart uses slot 1 (the accent, through TrendChart), and a
// chart of several series gives each one a slot that never changes with rank.
// Provider types take the slots of their services — doctors the healthcare
// blue, vendors the shopping orange, home service the green — so a type is the
// same colour in every chart on the screen.
//
// A status is coloured by the tone /admin/meta gives it; its label carries
// identity, so two statuses sharing a tone are still told apart.
// ============================================================================

import { CHART, type Tone } from '../../constants/theme';
import type { ThemeColors, ThemeMode } from '../../theme';

export type ProviderTypeKey = 'doctor' | 'home_service' | 'vendor' | 'pending';

const TYPE_SLOT: Record<Exclude<ProviderTypeKey, 'pending'>, number> = { doctor: 0, vendor: 1, home_service: 2 };

/** Series slot `index` (0-based) of the chart palette, for this mode. */
export const seriesColor = (index: number, mode: ThemeMode): string => {
  const series = CHART[mode === 'dark' ? 'dark' : 'light'].series;
  return series[((index % series.length) + series.length) % series.length];
};

/** A provider type's colour; "type not chosen yet" is the quiet neutral. */
export const providerTypeColor = (type: string, mode: ThemeMode, colors: ThemeColors): string =>
  type in TYPE_SLOT ? seriesColor(TYPE_SLOT[type as keyof typeof TYPE_SLOT], mode) : colors.inkFaint;

/** The fill for a semantic tone. Neutral recedes rather than vanishing. */
export function toneColor(tone: Tone, colors: ThemeColors): string {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'error':
      return colors.error;
    case 'info':
      return colors.info;
    case 'accent':
      return colors.accent;
    default:
      return colors.inkFaint;
  }
}
