// ============================================
// Shared auth-token selection
//
// This backend has three account types — user, provider, admin — and guards
// routes with userOnly / providerOnly / adminOnly. A request carrying the wrong
// type is a 403 ("This route is for user accounts only"), NOT a 401: the caller
// is authenticated, just as the wrong kind of account.
//
// Two things make "which token do I send?" non-obvious here:
//   1. Provider sign-in writes the provider JWT into KeyForStorage.accessToken
//      as well as providerAccessToken, so the user key is NOT guaranteed to
//      hold a user token.
//   2. adminToken outlives a user login unless auth is cleared, so blindly
//      preferring it hijacks requests for a perfectly valid user session.
//
// Both are why every token this backend issues carries `userType` in its
// payload — read it and match it to the route instead of trusting key names.
// ============================================

import { KeyForStorage, retrieveData } from "../../utils/storage_utils/storageUtils";

export type Audience = "user" | "provider" | "admin";

export const isValidToken = (token: any): token is string => {
  if (!token || typeof token !== "string") return false;
  const invalid = ["null", "undefined", "", "false", "0"];
  if (invalid.includes(token.trim().toLowerCase())) return false;
  return token.trim().length >= 10;
};

// Minimal base64url decoder — no dependency, and this runs on Hermes/web alike.
const decodeBase64Url = (input: string): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  let bits = 0;
  let acc = 0;
  let out = "";
  for (const ch of b64) {
    const idx = chars.indexOf(ch);
    if (idx === -1) continue;
    acc = (acc << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((acc >> bits) & 0xff);
    }
  }
  return out;
};

// The account type a token belongs to, or null when the shape is unrecognised.
// This is a routing hint only — the server still verifies the signature.
export const tokenAudience = (token: string): Audience | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(decodeBase64Url(payload));
    const t = claims?.userType;
    return t === "user" || t === "provider" || t === "admin" ? t : null;
  } catch {
    return null;
  }
};

// Storage keys that may hold a token for each audience, best candidate first.
// Provider sign-in only writes accessToken (not providerAccessToken), so the
// provider list must fall through to it.
const KEYS_BY_AUDIENCE: Record<Audience, KeyForStorage[]> = {
  admin: [KeyForStorage.adminToken, KeyForStorage.accessToken],
  provider: [KeyForStorage.providerAccessToken, KeyForStorage.accessToken],
  // User routes read ONLY the user key — never adminToken. Preferring the admin
  // token here is what made a signed-in user's cart/wishlist/orders fail with
  // "This route is for users only".
  user: [KeyForStorage.accessToken],
};

// Pick the stored token that belongs to `audience`. A token whose userType
// contradicts the route is skipped rather than sent — withholding it yields an
// honest 401 instead of a baffling 403. A token we cannot decode is allowed
// through so opaque/legacy tokens keep working.
export const tokenForAudience = async (
  audience: Audience
): Promise<string | null> => {
  for (const key of KEYS_BY_AUDIENCE[audience]) {
    const token = await retrieveData(key);
    if (!isValidToken(token)) continue;

    const actual = tokenAudience(token);
    if (actual === audience || actual === null) return token;
  }
  return null;
};

// Who is signed in right now, per the userType every login path records. Used
// for endpoints that serve all three account types (auth/logout, wallet, …),
// where the path itself declares no audience.
export const sessionAudience = async (): Promise<Audience | null> => {
  const t = await retrieveData(KeyForStorage.userType);
  return t === "user" || t === "provider" || t === "admin" ? t : null;
};

/**
 * The token to attach to a request, given the audience its path declares
 * (null when the path serves all three).
 *
 * Order matters:
 *  1. A token that matches the route's audience — the correct identity.
 *  2. Otherwise the signed-in session's OWN token. Sending it lets the server
 *     answer with a precise role error ("you are signed in as a provider")
 *     instead of a bare "no token", and costs nothing: the server enforces the
 *     guard either way. What we must never do is attach some OTHER identity's
 *     leftover token, which is what preferring adminToken used to do.
 *  3. Legacy order, only when no session was ever recorded.
 */
export const tokenForRequest = async (
  audience: Audience | null
): Promise<{ token: string | null; source: string }> => {
  if (audience) {
    const match = await tokenForAudience(audience);
    if (match) return { token: match, source: audience };
  }

  const session = await sessionAudience();
  if (session) {
    const own = await tokenForAudience(session);
    if (own) return { token: own, source: `session:${session}` };
  }

  for (const key of [KeyForStorage.adminToken, KeyForStorage.accessToken]) {
    const token = await retrieveData(key);
    if (isValidToken(token)) return { token, source: `${key} (legacy)` };
  }
  return { token: null, source: 'none' };
};
