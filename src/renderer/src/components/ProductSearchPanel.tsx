import React from 'react'
import { Input } from '@renderer/components/ui/input'
import { Search } from 'lucide-react'
import { Products } from '@renderer/components/Products'

interface ProductCategory {
  id: number
  name: string
  image: string | null
  products_count: number
  created_at: string
  updated_at: string
}

interface ProductSearchPanelProps {
  productSearchQuery: string
  selectedCategory: number | null
  productCategories: ProductCategory[]
  autoAddNotification: {
    product: { id: string; name: string; price: number; code: string | null }
    visible: boolean
  } | null
  isSearchingCode: boolean
  isSearchCleared: boolean
  onProductSearchQueryChange: (value: string) => void
  onCategoryChange: (categoryId: string) => void
  onClearAutoAddNotification: () => void
  onClearProductSearch: () => void
  onProductListKeyPress: (event: React.KeyboardEvent) => void
  looksLikeProductCode: (query: string) => boolean
}

export const ProductSearchPanel: React.FC<ProductSearchPanelProps> = ({
  productSearchQuery,
  selectedCategory,
  productCategories,
  autoAddNotification,
  isSearchingCode,
  isSearchCleared,
  onProductSearchQueryChange,
  onCategoryChange,
  onClearAutoAddNotification,
  onClearProductSearch,
  onProductListKeyPress,
  looksLikeProductCode
}) => {
  return (
    <div className="flex-1 pt-3 flex flex-col bg-gray-50">
      {/* Product Search and Filter */}
      <div className="px-4 pb-4">
        {/* Auto-add notification */}
        {autoAddNotification && (
          <div className="mb-3 p-3 bg-green-100 border border-green-300 rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-800">
                <span className="font-medium">{autoAddNotification.product.name}</span>{' '}
                automatically added to cart and search cleared
              </span>
            </div>
            <button
              onClick={onClearAutoAddNotification}
              className="text-green-600 cursor-pointer hover:text-green-800"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search Product"
              className={`h-10 pl-10 pr-10 transition-all duration-200 ${
                isSearchCleared ? 'bg-blue-50 border-blue-300' : ''
              }`}
              value={productSearchQuery}
              onChange={(e) => onProductSearchQueryChange(e.target.value)}
              onKeyPress={onProductListKeyPress}
            />
            {isSearchingCode && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {productSearchQuery && (
              <button
                onClick={onClearProductSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {/* Product code hint */}
          {productSearchQuery && looksLikeProductCode(productSearchQuery) && (
            <div className="mt-1 text-xs text-blue-600 flex items-center space-x-1">
              <Search className="w-3 h-3" />
              <span>Searching for exact product code...</span>
            </div>
          )}
          <div className="flex flex-col space-y-1">
            <select
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              value={selectedCategory?.toString() || 'all'}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="all">All Categories</option>
              {productCategories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
            {selectedCategory && (
              <div className="text-xs text-blue-600 font-medium">
                Filtering: {productCategories.find((cat) => cat.id === selectedCategory)?.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        <Products />
      </div>
    </div>
  )
}
