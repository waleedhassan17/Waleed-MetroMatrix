// ============================================================================
// NFC badges for the doorstep identity check (react-native-nfc-manager v4).
//
// The provider WRITES a short-lived ID link to an NFC sticker/card they carry;
// the customer READS it by tapping the badge with their phone. Android removed
// phone-to-phone NFC (Beam) in Android 10, so a tag in between is the only way
// two phones can exchange data over NFC today. Any NTAG213/215/216 works.
//
// Native and defensive, like mapLibreSafe.ts: an app build without the module
// (or a phone without NFC) degrades to the QR code and the 6-digit code.
// ============================================================================

import { Platform } from 'react-native';
import type * as NfcModule from 'react-native-nfc-manager';

let mod: typeof NfcModule | null | undefined;
let started: Promise<void> | null = null;

function load(): typeof NfcModule | null {
  if (mod !== undefined) return mod;
  if (Platform.OS === 'web') return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('react-native-nfc-manager') as typeof NfcModule;
    if (!mod?.default) mod = null;
  } catch {
    mod = null;
  }
  return mod;
}

async function ensureStarted(m: typeof NfcModule) {
  if (!started) started = m.default.start().catch((e: any) => {
    started = null;
    throw e;
  });
  return started;
}

/** This build has the NFC module AND this phone has NFC hardware. */
export async function isNfcSupported(): Promise<boolean> {
  const m = load();
  if (!m) return false;
  try {
    const supported = await m.default.isSupported();
    if (supported) await ensureStarted(m);
    return supported;
  } catch {
    return false;
  }
}

/** NFC switched on in the phone's settings. */
export async function isNfcEnabled(): Promise<boolean> {
  const m = load();
  if (!m) return false;
  try {
    return await m.default.isEnabled();
  } catch {
    return false;
  }
}

export async function openNfcSettings(): Promise<void> {
  const m = load();
  if (m) await m.default.goToNfcSetting().catch(() => false);
}

/** Write one URI record to the next tag held to the phone. Rejects with a message fit to show. */
export async function writeUriToTag(uri: string): Promise<void> {
  const m = load();
  if (!m) throw new Error('NFC needs the latest version of the app.');
  const { default: Nfc, NfcTech, Ndef } = m;
  await ensureStarted(m);
  try {
    await Nfc.requestTechnology(NfcTech.Ndef, { alertMessage: 'Hold your NFC badge to the back of the phone' });
    const bytes = Ndef.encodeMessage([Ndef.uriRecord(uri)]);
    if (!bytes) throw new Error('Could not prepare the badge data.');
    await Nfc.ndefHandler.writeNdefMessage(bytes);
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    if (/cancel/i.test(msg)) throw new Error('Cancelled.');
    if (/read.?only|not writable|capacity|size/i.test(msg)) throw new Error('This badge cannot be written (locked or too small). Use an NTAG213 or larger.');
    throw new Error("Couldn't write the badge — hold it still against the phone and try again.");
  } finally {
    Nfc.cancelTechnologyRequest().catch(() => {});
  }
}

/** Read the first URI (or text) record from the next tag held to the phone. */
export async function readUriFromTag(): Promise<string> {
  const m = load();
  if (!m) throw new Error('NFC needs the latest version of the app.');
  const { default: Nfc, NfcTech, Ndef } = m;
  await ensureStarted(m);
  try {
    await Nfc.requestTechnology(NfcTech.Ndef, { alertMessage: "Hold the provider's badge to the back of your phone" });
    const tag = await Nfc.getTag();
    const records = tag?.ndefMessage || [];
    for (const r of records) {
      const payload = Uint8Array.from(r.payload || []);
      if (Ndef.isType(r, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) return Ndef.uri.decodePayload(payload);
      if (Ndef.isType(r, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) return Ndef.text.decodePayload(payload);
    }
    throw new Error('That badge has no MetroMatrix ID on it.');
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    if (/MetroMatrix ID/.test(msg)) throw e;
    if (/cancel/i.test(msg)) throw new Error('Cancelled.');
    throw new Error("Couldn't read the badge — hold it still against the phone and try again.");
  } finally {
    Nfc.cancelTechnologyRequest().catch(() => {});
  }
}

/** Stop waiting for a tag (screen closed, user changed their mind). */
export function cancelNfc(): void {
  const m = load();
  if (m) m.default.cancelTechnologyRequest().catch(() => {});
}
