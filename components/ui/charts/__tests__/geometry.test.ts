import { bandPath, compact, linePath, nearestIndex, niceCeil, shortDay, ticks, xAt, yAt } from '../geometry';

const f = { width: 200, height: 100, padLeft: 20, padRight: 20, padTop: 10, padBottom: 10 };

describe('chart geometry', () => {
  it.each([
    [0, 1],
    [0.3, 0.5],
    [4.7, 5],
    [7, 10],
    [12, 20],
    [23, 25],
    [1234, 2000],
  ])('niceCeil(%p) = %p', (v, expected) => expect(niceCeil(v)).toBe(expected));

  it('ticks run from 0 to a clean max', () => {
    expect(ticks(9.4)).toEqual([0, 5, 10]);
    expect(ticks(0)).toEqual([0, 0.5, 1]);
  });

  it('scales map the plot area', () => {
    expect(xAt(0, 3, f)).toBe(20);
    expect(xAt(2, 3, f)).toBe(180);
    expect(yAt(0, 10, f)).toBe(90);
    expect(yAt(10, 10, f)).toBe(10);
    expect(yAt(20, 10, f)).toBe(10); // clamped, never drawn outside
  });

  it('a null is a gap in the line, not a zero', () => {
    expect(linePath([{ x: 0, y: 0 }, null, { x: 2, y: 2 }, { x: 3, y: 3 }])).toBe('M0.0 0.0 M2.0 2.0 L3.0 3.0');
  });

  it('band closes from the upper edge back along the lower one', () => {
    expect(bandPath([{ x: 0, y: 1 }, { x: 1, y: 1 }], [{ x: 0, y: 5 }, { x: 1, y: 5 }])).toBe('M0.0 1.0 L1.0 1.0 L1.0 5.0 L0.0 5.0 Z');
  });

  it('the crosshair snaps to the nearest date', () => {
    expect(nearestIndex(20, 5, f)).toBe(0);
    expect(nearestIndex(99, 5, f)).toBe(2);
    expect(nearestIndex(500, 5, f)).toBe(4);
  });

  it('formats days and compact counts', () => {
    expect(shortDay('2026-09-30')).toBe('Sep 30');
    expect(compact(950)).toBe('950');
    expect(compact(1234)).toBe('1.2K');
    expect(compact(12900)).toBe('13K');
    expect(compact(2.5)).toBe('2.5');
  });
});
