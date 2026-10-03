// ============================================================================
// Development logging that cannot leak a credential.
//
// Release builds already strip console.log (babel.config.js), but console.warn
// and console.error survive, and dev builds keep everything — including the
// logcat of a test phone handed around the office. So the rule for anything on
// an auth path is: log through here.
//
//   devLog('Signed in', { email })        → console.log, development only
//   devWarn('Refresh failed', status)     → console.warn, development only
//
// Every argument passes through redact(): JWT-shaped strings and values under
// token/password/secret/code keys are replaced before they reach the console.
// ============================================================================

const JWT_LIKE = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g;
const SENSITIVE_KEY = /token|password|secret|otp|^code$|recovery|authorization/i;

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.replace(JWT_LIKE, '[jwt]');
  if (value === null || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) return `${value.name}: ${redact(value.message)}`;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) && v != null && v !== '' ? '[redacted]' : redact(v, depth + 1);
  }
  return out;
}

export const devLog = (...args: unknown[]): void => {
  if (__DEV__) console.log(...args.map((a) => redact(a)));
};

export const devWarn = (...args: unknown[]): void => {
  if (__DEV__) console.warn(...args.map((a) => redact(a)));
};
