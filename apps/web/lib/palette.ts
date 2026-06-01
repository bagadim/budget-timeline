export const PALETTE = [
  '#2563eb',
  '#14b8a6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f43f5e',
  '#a855f7',
  '#64748b',
] as const;

export const TAX_PALETTE = ['#ef4444', '#fb923c'] as const;

export const SAVINGS_GREEN = '#10b981'; // reserved for leftover cap + savings line

export const CURRENCIES = ['PLN', 'USD', 'EUR', 'RUB'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Pick the next palette color by item count, cycling. */
export const nextColor = (palette: readonly string[], count: number): string =>
  palette[count % palette.length] ?? '#64748b';
