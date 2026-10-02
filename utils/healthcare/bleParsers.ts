// ============================================================================
// Bluetooth GATT parsers for standard medical monitors (Bluetooth SIG specs).
//
//   Heart Rate Measurement      0x2A37 (service 0x180D) — chest straps, watches
//   Blood Pressure Measurement  0x2A35 (service 0x1810) — upper-arm/wrist cuffs
//
// Pure functions over bytes, so every branch is unit-tested against the spec's
// layouts without a device. react-native-ble-plx hands characteristic values
// over as base64; `base64ToBytes` turns them into bytes first.
// ============================================================================

/** base64 → bytes, with no dependency on atob/Buffer being present. */
export function base64ToBytes(b64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = String(b64 || '').replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    buffer = (buffer << 6) | alphabet.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);

/**
 * IEEE-11073 16-bit SFLOAT: 4-bit signed exponent, 12-bit signed mantissa,
 * value = mantissa × 10^exponent. NaN / NRes / ±INF / reserved come back NaN.
 */
export function sfloat(raw: number): number {
  const mantissaBits = raw & 0x0fff;
  if ([0x07ff, 0x0800, 0x07fe, 0x0802, 0x0801].includes(mantissaBits)) return NaN;
  const mantissa = mantissaBits >= 0x0800 ? mantissaBits - 0x1000 : mantissaBits;
  let exponent = (raw >> 12) & 0x0f;
  if (exponent >= 0x08) exponent -= 0x10;
  // Rounded to the precision the exponent implies, so 16.0 is not 15.999999.
  const value = mantissa * Math.pow(10, exponent);
  return exponent < 0 ? Number(value.toFixed(-exponent)) : value;
}

export interface HeartRateReading {
  bpm: number;
  /** null when the sensor does not report skin contact. */
  contact: boolean | null;
  energyKj?: number;
  /** Beat-to-beat intervals in milliseconds. */
  rrMs: number[];
}

/** Heart Rate Measurement (0x2A37). Throws on a frame too short for its flags. */
export function parseHeartRate(bytes: Uint8Array): HeartRateReading {
  if (bytes.length < 2) throw new Error('Heart-rate frame too short');
  const flags = bytes[0];
  let i = 1;
  const wide = (flags & 0x01) !== 0;
  if (wide && bytes.length < 3) throw new Error('Heart-rate frame too short');
  const bpm = wide ? u16(bytes, i) : bytes[i];
  i += wide ? 2 : 1;
  const contactSupported = (flags & 0x04) !== 0;
  const contact = contactSupported ? (flags & 0x02) !== 0 : null;
  const reading: HeartRateReading = { bpm, contact, rrMs: [] };
  if (flags & 0x08) {
    if (bytes.length < i + 2) throw new Error('Heart-rate frame too short');
    reading.energyKj = u16(bytes, i);
    i += 2;
  }
  if (flags & 0x10) {
    for (; i + 1 < bytes.length; i += 2) reading.rrMs.push(Math.round((u16(bytes, i) / 1024) * 1000));
  }
  return reading;
}

export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  meanArterial: number;
  /** Always mmHg here — kPa monitors are converted. */
  unit: 'mmHg';
  pulse?: number;
  /** The monitor's own clock, when it sends one (no time zone in the spec). */
  measuredAt?: Date;
  userId?: number;
}

const KPA_TO_MMHG = 7.50062;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Blood Pressure Measurement (0x2A35). Throws on a frame too short for its flags. */
export function parseBloodPressure(bytes: Uint8Array): BloodPressureReading {
  if (bytes.length < 7) throw new Error('Blood-pressure frame too short');
  const flags = bytes[0];
  const kpa = (flags & 0x01) !== 0;
  const conv = (v: number) => (kpa ? round1(v * KPA_TO_MMHG) : round1(v));
  const reading: BloodPressureReading = {
    systolic: conv(sfloat(u16(bytes, 1))),
    diastolic: conv(sfloat(u16(bytes, 3))),
    meanArterial: conv(sfloat(u16(bytes, 5))),
    unit: 'mmHg',
  };
  let i = 7;
  if (flags & 0x02) {
    if (bytes.length < i + 7) throw new Error('Blood-pressure frame too short');
    const year = u16(bytes, i);
    const [month, day, hours, minutes, seconds] = [bytes[i + 2], bytes[i + 3], bytes[i + 4], bytes[i + 5], bytes[i + 6]];
    // Year/month/day 0 mean "unknown" in the spec.
    if (year && month && day) reading.measuredAt = new Date(year, month - 1, day, hours, minutes, seconds);
    i += 7;
  }
  if (flags & 0x04) {
    if (bytes.length < i + 2) throw new Error('Blood-pressure frame too short');
    const pulse = sfloat(u16(bytes, i));
    if (Number.isFinite(pulse)) reading.pulse = Math.round(pulse);
    i += 2;
  }
  if (flags & 0x08 && bytes.length > i) {
    reading.userId = bytes[i];
  }
  return reading;
}
