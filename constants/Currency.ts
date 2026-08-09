/**
 * ============================================
 * Currency
 * ============================================
 * One place that decides what currency this build displays, and one formatter.
 *
 * The doctor dashboard used to render "PKR 3,500" of earnings directly beside
 * a wallet card reading "$0.00 USD" — two sources of truth on one screen. The
 * healthcare module hardcodes PKR client-side, while the wallet echoed
 * whatever the backend document held, and some legacy wallets were created
 * with currency: 'usd'. (networks/wallet/walletApi.ts notes the ledger is
 * meant to be PKR — those USD records are drift, not intent.)
 *
 * Fixing it at the point of ingest means no screen can show two currencies.
 */

export const APP_CURRENCY = 'PKR';

/** Extend this the day the app genuinely supports another currency. */
export const SUPPORTED_CURRENCIES = ['PKR'] as const;

const SYMBOLS: Record<string, string> = {
  pkr: '₨',
  usd: '$',
  eur: '€',
  gbp: '£',
  inr: '₹',
  aed: 'د.إ',
  sar: '﷼',
};

/**
 * Anything this build does not support becomes the app currency.
 *
 * This is a display-metadata correction for drifted records, NOT a conversion:
 * the balance figure itself is untouched, because the ledger was always PKR.
 */
export const normaliseCurrency = (code?: string | null): string => {
  const c = (code || '').trim().toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c) ? c : APP_CURRENCY;
};

export const currencySymbol = (code?: string | null): string => {
  const normalised = normaliseCurrency(code);
  return SYMBOLS[normalised.toLowerCase()] ?? normalised;
};

/** The one money formatter. `PKR 3,500` — or `PKR 3,500.00` with decimals. */
export const formatMoney = (
  amount: number,
  opts?: { code?: string | null; decimals?: boolean },
): string => {
  const code = normaliseCurrency(opts?.code);
  const value = Number.isFinite(amount) ? amount : 0;
  return `${code} ${value.toLocaleString('en-PK', {
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  })}`;
};
