// ============================================================================
// Safe MapLibre loader
//
// MapLibre is a NATIVE module. Its JS entry calls TurboModuleRegistry
// .getEnforcing('MLRNCameraModule') at module scope, which THROWS when the
// binary was built before MapLibre was added — and because the three map
// screens are reachable from the navigator, that throw happens while the bundle
// is still evaluating. The result is a dead app at startup ("[runtime not
// ready]"), not a broken map screen: an old dev client or preview APK cannot
// open ANY part of the app.
//
// So the import is deferred behind a try/catch and cached. A stale binary now
// degrades to "the map needs a new build" on three screens while everything
// else works.
//
// `import type` is erased at compile time, so this keeps full type-checking on
// the components without pulling the module in at import time. Same shape as
// isCallingSupported() in services/call/usePeerConnection.ts, which does this
// for react-native-webrtc.
// ============================================================================

import type * as MapLibre from '@maplibre/maplibre-react-native';

/** undefined = not probed yet, null = not in this binary. */
let cached: typeof MapLibre | null | undefined;

export function loadMapLibre(): typeof MapLibre | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cached = require('@maplibre/maplibre-react-native') as typeof MapLibre;
    // getEnforcing throws on a missing module, but guard the shape too — a
    // half-linked build should not read as working.
    if (!cached?.Map || !cached?.Camera) cached = null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Can this build render a map at all? Cached — a native module cannot appear at runtime. */
export const isMapsSupported = (): boolean => loadMapLibre() !== null;
