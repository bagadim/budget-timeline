import { describe, expect, it } from 'vitest';
import { centsToDisplay, displayMoney } from './money.js';

describe('centsToDisplay', () => {
  it('formats whole francs', () => {
    expect(centsToDisplay(12345)).toBe('CHF\xA0123.45');
  });

  it('formats zero', () => {
    expect(centsToDisplay(0)).toBe('CHF\xA00.00');
  });

  it('respects an alternate currency', () => {
    expect(centsToDisplay(9999, 'en-US', 'USD')).toBe('$99.99');
  });
});

describe('displayMoney', () => {
  it('defaults to PLN (pl-PL)', () => {
    // pl-PL uses non-breaking space groups and "zł" suffix
    expect(displayMoney(123456, 'PLN')).toBe('1234,56\xA0zł');
  });

  it('formats USD', () => {
    expect(displayMoney(9999, 'USD')).toBe('$99.99');
  });

  it('formats EUR (de-DE)', () => {
    expect(displayMoney(100000, 'EUR')).toBe('1.000,00\xA0€');
  });

  it('formats RUB (ru-RU)', () => {
    expect(displayMoney(50000, 'RUB')).toBe('500,00\xA0₽');
  });
});
