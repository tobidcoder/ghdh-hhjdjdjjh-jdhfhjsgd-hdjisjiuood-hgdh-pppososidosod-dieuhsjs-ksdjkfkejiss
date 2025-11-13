/**
 * Utility functions for calculating wholesale pricing
 */

export interface WholesaleData {
  wholesale_type: 'fixed' | 'percentage'
  wholesale_value: number
  wholesale_min: number
  product_price: number
}

/**
 * Parse the raw_response from a product to extract wholesale data
 */
export function parseWholesaleData(rawResponse: string | null): WholesaleData | null {
  if (!rawResponse) return null

  try {
    const data = JSON.parse(rawResponse)
    const attributes = data?.attributes

    if (!attributes) return null

    return {
      wholesale_type: attributes.wholesale_type || 'fixed',
      wholesale_value: parseFloat(attributes.wholesale_value) || 0,
      wholesale_min: parseInt(attributes.wholesale_min) || 0,
      product_price: parseFloat(attributes.product_price) || 0
    }
  } catch (error) {
    console.error('Failed to parse wholesale data:', error)
    return null
  }
}

/**
 * Calculate the effective price for a product based on quantity and wholesale rules
 * @param basePrice - The regular price of the product
 * @param quantity - The quantity being purchased
 * @param rawResponse - The raw API response containing wholesale data
 * @returns The effective price per unit
 */
export function calculateWholesalePrice(
  basePrice: number,
  quantity: number,
  rawResponse: string | null
): number {
  const wholesaleData = parseWholesaleData(rawResponse)

  // If no wholesale data or quantity is below minimum, return base price
  if (!wholesaleData || quantity < wholesaleData.wholesale_min) {
    return basePrice
  }

  // If wholesale_value is 0, return base price
  if (wholesaleData.wholesale_value === 0) {
    return basePrice
  }

  // Calculate based on wholesale type
  if (wholesaleData.wholesale_type === 'fixed') {
    // Fixed type: the wholesale_value is the new price
    return wholesaleData.wholesale_value
  } else {
    // Percentage type: the wholesale_value is a discount percentage
    const discountAmount = (basePrice * wholesaleData.wholesale_value) / 100
    return basePrice - discountAmount
  }
}

/**
 * Check if a quantity qualifies for wholesale pricing
 */
export function qualifiesForWholesale(quantity: number, rawResponse: string | null): boolean {
  const wholesaleData = parseWholesaleData(rawResponse)

  if (!wholesaleData || wholesaleData.wholesale_value === 0) {
    return false
  }

  return quantity >= wholesaleData.wholesale_min
}

/**
 * Get wholesale information for display purposes
 */
export function getWholesaleInfo(rawResponse: string | null): {
  hasWholesale: boolean
  minQuantity: number
  discountType: 'fixed' | 'percentage'
  discountValue: number
  message: string
} | null {
  const wholesaleData = parseWholesaleData(rawResponse)

  if (!wholesaleData || wholesaleData.wholesale_value === 0) {
    return null
  }

  const message =
    wholesaleData.wholesale_type === 'fixed'
      ? `Buy ${wholesaleData.wholesale_min}+ for ${wholesaleData.wholesale_value} each`
      : `Buy ${wholesaleData.wholesale_min}+ and save ${wholesaleData.wholesale_value}%`

  return {
    hasWholesale: true,
    minQuantity: wholesaleData.wholesale_min,
    discountType: wholesaleData.wholesale_type,
    discountValue: wholesaleData.wholesale_value,
    message
  }
}
