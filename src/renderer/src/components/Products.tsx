import React, { useEffect } from 'react'
import { useProductsStore } from '@renderer/store/products'
import { useSalesStore } from '@renderer/store/sales'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Tag } from 'lucide-react'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'
import { getWholesaleInfo } from '@renderer/lib/wholesalePricing'

export const Products: React.FC = () => {
  const { products, isLoading, error, refresh, searchQuery } = useProductsStore()
  const { unsyncedCount } = useSalesStore()

  useEffect(() => {
    // Only refresh if there's no active search
    if (!searchQuery) {
      refresh()
    }
  }, [refresh, searchQuery])

  // Category filtering is now handled in the main Dashboard component
  // This component just displays the filtered products

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading products...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Product Count and Status */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {searchQuery
            ? `Search results for "${searchQuery}": ${products.length} products`
            : `${products.length} products`}
        </div>
        {unsyncedCount > 0 && (
          <div className="text-xs text-orange-600 font-medium">
            {unsyncedCount} sales pending sync
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          {searchQuery ? 'No products found matching your search' : 'No products available'}
        </div>
      )}
    </div>
  )
}

interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    category: string
    code: string | null
    raw_response?: string | null
  }
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, cartItems } = useProductsStore()

  const handleAddToCart = () => {
    addToCart(product)
  }

  // Check if product is in cart
  const isInCart = cartItems.some((item) => item.id === product.id)

  // Get wholesale information
  const wholesaleInfo = getWholesaleInfo(product.raw_response || null)

  return (
    <Card
      className={`hover:shadow-md transition-all cursor-pointer p-0 ${
        isInCart ? 'border-2 border-[#b2d93b] shadow-md' : 'border border-gray-200'
      }`}
      onClick={handleAddToCart}
    >
      <CardContent className="p-0 pb-3">
        {/* Price at the top */}
        <div className="flex justify-between items-start ">
          <div className="bg-[#052315] rounded-tl-lg  rounded text-white px-1 py-0  text-lg">
            {formatPriceBySymbol(product.price)}
          </div>
          {isInCart && (
            <div className="bg-[#b2d93b] text-white px-1 py-0 rounded-tr-lg rounded text-xs font-medium">
              In Cart
            </div>
          )}
        </div>
        <div className="space-y-2 px-2">
          {/* Product Image Placeholder */}
          <div className="w-full h-20 bg-gray-100 rounded-md flex items-center justify-center">
            <div className="text-gray-400 text-xs font-medium">NO IMAGE</div>
          </div>

          {/* Product Info */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
              {product.name}
            </h3>
            {/* Show wholesale pricing info if available */}
            {wholesaleInfo && (
              <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                <Tag className="w-3 h-3" />
                <span>{wholesaleInfo.message}</span>
              </div>
            )}
            {/* {product.code && <p className="text-xs text-gray-500 font-mono">#{product.code}</p>} */}
          </div>
          {/* <div className="flex mb-2">
            <div className="bg-[#b2d93b]   rounded text-[#052315] px-2 py-0">
              {formatPriceBySymbol(product.price)}
            </div>
          </div> */}
        </div>
      </CardContent>
    </Card>
  )
}
