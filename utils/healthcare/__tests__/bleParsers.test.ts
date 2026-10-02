import { base64ToBytes, parseBloodPressure, parseHeartRate, sfloat } from '../bleParsers';

const b = (...xs: number[]) => Uint8Array.from(xs);

describe('base64ToBytes', () => {
  it('decodes what react-native-ble-plx hands over', () => {
    expect(Array.from(base64ToBytes('AEg='))).toEqual([0x00, 0x48]);
    expect(Array.from(base64ToBytes('F0wAAAQ='))).toEqual([0x17, 0x4c, 0x00, 0x00, 0x04]);
  });
});

describe('IEEE-11073 SFLOAT', () => {
  it.each([
    [0x0078, 120],
    [0xf0a0, 16.0], // 160 × 10^-1
    [0xf06b, 10.7],
    [0x0fff, -1], // 12-bit two's complement
    [0x1002, 20], // 2 × 10^1
  ])('0x%s → %p', (raw, value) => {
    expect(sfloat(raw)).toBe(value);
  });

  it('special values are not numbers', () => {
    for (const raw of [0x07ff, 0x0800, 0x07fe, 0x0802, 0x0801]) expect(sfloat(raw)).toBeNaN();
  });
});

describe('Heart Rate Measurement (0x2A37)', () => {
  it('8-bit value, no extras', () => {
    expect(parseHeartRate(b(0x00, 72))).toEqual({ bpm: 72, contact: null, rrMs: [] });
  });

  it('16-bit value with skin contact and an RR interval', () => {
    // flags: uint16 (bit0) | contact detected (bit1) | contact supported (bit2) | RR present (bit4)
    expect(parseHeartRate(b(0x17, 0x4c, 0x00, 0x00, 0x04))).toEqual({ bpm: 76, contact: true, rrMs: [1000] });
  });

  it('contact supported but lost, energy expended, two RR intervals', () => {
    // flags: supported (bit2) | energy (bit3) | RR (bit4); 512/1024 s = 500 ms
    expect(parseHeartRate(b(0x1c, 80, 0x10, 0x00, 0x00, 0x02, 0x00, 0x03))).toEqual({
      bpm: 80,
      contact: false,
      energyKj: 16,
      rrMs: [500, 750],
    });
  });

  it('refuses a truncated frame', () => {
    expect(() => parseHeartRate(b(0x01, 0x4c))).toThrow(/too short/);
    expect(() => parseHeartRate(b(0x00))).toThrow(/too short/);
  });
});

describe('Blood Pressure Measurement (0x2A35)', () => {
  it('mmHg with pulse rate', () => {
    expect(parseBloodPressure(b(0x04, 0x78, 0x00, 0x50, 0x00, 0x5d, 0x00, 0x48, 0x00))).toEqual({
      systolic: 120,
      diastolic: 80,
      meanArterial: 93,
      unit: 'mmHg',
      pulse: 72,
    });
  });

  it('kPa monitors are converted to mmHg', () => {
    const r = parseBloodPressure(b(0x01, 0xa0, 0xf0, 0x6b, 0xf0, 0x7c, 0xf0));
    expect(r).toEqual({ systolic: 120, diastolic: 80.3, meanArterial: 93, unit: 'mmHg' });
  });

  it('reads the monitor timestamp, pulse and user id in spec order', () => {
    // flags: timestamp (bit1) | pulse (bit2) | user id (bit3)
    const frame = b(0x0e, 0x82, 0x00, 0x55, 0x00, 0x62, 0x00, 0xea, 0x07, 10, 2, 9, 58, 30, 0x40, 0x00, 0x02);
    const r = parseBloodPressure(frame);
    expect(r).toMatchObject({ systolic: 130, diastolic: 85, meanArterial: 98, pulse: 64, userId: 2 });
    expect(r.measuredAt).toEqual(new Date(2026, 9, 2, 9, 58, 30));
  });

  it('an unknown monitor date is left out rather than invented', () => {
    const r = parseBloodPressure(b(0x02, 0x78, 0x00, 0x50, 0x00, 0x5d, 0x00, 0, 0, 0, 0, 0, 0, 0));
    expect(r.measuredAt).toBeUndefined();
  });

  it('refuses a truncated frame', () => {
    expect(() => parseBloodPressure(b(0x00, 0x78, 0x00))).toThrow(/too short/);
    expect(() => parseBloodPressure(b(0x04, 0x78, 0x00, 0x50, 0x00, 0x5d, 0x00))).toThrow(/too short/);
  });
});
