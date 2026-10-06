// ============================================================================
// Specialty list helpers. Pure, so they are tested.
// ============================================================================

import type { HCSpecialty } from '../../../../networks/admin/healthcareApi';

export type SpecialtyFilter = 'all' | 'active' | 'inactive';

/** Ionicons glyphs offered for a specialty (the same set the screen always had). */
export const SPECIALTY_ICONS = [
  'medkit', 'heart', 'body', 'happy', 'fitness', 'pulse', 'eye', 'woman', 'man',
  'ear', 'hand-left', 'nutrition', 'leaf', 'flask', 'thermometer', 'bandage', 'medical', 'skull',
];

/** By status, then by name or condition; the server's order otherwise. */
export function filterSpecialties(list: HCSpecialty[], filter: SpecialtyFilter, search: string): HCSpecialty[] {
  const q = search.trim().toLowerCase();
  return list.filter((s) => {
    if (filter === 'active' && !s.isActive) return false;
    if (filter === 'inactive' && s.isActive) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.commonConditions ?? []).some((c) => c.toLowerCase().includes(q));
  });
}

const plural = (n: number, word: string) => `${n.toLocaleString('en-PK')} ${word}${n === 1 ? '' : 's'}`;

/** "3 doctors · 41 appointments", or the description when nothing is counted. */
export function specialtySubtitle(s: Pick<HCSpecialty, 'doctorCount' | 'appointmentCount' | 'description'>): string {
  const parts = [
    typeof s.doctorCount === 'number' ? plural(s.doctorCount, 'doctor') : null,
    typeof s.appointmentCount === 'number' ? plural(s.appointmentCount, 'appointment') : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : s.description ?? '';
}
