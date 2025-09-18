interface CurrencyOptions {
  currency?: string
  locale?: string
  showSymbol?: boolean
  showCode?: boolean
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

type CurrencyInput =
  | number
  | string
  | null
  | undefined
  | { amount: number; currency?: string }
  | { value: number; currency?: string }
  | { price: number; currency?: string }

/**
 * Universal currency formatter that handles any input type and returns standardized formatting
 *
 * @param input - Number, string, object with amount/value/price, or null/undefined
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency("1234.56") // "$1,234.56"
 * formatCurrency("$1,234.56") // "$1,234.56"
 * formatCurrency({ amount: 1234.56 }) // "$1,234.56"
 * formatCurrency(null) // "$0.00"
 * formatCurrency("invalid") // "$0.00"
 */
function formatCurrency(input: CurrencyInput, options: CurrencyOptions = {}): string {
  const {
    currency = 'NGN',
    locale = 'en-NG',
    showSymbol = true,
    showCode = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options

  // Extract numeric value from any input type
  const amount = extractAmount(input)

  // Handle edge cases
  if (!isFinite(amount)) {
    return formatAmount(0, {
      currency,
      locale,
      showSymbol,
      showCode,
      minimumFractionDigits,
      maximumFractionDigits
    })
  }

  return formatAmount(amount, {
    currency,
    locale,
    showSymbol,
    showCode,
    minimumFractionDigits,
    maximumFractionDigits
  })
}

/**
 * Extract numeric amount from various input types
 */
function extractAmount(input: CurrencyInput): number {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return 0
  }

  // Handle number input
  if (typeof input === 'number') {
    return input
  }

  // Handle string input
  if (typeof input === 'string') {
    return parseStringAmount(input)
  }

  // Handle object input
  if (typeof input === 'object') {
    // Try different common property names
    const amount =
      (input as any).amount ??
      (input as any).value ??
      (input as any).price ??
      (input as any).total ??
      (input as any).cost ??
      (input as any).sum

    if (typeof amount === 'number') {
      return amount
    }

    if (typeof amount === 'string') {
      return parseStringAmount(amount)
    }
  }

  // Fallback
  return 0
}

/**
 * Parse string amounts (handles currency symbols, commas, etc.)
 */
function parseStringAmount(str: string): number {
  if (!str || typeof str !== 'string') {
    return 0
  }

  // Remove common currency symbols and formatting
  const cleanString = str
    .replace(/[$€£¥₹₦¢]/g, '') // Remove currency symbols
    .replace(/[^\d.-]/g, '') // Keep only digits, decimals, and minus
    .replace(/^-+/, '-') // Keep only one minus at start
    .replace(/-+$/, '') // Remove trailing minus
    .trim()

  // Handle empty string after cleaning
  if (!cleanString) {
    return 0
  }

  // Handle multiple decimals (keep only the last one)
  const parts = cleanString.split('.')
  if (parts.length > 2) {
    const integerPart = parts.slice(0, -1).join('')
    const decimalPart = parts[parts.length - 1]
    const reconstructed = `${integerPart}.${decimalPart}`
    const parsed = parseFloat(reconstructed)
    return isNaN(parsed) ? 0 : parsed
  }

  const parsed = parseFloat(cleanString)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format the numeric amount with proper currency formatting
 */
function formatAmount(
  amount: number,
  options: Required<
    Pick<
      CurrencyOptions,
      | 'currency'
      | 'locale'
      | 'showSymbol'
      | 'showCode'
      | 'minimumFractionDigits'
      | 'maximumFractionDigits'
    >
  >
): string {
  const { currency, locale, showSymbol, showCode, minimumFractionDigits, maximumFractionDigits } =
    options

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: showSymbol ? currency : undefined,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping: true
    })

    let formatted = formatter.format(amount)

    // Add currency code if requested
    if (showCode && !showSymbol) {
      formatted += ` ${currency}`
    } else if (showCode && showSymbol) {
      formatted += ` ${currency}`
    }

    return formatted
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    const rounded = Math.round(amount * 100) / 100
    const parts = rounded.toString().split('.')
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const decimalPart = (parts[1] || '')
      .padEnd(minimumFractionDigits, '0')
      .slice(0, maximumFractionDigits)

    let result = minimumFractionDigits > 0 ? `${integerPart}.${decimalPart}` : integerPart

    if (showSymbol) {
      result = `₦${result}` // Default to NGN symbol
    }

    if (showCode) {
      result += ` ${currency}`
    }

    return result
  }
}

// Export the main function
export default formatCurrency
export { formatCurrency, type CurrencyInput, type CurrencyOptions }

// Usage examples:
/*
import formatCurrency from './currency-formatter';

// Number inputs
console.log(formatCurrency(1234.56)); // "₦1,234.56"
console.log(formatCurrency(0)); // "₦0.00"
console.log(formatCurrency(-50.75)); // "-₦50.75"

// String inputs
console.log(formatCurrency("1234.56")); // "₦1,234.56"
console.log(formatCurrency("₦1,234.56")); // "₦1,234.56"
console.log(formatCurrency("$1,234.56")); // "₦1,234.56"
console.log(formatCurrency("1,234.56")); // "₦1,234.56"
console.log(formatCurrency("invalid")); // "₦0.00"
console.log(formatCurrency("")); // "₦0.00"

// Object inputs
console.log(formatCurrency({ amount: 1234.56 })); // "₦1,234.56"
console.log(formatCurrency({ value: 1234.56 })); // "₦1,234.56"
console.log(formatCurrency({ price: 1234.56 })); // "₦1,234.56"
console.log(formatCurrency({ total: 1234.56 })); // "₦1,234.56"
console.log(formatCurrency({ amount: "1234.56" })); // "₦1,234.56"

// Null/undefined
console.log(formatCurrency(null)); // "₦0.00"
console.log(formatCurrency(undefined)); // "₦0.00"

// With options
console.log(formatCurrency(1234.56, { currency: 'USD', locale: 'en-US' })); // "$1,234.56"
console.log(formatCurrency(1234.56, { showSymbol: false })); // "1,234.56"
console.log(formatCurrency(1234.56, { showCode: true })); // "₦1,234.56 NGN"
console.log(formatCurrency(1234.5, { minimumFractionDigits: 0 })); // "₦1,234"
console.log(formatCurrency(1234.567, { maximumFractionDigits: 3 })); // "₦1,234.567"

// API response examples
const apiResponse = { data: { amount: 1234.56 } };
console.log(formatCurrency(apiResponse.data)); // "₦1,234.56"

const product = { price: "29.99", currency: "NGN" };
console.log(formatCurrency(product)); // "₦29.99"
*/
