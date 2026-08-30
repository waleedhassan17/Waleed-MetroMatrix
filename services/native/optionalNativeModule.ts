import { NativeModules } from 'react-native';

// ============================================================================
// Is a native module actually present in THIS binary?
//
// WHY A try/catch AROUND require() IS NOT ENOUGH
// ----------------------------------------------
// Both of the optional native modules this app uses fail in a way that an
// import-time guard cannot catch, and each fails differently:
//
//   expo-audio  throws at MODULE SCOPE. `expo-audio/build/AudioModule.js`
//               ends with `export default requireNativeModule('ExpoAudio')`,
//               and requireNativeModule throws
//               "Cannot find native module 'ExpoAudio'" when the native half
//               is missing. The throw therefore happens while the module graph
//               is being evaluated, not necessarily inside the frame that
//               called require().
//
//   notifee     throws from a GETTER, on first API ACCESS. See
//               NotifeeNativeModule.js: `get native()` reads
//               NativeModules.NotifeeApiModule and throws
//               "Notifee native module not found." if it is null. The import
//               itself succeeds, so wrapping require() catches nothing at all,
//               and the throw lands on the first `notifee.someMethod()` call.
//
// That second case is exactly the bug this file exists to fix: the guard was
// around the import, and the unguarded call right after it took down the call
// screen with an uncaught error on every incoming call.
//
// THE APPROACH: probe for the native module WITHOUT importing the JS wrapper,
// and only import once we know the native half exists. Nothing here can throw.
//
// This is not only about dev clients. A native module can be absent in any
// build — a stale EAS cache, a config plugin that silently failed, a module
// added to package.json after the last binary was cut. A ringing phone must
// not be the thing that discovers it.
// ============================================================================

/** Cached so the probe and the import happen at most once per process. */
let audioModule: any | undefined;
let notifeeModule: any | undefined;

/**
 * expo-audio, or null when its native half is missing.
 *
 * Probed with `requireOptionalNativeModule`, which returns null instead of
 * throwing (unlike `requireNativeModule`, which is what expo-audio itself
 * uses). Only when that resolves do we import the wrapper — so the throwing
 * module is never evaluated in a build that cannot support it.
 */
export function getAudio(): any | null {
  if (audioModule !== undefined) return audioModule;
  audioModule = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core');
    const present = core?.requireOptionalNativeModule?.('ExpoAudio');
    if (!present) return audioModule;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-audio');
    if (mod?.createAudioPlayer) audioModule = mod;
  } catch {
    audioModule = null;
  }
  return audioModule;
}

/**
 * notifee's default export, or null when its native half is missing.
 *
 * Checks `NativeModules.NotifeeApiModule` first — the exact value notifee's
 * own getter reads before throwing — so we never trigger that getter.
 */
export function getNotifee(): any | null {
  if (notifeeModule !== undefined) return notifeeModule;
  notifeeModule = null;
  try {
    if (!NativeModules?.NotifeeApiModule) return notifeeModule;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@notifee/react-native');
    const api = mod?.default;
    if (api?.displayNotification) notifeeModule = { api, constants: mod };
  } catch {
    notifeeModule = null;
  }
  return notifeeModule;
}

export const hasAudio = (): boolean => getAudio() !== null;
export const hasNotifee = (): boolean => getNotifee() !== null;

/**
 * Run a native call, returning `fallback` if anything at all goes wrong.
 *
 * The last line of defence: even once a module is confirmed present, an
 * individual call can still throw (a permission refused, an OS-level failure).
 * None of this is worth failing a call over.
 */
export function safeNative<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
