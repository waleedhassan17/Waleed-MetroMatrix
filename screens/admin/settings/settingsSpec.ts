// ============================================================================
// The settings spec the server sends with GET /admin/settings, and the same
// field checks the server makes (config/platformSettings.js), so a bad value
// is caught before the round trip. The server stays authoritative.
// ============================================================================

export type SectionKey = 'general' | 'notifications' | 'security' | 'finance';

export interface FieldSpec {
  type: 'boolean' | 'integer' | 'string' | 'email';
  label: string;
  min?: number;
  max?: number;
  unit?: string;
  allowEmpty?: boolean;
}

export interface SectionSpec {
  label: string;
  permission: string | null;
  superAdminOnly: boolean;
  fields: Record<string, FieldSpec>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** " from 1 to 10", " of 1 or more", " up to 10" — or nothing when the server sets no bound. */
const rangeText = (min?: number, max?: number): string =>
  min !== undefined && max !== undefined ? ` from ${min} to ${max}` : min !== undefined ? ` of ${min} or more` : max !== undefined ? ` up to ${max}` : '';

/** What is wrong with `value` for field `f`, or null. */
export function fieldProblem(f: FieldSpec, value: string | boolean | undefined): string | null {
  switch (f.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : `${f.label} must be on or off`;
    case 'integer': {
      const text = String(value ?? '').trim();
      const n = Number(text);
      if (!text || !Number.isInteger(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        return `Enter a whole number${rangeText(f.min, f.max)}`;
      }
      return null;
    }
    case 'email': {
      const text = String(value ?? '').trim();
      if (!text) return f.allowEmpty ? null : 'Enter an email address';
      return EMAIL.test(text) ? null : 'Enter a valid email address';
    }
    default: {
      const text = String(value ?? '').trim();
      const min = f.allowEmpty || f.min === undefined ? 0 : f.min;
      if (text.length < min) return min > 0 ? `Enter at least ${min} character${min === 1 ? '' : 's'}` : null;
      if (f.max && text.length > f.max) return `Use at most ${f.max} characters`;
      return null;
    }
  }
}
