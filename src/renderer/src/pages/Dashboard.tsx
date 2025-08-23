import React from 'react'
import { useAuthStore } from '@renderer/store/auth'
import { useProductsStore } from '@renderer/store/products'
import { useSalesStore } from '@renderer/store/sales'
import { useSettingsStore } from '@renderer/store/settings'
import salesSyncService from '@renderer/services/salesSyncService'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'
import { ProductSyncStatus } from '@renderer/components/ProductSyncStatus'
import { SalesSyncStatus } from '@renderer/components/SalesSyncStatus'
import { Products } from '@renderer/components/Products'

import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Wifi, WifiOff, CreditCard, Search } from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { searchProductByCode, addToCart, cartItems, searchProducts } = useProductsStore()
  const { createSale, unsyncedCount } = useSalesStore()
  const { productCategories, fetchProductCategories, getCurrencySymbol } = useSettingsStore()
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [isOnline] = React.useState(true) // Mock online status
  const [searchCode, setSearchCode] = React.useState('')
  const [searchResult, setSearchResult] = React.useState<
    | { type: 'error'; error: string }
    | { type: 'product'; product: { id: string; name: string; price: number; code: string | null } }
    | null
  >(null)
  const [productSearchQuery, setProductSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<number | null>(null)
  const [autoAddNotification, setAutoAddNotification] = React.useState<{
    product: { id: string; name: string; price: number; code: string | null }
    visible: boolean
  } | null>(null)
  const [isSearchingCode, setIsSearchingCode] = React.useState(false)
  const [isSearchCleared, setIsSearchCleared] = React.useState(false)

  // Sync local state with store
  React.useEffect(() => {
    const unsubscribe = useProductsStore.subscribe((state) => {
      if (state.searchQuery !== productSearchQuery) {
        setProductSearchQuery(state.searchQuery)
      }
    })
    return unsubscribe
  }, [productSearchQuery])

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Start sales sync service when component mounts
  React.useEffect(() => {
    if (user?.token) {
      salesSyncService.start()
    }

    return () => {
      salesSyncService.stop()
    }
  }, [user?.token])

  // Fetch product categories when component mounts
  React.useEffect(() => {
    fetchProductCategories()
  }, [fetchProductCategories])

  // Debounced search effect
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (productSearchQuery.trim()) {
        // First, try to find an exact product code match if the query looks like a product code
        if (looksLikeProductCode(productSearchQuery)) {
          setIsSearchingCode(true)
          try {
            const exactMatch = await window.api.db.searchProductByCode(productSearchQuery.trim())
            if (exactMatch) {
              // Auto-add to cart if exact code match found
              addToCart(exactMatch)

              // Show notification
              setAutoAddNotification({ product: exactMatch, visible: true })
              setTimeout(() => setAutoAddNotification(null), 3000) // Hide after 3 seconds

              // Clear the search bar
              setProductSearchQuery('')

              // Clear the search query in the store
              useProductsStore.getState().setSearchQuery('')

              // Show brief visual feedback that search was cleared
              setIsSearchCleared(true)
              setTimeout(() => setIsSearchCleared(false), 500)

              // Refresh the product list to show all products
              useProductsStore.getState().refresh()
              setIsSearchingCode(false)
              return
            }
          } catch (error) {
            console.error('Failed to search for exact product code:', error)
          } finally {
            setIsSearchingCode(false)
          }
        }

        // If no exact code match or query doesn't look like a code, perform regular search
        searchProducts(productSearchQuery)
      } else {
        useProductsStore.getState().refresh()
      }
    }, 300) // 300ms delay

    return () => clearTimeout(timeoutId)
  }, [productSearchQuery, searchProducts, addToCart])

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const handleProductSearch = async (): Promise<void> => {
    if (!searchCode.trim()) return

    try {
      const product = await searchProductByCode(searchCode.trim())
      if (product) {
        setSearchResult({ type: 'product', product })
        // Auto-add to cart
        addToCart(product)
        setSearchCode('')
        setSearchResult(null)
      } else {
        setSearchResult({ type: 'error', error: 'Product not found' })
      }
    } catch {
      setSearchResult({ type: 'error', error: 'Search failed' })
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      handleProductSearch()
    }
  }

  const handleProductListKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      // Trigger search immediately on Enter
      if (productSearchQuery.trim()) {
        searchProducts(productSearchQuery)
      } else {
        useProductsStore.getState().refresh()
      }
    }
  }

  // Helper function to check if query looks like a product code
  const looksLikeProductCode = (query: string): boolean => {
    const trimmed = query.trim()
    // Product codes are typically alphanumeric and not too long
    // This is a simple heuristic - adjust based on your actual product code format
    return trimmed.length > 0 && trimmed.length <= 20 && /^[A-Za-z0-9-_]+$/.test(trimmed)
  }

  // Handle category selection
  const handleCategoryChange = (categoryId: string): void => {
    const id = categoryId === 'all' ? 'all' : parseInt(categoryId, 10)
    setSelectedCategory(id === 'all' ? null : id)
    
    // Clear search when category changes
    setProductSearchQuery('')
    useProductsStore.getState().setSearchQuery('')
    
    // Pass the category ID directly to the store
    useProductsStore.getState().setCategory(id)
  }

  // Checkout functionality
  const handleCheckout = async (): Promise<void> => {
    if (cartItems.length === 0) {
      alert('Cart is empty')
      return
    }

    try {
      const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const taxAmount = subtotal * 0.15 // 15% tax
      const totalAmount = subtotal + taxAmount

      // Generate invoice number (you might want to make this more sophisticated)
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      // Create sale record
      const saleData = {
        invoice_number: invoiceNumber,
        customer_name: null, // Could be added from a customer input field
        customer_phone: null, // Could be added from a customer input field
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_method: 'cash', // Default payment method
        payment_status: 'paid', // Default payment status
        items: JSON.stringify(cartItems)
      }

      await createSale(saleData)

      // Clear cart after successful sale creation
      useProductsStore.getState().clearCart()

      // Show success message
      alert(`Sale completed! Invoice: ${invoiceNumber}`)
    } catch (error: unknown) {
      console.error('Checkout failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Checkout failed: ${errorMessage}`)
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">X</span>
            </div>
            <span className="text-xl font-bold text-gray-900">XSEEN</span>
          </div>
          <span className="text-gray-600">POS : XSeen POS</span>
        </div>

        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <span>Shift Date: {formatDate(currentTime)}</span>
          <span>Invoice No: 1</span>
          <span>Clerk: {user?.name || user?.username || 'User'}</span>
          <span>Time: {formatTime(currentTime)}</span>
          {unsyncedCount > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {unsyncedCount} sales pending sync
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Badge
            variant={isOnline ? 'default' : 'secondary'}
            className="flex items-center space-x-1"
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? 'Connected' : 'Disconnected'}</span>
          </Badge>
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Transaction and Customer Details */}
        <div className="w-96 bg-white border-r overflow-y-auto border-gray-200 flex flex-col">
          {/* Transaction Lines */}
          <div className="flex-1 p-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Transaction Lines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-600 border-b border-gray-200 pb-2">
                  <span>LINE</span>
                  <span className="col-span-2">DESCRIPTION</span>
                  <span>PRICE</span>
                  <span>QTY</span>
                  <span>AMOUNT</span>
                </div>

                {/* Cart items */}
                {cartItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-4 text-xs">No items in cart</div>
                ) : (
                  cartItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-6 gap-2 text-xs py-1">
                      <span>{index + 1}</span>
                      <span className="col-span-2">{item.name}</span>
                      <span>{formatPriceBySymbol(item.price, getCurrencySymbol())}</span>
                      <span>{item.quantity}</span>
                      <span>{formatPriceBySymbol(item.price * item.quantity, getCurrencySymbol())}</span>
                    </div>
                  ))
                )}

                {/* Add item input */}
                <div className="pt-2 space-y-2">
                  <Input
                    placeholder="Search by product code..."
                    className="text-xs h-8"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={handleProductSearch} size="sm" className="w-full text-xs h-8">
                    Search & Add
                  </Button>

                  {/* Search Result */}
                  {searchResult && (
                    <div
                      className={`text-xs p-2 rounded ${
                        searchResult.type === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {searchResult.type === 'error'
                        ? searchResult.error
                        : `Added: ${searchResult.product.name}`}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              {/* <Button variant="outline" size="sm" className="w-full justify-start">
                <Calculator className="w-4 h-4 mr-2" />
                EXIT
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <CreditCard className="w-4 h-4 mr-2" />
                CR NOTE
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                REFUND
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                OPTIONS
              </Button> */}
              <Button variant="outline" size="sm" className="w-full justify-start">
                HOLD
              </Button>
              {/* <Button variant="outline" size="sm" className="w-full justify-start">
                VOID
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                CANCEL
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                DISCOUNT
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                SERVICE
              </Button> */}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={() => useProductsStore.getState().clearCart()}
              >
                CLEAR CART
              </Button>
            </div>

            {/* Customer and Payment Summary */}
            <div className="mt-4 space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Customer & Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input placeholder="CUSTOMER" className="text-xs h-8" />

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Gross Amount:</span>
                      <span>
                        {formatPriceBySymbol(
                          cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
                          getCurrencySymbol()
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Tax Amount:</span>
                      <span>
                        {formatPriceBySymbol(
                          cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.15,
                          getCurrencySymbol()
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Grand Total:</span>
                      <span>
                        {formatPriceBySymbol(
                          cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.15,
                          getCurrencySymbol()
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span>{formatPriceBySymbol(0, getCurrencySymbol())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Numeric Keypad */}
              {/* <Card>
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <Button key={num} variant="outline" size="sm" className="h-10">
                        {num}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" className="h-10">0</Button>
                    <Button variant="outline" size="sm" className="h-10">.</Button>
                    <Button variant="outline" size="sm" className="h-10">*</Button>
                  </div>
                  
                  <div className="mt-2 flex space-x-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="keyboard" className="w-3 h-3" />
                      <label htmlFor="keyboard" className="text-xs">KEYBOARD</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="reference" className="w-3 h-3" />
                      <label htmlFor="reference" className="text-xs">REFERENCE</label>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex space-x-2">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button className="flex-1 h-8 text-xs">
                      ENTER →
                    </Button>
                  </div>
                </CardContent>
              </Card> */}

              {/* Balance and Pay */}
              <div className="flex space-x-2">
                <div className="flex-1 bg-red-100 border border-red-300 rounded p-2 text-center">
                  <div className="text-xs text-red-800 font-medium">Balance</div>
                  <div className="text-lg font-bold text-red-900">
                    {formatPriceBySymbol(
                      cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.15,
                      getCurrencySymbol()
                    )}
                  </div>
                </div>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  PAY
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Products and Sync Status */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Sync Status */}
          <div className="p-4 space-y-4">
            <ProductSyncStatus />
            <SalesSyncStatus />
          </div>

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
                  onClick={() => setAutoAddNotification(null)}
                  className="text-green-600 hover:text-green-800"
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
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  onKeyPress={handleProductListKeyPress}
                />
                {isSearchingCode && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {productSearchQuery && (
                  <button
                    onClick={() => setProductSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
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
                  onChange={(e) => handleCategoryChange(e.target.value)}
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
                    Filtering: {productCategories.find(cat => cat.id === selectedCategory)?.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 px-4 pb-4 overflow-auto">
            <Products />
          </div>

          {/* Pagination Controls */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center space-x-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <span className="text-xs">⟪</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <span className="text-xs">⟨</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-orange-500 text-white border-orange-500"
              >
                1
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                2
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                3
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                4
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <span className="text-xs">⟩</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <span className="text-xs">⟫</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
