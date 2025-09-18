import formatCurrency, { type CurrencyOptions } from './currencyFormatter'

/**
 * Default currency formatting options for the application
 */
export const defaultCurrencyOptions: CurrencyOptions = {
  showSymbol: true,
  showCode: false,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
}

/**
 * Format price with default application settings
 * @param amount - The amount to format
 * @param options - Optional formatting overrides
 * @returns Formatted currency string
 */
export function formatPrice(amount: number, options: Partial<CurrencyOptions> = {}): string {
  return formatCurrency(amount, {
    ...defaultCurrencyOptions,
    ...options
  })
}

/**
 * Format price with NGN currency (Nigerian Naira)
 * @param amount - The amount to format
 * @param options - Optional formatting overrides
 * @returns Formatted NGN currency string
 */
export function formatNGN(amount: number, options: Partial<CurrencyOptions> = {}): string {
  return formatCurrency(amount, {
    ...defaultCurrencyOptions,
    currency: 'NGN',
    ...options
  })
}

/**
 * Format price with USD currency (US Dollar)
 * @param amount - The amount to format
 * @param options - Optional formatting overrides
 * @returns Formatted USD currency string
 */
export function formatUSD(amount: number, options: Partial<CurrencyOptions> = {}): string {
  return formatCurrency(amount, {
    ...defaultCurrencyOptions,
    currency: 'USD',
    ...options
  })
}

/**
 * Format price with custom currency based on symbol
 * @param amount - The amount to format
 * @param currencySymbol - The currency symbol to determine the currency
 * @param options - Optional formatting overrides
 * @returns Formatted currency string
 */
export function formatPriceBySymbol(
  amount: number,
  //   currencySymbol: string,
  options: Partial<CurrencyOptions> = {}
): string {
  //   const currency = currencySymbol === '₦' ? 'NGN' : 'USD'
  return formatCurrency(amount, {
    ...defaultCurrencyOptions,
    // currency,
    ...options
  })
}

/**
 * Format price without currency symbol (just the number)
 * @param amount - The amount to format
 * @param options - Optional formatting overrides
 * @returns Formatted number string without currency symbol
 */
export function formatPriceOnly(amount: number, options: Partial<CurrencyOptions> = {}): string {
  return formatCurrency(amount, {
    ...defaultCurrencyOptions,
    showSymbol: false,
    ...options
  })
}

/**
 * Format price with 2 decimal places (standard currency display)
 * @param amount - The amount to format
 * @param options - Optional formatting overrides
 * @returns Formatted currency string with 2 decimal places
 */
export function formatPriceStandard(
  amount: number,
  options: Partial<CurrencyOptions> = {}
): string {
  return formatCurrency(amount, {
    ...defaultCurrencyOptions,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  })
}

/**
 * Format price with no decimal places (whole numbers)
 * @param amount - The amount to format
 * @param options - Optional formatting overrides
 * @returns Formatted currency string with no decimal places
 */
export function formatPriceWhole(amount: number, options: Partial<CurrencyOptions> = {}): string {
  return formatCurrency(amount, {
    ...defaultCurrencyOptions,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  })
}

/**
 * Format price with custom decimal places
 * @param amount - The amount to format
 * @param decimals - Number of decimal places
 * @param options - Optional formatting overrides
 * @returns Formatted currency string with custom decimal places
 */
export function formatPriceWithDecimals(
  amount: number,
  decimals: number,
  options: Partial<CurrencyOptions> = {}
): string {
  return formatCurrency(amount, {
    ...defaultCurrencyOptions,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...options
  })
}
