import React from 'react'
import { useAuthStore } from '@renderer/store/auth'
import { useProductsStore } from '@renderer/store/products'
import { useSalesStore } from '@renderer/store/sales'
import { useSettingsStore } from '@renderer/store/settings'
import salesSyncService from '@renderer/services/salesSyncService'
import { DashboardHeader } from '@renderer/components/DashboardHeader'
import { TransactionPanel } from '@renderer/components/TransactionPanel'
import { PaymentSummary } from '@renderer/components/PaymentSummary'
import { ProductSearchPanel } from '@renderer/components/ProductSearchPanel'

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { searchProductByCode, addToCart, cartItems, searchProducts, setSearchQuery, searchQuery } = useProductsStore()
  const { createSale, unsyncedCount } = useSalesStore()
  const { productCategories, fetchProductCategories } = useSettingsStore()
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [isOnline] = React.useState(true) // Mock online status
  const [searchCode, setSearchCode] = React.useState('')
  const [searchResult, setSearchResult] = React.useState<
    | { type: 'error'; error: string }
    | { type: 'product'; product: { id: string; name: string; price: number; code: string | null } }
    | null
  >(null)
  const [selectedCategory, setSelectedCategory] = React.useState<number | null>(null)
  const [autoAddNotification, setAutoAddNotification] = React.useState<{
    product: { id: string; name: string; price: number; code: string | null }
    visible: boolean
  } | null>(null)
  const [isSearchingCode, setIsSearchingCode] = React.useState(false)
  const [isSearchCleared, setIsSearchCleared] = React.useState(false)

  // Timer effect
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

  // Optimized debounced search effect with shorter delay
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim()) {
        // First, try to find an exact product code match if the query looks like a product code
        if (looksLikeProductCode(searchQuery)) {
          setIsSearchingCode(true)
          try {
            const exactMatch = await window.api.db.searchProductByCode(searchQuery.trim())
            if (exactMatch) {
              // Auto-add to cart if exact code match found
              addToCart(exactMatch)

              // Show notification
              setAutoAddNotification({ product: exactMatch, visible: true })
              setTimeout(() => setAutoAddNotification(null), 3000) // Hide after 3 seconds

              // Clear the search query in the store
              setSearchQuery('')

              // Show brief visual feedback that search was cleared
              setIsSearchCleared(true)
              setTimeout(() => setIsSearchCleared(false), 500)

              // Refresh the product list to show all products
              useProductsStore.getState().refresh()
              setIsSearchingCode(false)
              return
            }
          } catch (error) {
            console.error('Error searching by product code:', error)
          } finally {
            setIsSearchingCode(false)
          }
        }

        // If no exact match found, perform regular search
        searchProducts(searchQuery)
      } else {
        // If search query is empty, refresh to show all products
        useProductsStore.getState().refresh()
      }
    }, 300) // Reduced to 300ms for better responsiveness

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchProducts, addToCart, setSearchQuery])

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
      if (searchQuery.trim()) {
        searchProducts(searchQuery)
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
    setSearchQuery('')
    
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

      // Clear cart after successful sale
      useProductsStore.getState().clearCart()

      // Show success message
      alert('Sale completed successfully!')
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Checkout failed. Please try again.')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <DashboardHeader
        currentTime={currentTime}
        user={user}
        isOnline={isOnline}
        unsyncedCount={unsyncedCount}
        onLogout={logout}
      />
      <div className="flex-1 flex overflow-hidden">
      <div className="">

        <TransactionPanel
          cartItems={cartItems}
          searchCode={searchCode}
          searchResult={searchResult}
          onSearchCodeChange={setSearchCode}
          onProductSearch={handleProductSearch}
          onKeyPress={handleKeyPress}
          onClearCart={() => useProductsStore.getState().clearCart()}
        />
        <div className="w-96 bg-white border-l overflow-y-auto border-gray-200 flex flex-col">
          <PaymentSummary
            cartItems={cartItems}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

        <ProductSearchPanel
          productSearchQuery={searchQuery}
          selectedCategory={selectedCategory}
          productCategories={productCategories}
          autoAddNotification={autoAddNotification}
          isSearchingCode={isSearchingCode}
          isSearchCleared={isSearchCleared}
          onProductSearchQueryChange={setSearchQuery}
          onCategoryChange={handleCategoryChange}
          onClearAutoAddNotification={() => setAutoAddNotification(null)}
          onClearProductSearch={() => setSearchQuery('')}
          onProductListKeyPress={handleProductListKeyPress}
          looksLikeProductCode={looksLikeProductCode}
        />
      </div>
    </div>
  )
}
