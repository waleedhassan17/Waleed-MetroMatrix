import { fieldProblem } from '../settingsSpec';

const integer = (over: Record<string, unknown> = {}) => ({ type: 'integer', label: 'Attempts', ...over }) as any;

describe('settings field checks', () => {
  it('names the range the server sets, and never "undefined"', () => {
    expect(fieldProblem(integer({ min: 1, max: 10 }), '0')).toBe('Enter a whole number from 1 to 10');
    expect(fieldProblem(integer({ min: 1 }), '0')).toBe('Enter a whole number of 1 or more');
    expect(fieldProblem(integer({ max: 10 }), '11')).toBe('Enter a whole number up to 10');
    expect(fieldProblem(integer(), 'x')).toBe('Enter a whole number');
  });

  it('accepts a whole number inside the range', () => {
    expect(fieldProblem(integer({ min: 1, max: 10 }), '5')).toBeNull();
    expect(fieldProblem(integer(), '2.5')).toBe('Enter a whole number');
  });
});
