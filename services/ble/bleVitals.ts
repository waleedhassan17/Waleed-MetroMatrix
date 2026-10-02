// ============================================================================
// Bluetooth LE vital-sign monitors (react-native-ble-plx).
//
// Native, so loaded defensively — exactly like mapLibreSafe.ts: an app binary
// built before the BLE module was added must degrade to "needs the latest app
// build" on the vitals screens, not crash at startup. Web and Expo Go have no
// BLE at all.
//
// Only the standard Bluetooth SIG medical services are used, so any compliant
// chest strap, watch or cuff works — no vendor SDKs:
//   Heart Rate      service 0x180D, measurement 0x2A37 (notify)
//   Blood Pressure  service 0x1810, measurement 0x2A35 (indicate)
// ============================================================================

import { PermissionsAndroid, Platform } from 'react-native';
import type * as BlePlx from 'react-native-ble-plx';

import {
  base64ToBytes,
  parseBloodPressure,
  parseHeartRate,
  type BloodPressureReading,
  type HeartRateReading,
} from '../../utils/healthcare/bleParsers';

const uuid16 = (short: string) => `0000${short}-0000-1000-8000-00805f9b34fb`;
export const VITAL_SERVICES = { heart_rate: uuid16('180d'), blood_pressure: uuid16('1810') } as const;
const MEASUREMENT = { heart_rate: uuid16('2a37'), blood_pressure: uuid16('2a35') } as const;

export type VitalKind = keyof typeof VITAL_SERVICES;

export interface VitalsDevice {
  id: string;
  name: string;
  kind: VitalKind;
  rssi: number | null;
}

export type LiveReading =
  | ({ type: 'heart_rate' } & HeartRateReading)
  | ({ type: 'blood_pressure' } & BloodPressureReading);

let mod: typeof BlePlx | null | undefined;
let manager: BlePlx.BleManager | null = null;

function getManager(): BlePlx.BleManager | null {
  if (manager) return manager;
  if (Platform.OS === 'web') return null;
  if (mod === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mod = require('react-native-ble-plx') as typeof BlePlx;
    } catch {
      mod = null;
    }
  }
  if (!mod) return null;
  try {
    manager = new mod.BleManager();
  } catch {
    // The JS package is present but the native module is not in this binary.
    manager = null;
  }
  return manager;
}

/** Can this app build talk Bluetooth LE at all? */
export const isBleSupported = (): boolean => getManager() !== null;

/** Which monitor a device advertises itself as, from its service UUIDs. */
export function kindFromServices(uuids?: string[] | null): VitalKind | null {
  const all = (uuids || []).map((u) => u.toLowerCase());
  if (all.some((u) => u === '180d' || u.startsWith('0000180d'))) return 'heart_rate';
  if (all.some((u) => u === '1810' || u.startsWith('00001810'))) return 'blood_pressure';
  return null;
}

/**
 * Runtime permissions. Android 12+ asks for "Nearby devices" (scan/connect,
 * declared neverForLocation); Android 11 and older need location for a scan.
 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  if (api >= 31) {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(res).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

/** 'PoweredOn' when ready; anything else means ask the user to turn Bluetooth on. */
export async function bluetoothState(): Promise<string> {
  const m = getManager();
  if (!m) return 'Unsupported';
  try {
    return await m.state();
  } catch {
    return 'Unknown';
  }
}

/** Scans for heart-rate and blood-pressure monitors. Returns a stop function. */
export function scanForMonitors(onDevice: (d: VitalsDevice) => void, onError: (e: Error) => void): () => void {
  const m = getManager();
  if (!m) {
    onError(new Error('Bluetooth needs the latest version of the app.'));
    return () => {};
  }
  m.startDeviceScan(
    [VITAL_SERVICES.heart_rate, VITAL_SERVICES.blood_pressure],
    { allowDuplicates: false },
    (error, device) => {
      if (error) {
        onError(error);
        return;
      }
      if (!device) return;
      const kind = kindFromServices(device.serviceUUIDs);
      if (!kind) return;
      onDevice({ id: device.id, name: device.name || device.localName || 'Unnamed monitor', kind, rssi: device.rssi ?? null });
    }
  );
  return () => {
    try {
      m.stopDeviceScan();
    } catch {
      // already stopped
    }
  };
}

/**
 * Connects and streams readings. Heart-rate monitors send one every second or
 * so; a cuff sends one when its measurement finishes. Returns a disconnect.
 */
export async function connectAndMonitor(
  device: Pick<VitalsDevice, 'id' | 'kind'>,
  onReading: (r: LiveReading) => void,
  onError: (e: Error) => void
): Promise<() => void> {
  const m = getManager();
  if (!m) throw new Error('Bluetooth needs the latest version of the app.');
  m.stopDeviceScan();
  const connected = await m.connectToDevice(device.id, { timeout: 15000 });
  await connected.discoverAllServicesAndCharacteristics();
  const sub = connected.monitorCharacteristicForService(
    VITAL_SERVICES[device.kind],
    MEASUREMENT[device.kind],
    (error, characteristic) => {
      if (error) {
        onError(error);
        return;
      }
      if (!characteristic?.value) return;
      try {
        const bytes = base64ToBytes(characteristic.value);
        onReading(
          device.kind === 'heart_rate'
            ? { type: 'heart_rate', ...parseHeartRate(bytes) }
            : { type: 'blood_pressure', ...parseBloodPressure(bytes) }
        );
      } catch (e: any) {
        // One malformed frame is skipped, not fatal: the next one usually parses.
        if (__DEV__) console.warn('[ble] unreadable frame', e?.message);
      }
    }
  );
  return () => {
    sub.remove();
    m.cancelDeviceConnection(device.id).catch(() => {});
  };
}
