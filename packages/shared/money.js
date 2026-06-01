export const centsToDisplay = (cents, locale = 'de-CH', currency = 'CHF') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);

const CURRENCY_LOCALES = {
  PLN: 'pl-PL',
  USD: 'en-US',
  EUR: 'de-DE',
  RUB: 'ru-RU',
};

export const displayMoney = (minor, currency = 'PLN') =>
  centsToDisplay(minor, CURRENCY_LOCALES[currency] ?? 'en-US', currency);
