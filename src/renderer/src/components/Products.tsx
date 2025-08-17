import React, { useEffect, useState } from 'react'
import { useProductsStore } from '@renderer/store/products'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Image, Package, Cloud } from 'lucide-react'

export const Products: React.FC = () => {
  const { products, selectedCategory, isLoading, error, setCategory, refresh, addToCart } = useProductsStore()

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(event.target.value)
  }

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
      {/* Category Filter */}
      <div className="flex justify-between items-center">
        <select 
          value={selectedCategory} 
          onChange={handleCategoryChange}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          <option value="all">All Categories</option>
          <option value="BISCUIT & COOKIES">BISCUIT & COOKIES</option>
          <option value="FRUITS">FRUITS</option>
          <option value="DAIRY">DAIRY</option>
        </select>
        
        <div className="text-sm text-gray-600">
          {products.length} products
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No products found
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
            <div className={`${hasImage ? 'hidden' : ''} flex flex-col items-center justify-center text-gray-400`}>
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
              BHD {product.price.toFixed(3)}
            </span>
            <Badge variant="outline" className="text-xs">
              {product.category}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

 