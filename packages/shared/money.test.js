import { describe, expect, it } from 'vitest';
import { centsToDisplay } from './money.js';

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
