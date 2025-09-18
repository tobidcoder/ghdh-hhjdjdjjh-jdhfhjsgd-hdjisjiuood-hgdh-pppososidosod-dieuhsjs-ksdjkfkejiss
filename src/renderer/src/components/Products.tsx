import React, { useEffect } from 'react'
import { useProductsStore } from '@renderer/store/products'
import { useSalesStore } from '@renderer/store/sales'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Package } from 'lucide-react'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'

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
  const { addToCart } = useProductsStore()

  const handleAddToCart = () => {
    addToCart(product)
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleAddToCart}>
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Product Image Placeholder */}
          <div className="w-full h-24 bg-gray-200 rounded-md flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>

          {/* Product Info */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
              {product.name}
            </h3>
            <p className="text-lg font-bold text-gray-900">{formatPriceBySymbol(product.price)}</p>
            {product.code && <p className="text-xs text-gray-500 font-mono">#{product.code}</p>}
          </div>

          {/* <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">
              {formatPriceBySymbol(product.price)}
            </span>
          </div> */}
          {/* <Badge  className="text-xs">
            {product.category}
          </Badge> */}
        </div>
      </CardContent>
    </Card>
  )
}
