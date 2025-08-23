import React, { useEffect, useState } from 'react'
import { useProductsStore } from '@renderer/store/products'
import { useSalesStore } from '@renderer/store/sales'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Package, Cloud } from 'lucide-react'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'

export const Products: React.FC = () => {
  const {
    products,
    isLoading,
    error,
    refresh,
    searchQuery
  } = useProductsStore()
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
            {/* Search and Product Count */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {searchQuery && (
            <button
              onClick={() => {
                useProductsStore.getState().setSearchQuery('')
                refresh()
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
            >
              Clear Search
            </button>
          )}
        </div>

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
        <div className="text-center text-gray-500 py-8">No products found</div>
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
  const { addToCart } = useProductsStore()
  const [isHovered, setIsHovered] = useState(false)

  // Parse raw response to get additional product info
  const productData = product.raw_response ? JSON.parse(product.raw_response) : null
  const hasImage = productData?.attributes?.image || productData?.image
  const isRetail = productData?.attributes?.is_retail || productData?.is_retail

  const handleClick = () => {
    addToCart(product)
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isHovered ? 'shadow-lg scale-105 border-blue-300' : 'hover:shadow-md'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        {/* Product Image */}
        <div className="relative mb-3">
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {hasImage ? (
              <img
                src={hasImage}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <div
              className={`${hasImage ? 'hidden' : ''} flex flex-col items-center justify-center text-gray-400`}
            >
              <Package className="w-8 h-8 mb-1" />
              <span className="text-xs text-center">NO IMAGE AVAILABLE</span>
            </div>
          </div>

          {/* Retail Product Badge */}
          {isRetail && (
            <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-xs">
              Retail Product
            </Badge>
          )}

          {/* Cloud Icon for Online Products */}
          {product.raw_response && (
            <div className="absolute top-2 right-2">
              <Cloud className="w-4 h-4 text-blue-500" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
            {product.name}
          </h3>

          {/* Product Code */}
          {product.code && (
            <div className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
              {product.code}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">
              {formatPriceBySymbol(product.price)}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {product.category}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
