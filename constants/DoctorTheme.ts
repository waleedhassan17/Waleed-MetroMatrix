// ============================================================================
// Doctor (healthcare provider) tokens — a VIEW of the healthcare palette
//
// This file used to be a second, independent copy of the healthcare colours:
// same `primary '#2A7FFF'`, same `primaryDark '#1E6AE1'`, same
// `border '#E2E8F0'` — and four values that had quietly drifted apart from
// their `HC` equivalents:
//
//   successLight  #DCFCE7  ->  HC.successLight  #ECFDF5
//   textDark      #1A1A1A  ->  HC.textDark      #0F172A
//   textMedium    #2D3748  ->  HC.textMedium    #475569
//   borderLight   #F1F5F9  ->  HC.borderLight   #EEF2FF
//
// So the patient side and the doctor side of the SAME product rendered the same
// roles in slightly different colours, which is the kind of difference nobody
// can name but everybody registers as "unfinished".
//
// Every key below now points at `HC`. The shape is unchanged on purpose: all 11
// consumers import it as `DOCTOR_THEME as THEME` and none of them need editing.
// New doctor-side work should read `useTheme()` and let this drain away.
// ============================================================================

import { HC } from './HealthcareTheme';

export const DOCTOR_THEME = {
  primary: HC.primary,
  primaryDark: HC.primaryDark,
  primaryLight: HC.primaryLight,
  primarySoft: HC.primarySoft,
  accent: HC.accent,
  accentLight: HC.accentLight,

  success: HC.success,
  successLight: HC.successLight,
  warning: HC.warning,
  warningLight: HC.warningLight,
  error: HC.error,
  errorLight: HC.errorLight,

  textDark: HC.textDark,
  textMedium: HC.textMedium,
  textLight: HC.textLight,
  textMuted: HC.textMuted,

  cardBg: HC.card,
  pageBg: HC.pageBg,
  border: HC.border,
  borderLight: HC.borderLight,

  gradient: {
    primary: HC.gradient.primary,
    soft: HC.gradient.soft,
    success: HC.gradient.success,
    warm: HC.gradient.warm,
    // `HC.gradient.video` is byte-identical to what this used to call
    // `secondary` — one gradient, two names, now one definition.
    secondary: HC.gradient.video,
  },
};
