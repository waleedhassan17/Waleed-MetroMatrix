import { adjustmentTitle, decisionBlock, parseAmount, signedAmount } from '../walletRules';

describe('who may decide a wallet adjustment', () => {
  const pending = { status: 'pending' as const, requestedBy: 'admin-a' };

  it('a different super admin may', () => {
    expect(decisionBlock(pending, { id: 'admin-b', isSuperAdmin: true })).toBeNull();
  });
  it('the admin who asked may not (maker-checker)', () => {
    expect(decisionBlock(pending, { id: 'admin-a', isSuperAdmin: true })).toMatch(/different super admin/);
  });
  it('an admin who is not a super admin may not', () => {
    expect(decisionBlock(pending, { id: 'admin-b', isSuperAdmin: false })).toMatch(/super admin/);
    expect(decisionBlock(pending, null)).toMatch(/super admin/);
  });
  it('nobody may decide one that is already decided', () => {
    expect(decisionBlock({ status: 'applied', requestedBy: 'admin-a' }, { id: 'admin-b', isSuperAdmin: true })).toMatch(/already/);
  });
});

describe('wallet wording', () => {
  it('says which way the money goes', () => {
    expect(adjustmentTitle({ direction: 'credit', amount: 2500, currency: 'PKR' })).toBe('Add PKR 2,500');
    expect(adjustmentTitle({ direction: 'debit', amount: 50, currency: 'PKR' })).toBe('Take PKR 50');
    expect(signedAmount({ type: 'credit', amount: 100, currency: 'PKR' })).toBe('+PKR 100');
    expect(signedAmount({ type: 'debit', amount: 100 })).toBe('−PKR 100');
  });

  it('takes positive amounts with at most two decimals', () => {
    expect(parseAmount('2500')).toBe(2500);
    expect(parseAmount('12.50')).toBe(12.5);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('1.234')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
});
