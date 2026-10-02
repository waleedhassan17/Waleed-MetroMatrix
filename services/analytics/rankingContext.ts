// ============================================================================
// Which search showed which provider — so a booking can be credited to it.
//
// Provider search answers with a `searchId` (the server logged that page with
// each card's ranking features). When the customer books one of those
// providers, the booking carries { searchId, position } and the matching model
// learns which rankings led to real, accepted jobs. Kept in memory for the
// session only; ids and positions, nothing personal.
// ============================================================================

type Entry = { searchId: string; position: number; at: number };

const TTL_MS = 60 * 60 * 1000;
const byProvider = new Map<string, Entry>();

/** Record one page of results: ids in the order shown, starting at `offset`. */
export function rememberSearch(searchId: string | undefined | null, providerIds: string[], offset = 0): void {
  if (!searchId) return;
  const at = Date.now();
  providerIds.forEach((id, i) => byProvider.set(id, { searchId, position: offset + i, at }));
  if (byProvider.size > 500) {
    for (const [id, e] of byProvider) if (at - e.at > TTL_MS) byProvider.delete(id);
  }
}

/** The search a provider was last shown in, if recent. */
export function rankingContextFor(providerId: string): { searchId: string; position: number } | undefined {
  const e = byProvider.get(providerId);
  if (!e || Date.now() - e.at > TTL_MS) return undefined;
  return { searchId: e.searchId, position: e.position };
}

export function resetRankingContext(): void {
  byProvider.clear();
}
