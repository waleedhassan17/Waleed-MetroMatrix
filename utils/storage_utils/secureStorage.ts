import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Keychain/Keystore-backed storage for auth tokens.
 *
 * Auth tokens used to sit in AsyncStorage, which on Android is an unencrypted
 * SQLite file and on iOS an unencrypted plist — readable by anything with
 * filesystem access (a rooted/jailbroken device, an adb backup, a shared
 * simulator). SecureStore puts them in the iOS Keychain / Android Keystore
 * instead.
 *
 * Two deliberate design points:
 *
 *  1. **Falls back rather than throws.** SecureStore has no web
 *     implementation and can be unavailable in odd runtimes. Whenever it
 *     isn't usable we transparently use AsyncStorage, so the app degrades to
 *     exactly its old behaviour instead of failing to sign in. `isSecure()`
 *     reports which backend is live.
 *
 *  2. **Migrates on read.** Anyone upgrading already has tokens in
 *     AsyncStorage. The first read of a key finds the legacy value, copies it
 *     into SecureStore, deletes the plaintext copy, and returns it — so
 *     existing sessions survive the upgrade without a forced re-login.
 *
 * SecureStore keys must match [A-Za-z0-9._-]; all of ours already do.
 */

const secureStoreAvailable = Platform.OS !== 'web';

/** True when values are actually going to the Keychain/Keystore. */
export const isSecure = (): boolean => secureStoreAvailable;

/** Keys held in secure storage. Everything else stays in AsyncStorage. */
export const SECURE_KEYS = [
  'accessToken',
  'refreshToken',
  'providerAccessToken',
  'adminToken',
  'adminRefreshToken',
] as const;

const secureKeySet = new Set<string>(SECURE_KEYS);

/** Should this key be routed to secure storage? */
export const isSecureKey = (key: string): boolean => secureKeySet.has(key);

export const secureSetItem = async (key: string, value: string): Promise<void> => {
  if (!secureStoreAvailable) {
    await AsyncStorage.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
    // Drop any pre-migration plaintext copy so it can't be read later.
    await AsyncStorage.removeItem(key).catch(() => undefined);
  } catch (error) {
    console.warn(`⚠️ SecureStore write failed for ${key}, falling back to AsyncStorage:`, error);
    await AsyncStorage.setItem(key, value);
  }
};

export const secureGetItem = async (key: string): Promise<string | null> => {
  if (!secureStoreAvailable) {
    return AsyncStorage.getItem(key);
  }

  try {
    const value = await SecureStore.getItemAsync(key);
    if (value !== null) return value;

    // One-time migration of a token written by an older build.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      console.log(`🔐 Migrating ${key} from AsyncStorage into SecureStore`);
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
      return legacy;
    }

    return null;
  } catch (error) {
    console.warn(`⚠️ SecureStore read failed for ${key}, falling back to AsyncStorage:`, error);
    return AsyncStorage.getItem(key);
  }
};

export const secureRemoveItem = async (key: string): Promise<void> => {
  if (!secureStoreAvailable) {
    await AsyncStorage.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`⚠️ SecureStore delete failed for ${key}:`, error);
  }
  // Always clear the AsyncStorage side too, in case a legacy copy lingers.
  await AsyncStorage.removeItem(key).catch(() => undefined);
};

/**
 * Wipe every secure key. AsyncStorage.clear() does NOT touch the Keychain,
 * so sign-out has to call this explicitly or tokens outlive the session.
 */
export const secureClearAll = async (): Promise<void> => {
  await Promise.all(SECURE_KEYS.map((key) => secureRemoveItem(key)));
};
