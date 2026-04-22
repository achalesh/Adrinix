export const formatCurrency = (amount: number, locale: string = 'en-US', currencyCode: string = 'USD') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    // Fallback if currency code is invalid on older browsers
    return `$${amount.toFixed(2)}`;
  }
};

export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)', locale: 'en-US' },
  { code: 'EUR', name: 'Euro (€)', locale: 'en-IE' },
  { code: 'GBP', name: 'British Pound (£)', locale: 'en-GB' },
  { code: 'INR', name: 'Indian Rupee (₹)', locale: 'en-IN' },
  { code: 'AUD', name: 'Australian Dollar (A$)', locale: 'en-AU' },
  { code: 'CAD', name: 'Canadian Dollar (C$)', locale: 'en-CA' },
  { code: 'JPY', name: 'Japanese Yen (¥)', locale: 'ja-JP' },
  { code: 'ZAR', name: 'South African Rand (R)', locale: 'en-ZA' }
];
