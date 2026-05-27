export const centsToDisplay = (cents, locale = 'de-CH', currency = 'CHF') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
