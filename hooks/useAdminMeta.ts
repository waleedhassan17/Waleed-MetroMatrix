// ============================================================================
// GET /admin/meta — every list, label, tone and limit the console shows.
//
// Cached for the session and refetched when the app returns to the foreground
// after ten minutes, so a status added on the server, a new specialty, or a
// permission change reaches the app without a restart. Nothing it serves is
// duplicated in the app.
// ============================================================================

import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useGetMetaQuery, type ConsoleMeta } from '../networks/admin/adminApi';
import type { Tone } from '../constants/theme';

export const META_STALE_MS = 10 * 60_000;

export function useAdminMeta() {
  const result = useGetMetaQuery();
  const { fulfilledTimeStamp, refetch } = result;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && fulfilledTimeStamp && Date.now() - fulfilledTimeStamp > META_STALE_MS) {
        refetch();
      }
    });
    return () => sub.remove();
  }, [fulfilledTimeStamp, refetch]);

  return result;
}

export type EnumGroup = keyof ConsoleMeta['enums'];

type ServerTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type Option = { value: string; label: string; tone?: ServerTone };

const TONE: Record<ServerTone, Tone> = {
  neutral: 'neutral',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
};

/**
 * How to show a status value: the server's label and semantic tone. A value
 * the server has not described (an older app meeting a newer status) shows as
 * itself, in neutral — never as a guess.
 */
export function presentStatus(
  meta: ConsoleMeta | undefined,
  group: EnumGroup,
  value: string | null | undefined
): { label: string; tone: Tone } {
  if (!value) return { label: '—', tone: 'neutral' };
  const options = (meta?.enums?.[group] ?? []) as Option[];
  const match = options.find((o) => o.value === value);
  if (!match) return { label: value, tone: 'neutral' };
  return { label: match.label, tone: match.tone ? TONE[match.tone] ?? 'neutral' : 'neutral' };
}

/** The `{value, label}` options of an enum, for filter chips. */
export const enumOptions = (meta: ConsoleMeta | undefined, group: EnumGroup): Option[] =>
  ((meta?.enums?.[group] ?? []) as Option[]).filter((o) => typeof o.value === 'string');
