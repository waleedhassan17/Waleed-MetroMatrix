// ============================================
// Healthcare — Doctor search relevance
// Single source of truth for matching a patient's
// search query against a doctor and ordering the
// results, shared by the doctor-list and
// doctor-search screens so both rank identically.
// ============================================

import type { Doctor } from '../../models/healthcare/types';

/** Lowercase, trim, and drop a leading "Dr." so titles never affect matching. */
function normalize(value?: string | null): string {
  return (value || '').toLowerCase().replace(/^dr\.?\s+/, '').trim();
}

/** "dr" / "dr." on its own — a title with nothing after it. */
const TITLE_ONLY = /^dr\.?$/;
/** A leading "dr " / "dr. " followed by an actual term. */
const TITLE_PREFIX = /^dr\.?\s+/;

/**
 * True when the query is nothing but the title every doctor carries.
 *
 * Every stored name begins with "Dr.", so typing "dr" means "show me doctors",
 * not "find a doctor whose name contains dr". Name matching deliberately
 * strips the title, which left this query matching nothing at all.
 */
export function isTitleOnlyQuery(rawQuery: string): boolean {
  return TITLE_ONLY.test((rawQuery || '').trim().toLowerCase());
}

/** Drops a leading title so "dr nadia" behaves exactly like "nadia". */
function stripQueryTitle(query: string): string {
  return query.replace(TITLE_PREFIX, '').trim();
}

/**
 * Relevance score for one doctor against a query; 0 means "no match".
 *
 * The search box promises "doctors, specialties, symptoms", so the query is
 * matched against every field a patient would reasonably type: name, specialty
 * and subspecialties, qualifications, and the bio (where conditions and
 * symptoms appear).
 *
 * Scores are tiered so a name hit always outranks a specialty or bio hit —
 * searching "Nadia" must surface Dr. Nadia Hussain first, never an unrelated
 * doctor whose bio happens to contain the word.
 */
export function scoreDoctorForQuery(doctor: Doctor, rawQuery: string): number {
  const raw = (rawQuery || '').trim().toLowerCase();
  if (!raw) return 0;

  // "dr" matches every doctor — rank them by rating rather than dropping them.
  if (isTitleOnlyQuery(raw)) {
    return 10 + Math.min(doctor.rating || 0, 5) * 2;
  }

  // "dr nadia" is the same search as "nadia".
  const query = stripQueryTitle(raw);
  if (!query) return 0;

  const name = normalize(doctor.name);
  const specialty = normalize(doctor.specialtyName);
  const subspecialties = (doctor.subspecialties || []).map(normalize);
  const qualifications = (doctor.qualifications || []).map(normalize);
  const bio = normalize(doctor.bio);

  let score = 0;

  // ── Name (strongest signal) ──
  if (name === query) {
    score = 1000;
  } else if (name.startsWith(query)) {
    score = 800;
  } else if (name.split(/\s+/).some((word) => word.startsWith(query))) {
    // "hussain" should also match "Nadia Hussain" on the surname.
    score = 600;
  } else if (name.includes(query)) {
    score = 400;
  }

  // ── Specialty / subspecialty ──
  if (!score) {
    if (specialty === query) score = 300;
    else if (specialty.startsWith(query)) score = 250;
    else if (specialty.includes(query)) score = 200;
    else if (subspecialties.some((s) => s.includes(query))) score = 150;
  }

  // ── Qualifications, then bio (conditions & symptoms) ──
  if (!score && qualifications.some((q) => q.includes(query))) score = 100;
  if (!score && bio.includes(query)) score = 50;

  // Tie-breaker: among equally relevant matches prefer the better-rated
  // doctor. Capped far below one tier so it can never promote a weaker match.
  if (score > 0) score += Math.min(doctor.rating || 0, 5) * 2;

  return score;
}

/**
 * Drops non-matching doctors and orders the rest most-relevant first.
 * An empty query returns the list untouched.
 */
export function rankDoctorsByQuery(doctors: Doctor[], query: string): Doctor[] {
  if (!query.trim()) return doctors;

  return doctors
    .map((doctor) => ({ doctor, score: scoreDoctorForQuery(doctor, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.doctor);
}
