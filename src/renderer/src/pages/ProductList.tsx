import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import {
  ArrowLeft,
  Search,
  Printer,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Minus,
  Plus,
  Settings2
} from 'lucide-react'
import { formatCurrency } from '@renderer/lib/currencyFormatter'
import { showError, showSuccess } from '@renderer/utils/notifications'
import JsBarcode from 'jsbarcode'

interface Product {
  id: string
  name: string
  price: number
  category: string
  code: string | null
}

interface SelectedProduct {
  product: Product
  tagQuantity: number
}

interface PrintSettings {
  showName: boolean
  showBarcode: boolean
  showPrice: boolean
  tagsPerPage: number
  tagWidth: number
  tagHeight: number
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  showName: true,
  showBarcode: true,
  showPrice: true,
  tagsPerPage: 28,
  tagWidth: 205,
  tagHeight: 155
}

const ProductList: React.FC = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProduct>>(new Map())
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS)
  const [isPrinting, setIsPrinting] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const ITEMS_PER_PAGE = 20

  // Fetch products with pagination
  const fetchProducts = useCallback(async (query: string = '', page: number = 1) => {
    setLoading(true)
    try {
      let data: Product[]
      if (query.trim()) {
        data = await window.api.db.searchProducts(query, 500) // Get more for filtering
      } else {
        data = await window.api.db.listProducts(undefined, 500)
      }

      setTotalProducts(data.length)

      // Paginate locally
      const startIndex = (page - 1) * ITEMS_PER_PAGE
      const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE)
      setProducts(paginatedData)
    } catch (error) {
      console.error('Error fetching products:', error)
      showError('Failed to load products', 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchProducts(value, 1)
    }, 300)
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchProducts(searchQuery, newPage)
  }

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE)

  // Toggle product selection
  const toggleProductSelection = (product: Product) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev)
      if (newMap.has(product.id)) {
        newMap.delete(product.id)
      } else {
        newMap.set(product.id, { product, tagQuantity: 1 })
      }
      return newMap
    })
  }

  // Update tag quantity for selected product
  const updateTagQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setSelectedProducts((prev) => {
      const newMap = new Map(prev)
      const item = newMap.get(productId)
      if (item) {
        newMap.set(productId, { ...item, tagQuantity: quantity })
      }
      return newMap
    })
  }

  // Select all on current page
  const selectAllOnPage = () => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev)
      products.forEach((product) => {
        if (!newMap.has(product.id)) {
          newMap.set(product.id, { product, tagQuantity: 1 })
        }
      })
      return newMap
    })
  }

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedProducts(new Map())
  }

  // Generate Barcode as SVG string
  const generateBarcode = (data: string): string => {
    try {
      // Create a temporary SVG element
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      JsBarcode(svg, data, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 0
      })
      return svg.outerHTML
    } catch {
      return ''
    }
  }

  // Generate print HTML for price tags
  const generatePrintHTML = async (): Promise<string> => {
    const selectedArray = Array.from(selectedProducts.values())
    const { showName, showBarcode, showPrice, tagsPerPage, tagWidth, tagHeight } = printSettings

    // Generate all tags
    const tags: { product: Product; barcode: string }[] = []
    for (const item of selectedArray) {
      const barcodeData = item.product.code || item.product.id
      const barcode = showBarcode ? generateBarcode(barcodeData) : ''
      for (let i = 0; i < item.tagQuantity; i++) {
        tags.push({ product: item.product, barcode })
      }
    }

    // Calculate grid columns based on tags per page
    const columns = Math.min(tagsPerPage, 4) // Max 4 columns

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Price Tags</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page {
              size: A4;
              margin: 5mm;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 5px;
            }
            .page {
              display: grid;
              grid-template-columns: repeat(${columns}, 1fr);
              gap: 10px;
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            .tag {
              width: ${tagWidth}px;
              height: ${tagHeight}px;
              border: 2px solid #333;
              border-radius: 8px;
              padding: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              background: white;
              overflow: hidden;
            }
            .tag-name {
              font-size: 10px;
              font-weight: bold;
              color: #333;
              margin-bottom: 5px;
              line-height: 1.2;
              max-height: 36px;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
            .tag-barcode {
              margin: 5px 0;
            }
            .tag-barcode svg {
              max-width: 100%;
              height: 40px;
            }
            .tag-price {
              font-size: 18px;
              font-weight: bold;
              color: #052315;
              margin-top: 5px;
            }
            .tag-code {
              font-size: 9px;
              color: #666;
              margin-top: 3px;
            }
            @media print {
              body {
                padding: 0;
              }
              .tag {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${generatePages(tags, tagsPerPage, showName, showBarcode, showPrice)}
        </body>
      </html>
    `
    return html
  }

  // Generate pages for print
  const generatePages = (
    tags: { product: Product; barcode: string }[],
    tagsPerPage: number,
    showName: boolean,
    showBarcode: boolean,
    showPrice: boolean
  ): string => {
    const pages: string[] = []
    for (let i = 0; i < tags.length; i += tagsPerPage) {
      const pageTags = tags.slice(i, i + tagsPerPage)
      const pageHTML = `
        <div class="page">
          ${pageTags
            .map(
              ({ product, barcode }) => `
            <div class="tag">
              ${showName ? `<div class="tag-name">${product.name}</div>` : ''}
              ${showBarcode && barcode ? `<div class="tag-barcode">${barcode}</div>` : ''}
              ${showPrice ? `<div class="tag-price">${formatCurrencyForPrint(product.price)}</div>` : ''}
              ${product.code ? `<div class="tag-code">${product.code}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
      pages.push(pageHTML)
    }
    return pages.join('')
  }

  // Format currency for print (without special characters that might break)
  const formatCurrencyForPrint = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  // Handle print
  const handlePrint = async () => {
    if (selectedProducts.size === 0) {
      showError('Please select at least one product', 'No Selection')
      return
    }

    setIsPrinting(true)
    try {
      const html = await generatePrintHTML()
      await window.api.print.receipt(html, { silent: false })
      showSuccess('Price tags sent to printer', 'Success')
      setShowPrintModal(false)
    } catch (error) {
      console.error('Print error:', error)
      showError('Failed to print price tags', 'Print Error')
    } finally {
      setIsPrinting(false)
    }
  }

  // Handle print preview
  const handlePrintPreview = async () => {
    if (selectedProducts.size === 0) {
      showError('Please select at least one product', 'No Selection')
      return
    }

    setIsPrinting(true)
    try {
      const html = await generatePrintHTML()
      await window.api.print.openPreview(html)
      showSuccess('Print preview opened', 'Success')
    } catch (error) {
      console.error('Print preview error:', error)
      showError('Failed to generate print preview', 'Print Error')
    } finally {
      setIsPrinting(false)
    }
  }

  // Get total tags count
  const getTotalTagsCount = (): number => {
    return Array.from(selectedProducts.values()).reduce((sum, item) => sum + item.tagQuantity, 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-[#052315] hover:bg-[#052315]/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-[#052315]">Product List</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="border-gray-300"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Print Settings
            </Button>
            <Button
              size="sm"
              onClick={() => setShowPrintModal(true)}
              disabled={selectedProducts.size === 0}
              className="bg-[#052315] hover:bg-[#0a3d2a] text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Tags ({selectedProducts.size})
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Selection Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by product name or code..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#052315] focus:border-[#052315]"
            />
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
              {selectedProducts.size > 0 && ` (${getTotalTagsCount()} tags)`}
            </span>
            <Button variant="outline" size="sm" onClick={selectAllOnPage}>
              Select All on Page
            </Button>
            {selectedProducts.size > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllSelections}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading products...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => {
                const isSelected = selectedProducts.has(product.id)
                const selectedItem = selectedProducts.get(product.id)

                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-[#052315] bg-green-50'
                        : 'hover:shadow-md hover:border-gray-300'
                    }`}
                    onClick={() => toggleProductSelection(product)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#052315] truncate">{product.name}</h3>
                          {product.code && (
                            <p className="text-sm text-gray-500 mt-1">Code: {product.code}</p>
                          )}
                          <p className="text-lg font-bold text-[#052315] mt-2">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#052315] border-[#052315]'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>

                      {/* Tag quantity control - only show when selected */}
                      {isSelected && selectedItem && (
                        <div
                          className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-sm text-gray-600">Tag quantity:</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                updateTagQuantity(product.id, selectedItem.tagQuantity - 1)
                              }
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {selectedItem.tagQuantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                updateTagQuantity(product.id, selectedItem.tagQuantity + 1)
                              }
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-6 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (currentPage <= 4) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = currentPage - 3 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={currentPage === pageNum ? 'bg-[#052315] hover:bg-[#0a3d2a]' : ''}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-500 ml-4">
                  Page {currentPage} of {totalPages} ({totalProducts} products)
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Print Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#052315]">Print Price Tags</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPrintModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-[#052315] mb-2">Summary</h3>
                <p className="text-sm text-gray-600">
                  {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-gray-600">Total tags to print: {getTotalTagsCount()}</p>
                <p className="text-sm text-gray-600">
                  Estimated pages: {Math.ceil(getTotalTagsCount() / printSettings.tagsPerPage)}
                </p>
              </div>

              {/* Selected Products List */}
              <div className="space-y-2">
                <h3 className="font-semibold text-[#052315]">Selected Products</h3>
                {Array.from(selectedProducts.values()).map(({ product, tagQuantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#052315] truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(product.price)}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateTagQuantity(product.id, tagQuantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{tagQuantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateTagQuantity(product.id, tagQuantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Badge variant="secondary">
                        {tagQuantity} tag{tagQuantity !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => toggleProductSelection(product)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowPrintModal(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintPreview}
                disabled={isPrinting}
                className="border-[#052315] text-[#052315] hover:bg-[#052315]/10"
              >
                <Printer className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                className="bg-[#052315] hover:bg-[#0a3d2a] text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                {isPrinting ? 'Printing...' : 'Print Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#052315]">Print Settings</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tag Content */}
              <div>
                <h3 className="font-semibold text-[#052315] mb-3">Tag Content</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printSettings.showName}
                      onChange={(e) =>
                        setPrintSettings((prev) => ({ ...prev, showName: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[#052315] focus:ring-[#052315]"
                    />
                    <span>Show Product Name</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printSettings.showBarcode}
                      onChange={(e) =>
                        setPrintSettings((prev) => ({ ...prev, showBarcode: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[#052315] focus:ring-[#052315]"
                    />
                    <span>Show Barcode</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printSettings.showPrice}
                      onChange={(e) =>
                        setPrintSettings((prev) => ({ ...prev, showPrice: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[#052315] focus:ring-[#052315]"
                    />
                    <span>Show Price</span>
                  </label>
                </div>
              </div>

              {/* Tags Per Page */}
              <div>
                <h3 className="font-semibold text-[#052315] mb-3">Tags Per Page</h3>
                <select
                  value={printSettings.tagsPerPage}
                  onChange={(e) =>
                    setPrintSettings((prev) => ({
                      ...prev,
                      tagsPerPage: parseInt(e.target.value)
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#052315]"
                >
                  {/* <option value={4}>4 tags per page (2x2)</option>
                  <option value={6}>6 tags per page (2x3)</option>
                  <option value={8}>8 tags per page (2x4)</option>
                  <option value={12}>12 tags per page (3x4)</option>
                  <option value={16}>16 tags per page (4x4)</option>
                  <option value={20}>20 tags per page (4x5)</option> */}
                  <option value={28}>28 tags per page (4x7)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setPrintSettings(DEFAULT_PRINT_SETTINGS)}>
                Reset to Default
              </Button>
              <Button
                onClick={() => setShowSettingsModal(false)}
                className="bg-[#052315] hover:bg-[#0a3d2a] text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductList
