import { requestOutcomeFromStatus } from '../statusFromSocket';

describe('requestOutcomeFromStatus', () => {
  it.each([
    ['ACCEPTED', 'accepted'],
    ['accepted', 'accepted'],
    ['confirmed', 'accepted'],
    ['EN_ROUTE', 'accepted'], // a provider who skipped straight to "on my way" still accepted
    ['REJECTED', 'declined'],
    ['declined', 'declined'],
    ['CANCELLED', 'cancelled'],
    ['PENDING', null],
    ['', null],
    [undefined, null],
    [42, null],
  ])('%p → %p', (raw, expected) => {
    expect(requestOutcomeFromStatus(raw)).toBe(expected);
  });
});
