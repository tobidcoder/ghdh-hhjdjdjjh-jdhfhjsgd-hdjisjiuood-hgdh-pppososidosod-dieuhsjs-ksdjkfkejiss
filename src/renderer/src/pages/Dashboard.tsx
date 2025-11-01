import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@renderer/store/auth'
import { useProductsStore } from '@renderer/store/products'
import { useSalesStore } from '@renderer/store/sales'
import { useSettingsStore } from '@renderer/store/settings'
import salesSyncService from '@renderer/services/salesSyncService'
import { DashboardHeader } from '@renderer/components/DashboardHeader'
import { ProductSearchPanel } from '@renderer/components/ProductSearchPanel'
import { TransactionPanel } from '@renderer/components/TransactionPanel'
import { PaymentSummary } from '@renderer/components/PaymentSummary'
import { PaymentModal } from '@renderer/components/PaymentModal'
import { printReceipt, generateReceiptData } from '@renderer/utils/printUtils'

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore()
  const {
    addToCart,
    cartItems,
    searchProducts,
    setSearchQuery,
    searchQuery,
    removeFromCart,
    updateCartItemQuantity
  } = useProductsStore()
  const { createSale, unsyncedCount, syncSales, getUnsyncedCount } = useSalesStore()
  const { productCategories, fetchProductCategories } = useSettingsStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(false) // Mock online status
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [settings, setSettings] = useState(
    JSON.parse(localStorage.getItem('cheetah_settings') || '{}')
  )
  const [autoAddNotification, setAutoAddNotification] = useState<{
    product: { id: string; name: string; price: number; code: string | null }
    visible: boolean
  } | null>(null)
  const [isSearchingCode, setIsSearchingCode] = useState(false)
  const [isSearchCleared, setIsSearchCleared] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [saleRef, setSaleRef] = useState('')
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false)
  const [isSyncingLogout, setIsSyncingLogout] = useState(false)

  useEffect(() => {

    if (cartItems.length == 1) {
      setSaleRef(`SR-${user?.id}${Date.now()}${user?.id}${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
    } else if (cartItems.length === 0) {
      setSaleRef('')
    }else if (cartItems.length >=1 && saleRef === '') {
      setSaleRef(`SR-${user?.id}${Date.now()}${user?.id}${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
    }
  }, [cartItems.length])

  useEffect(() => {
    setSettings(JSON.parse(localStorage.getItem('cheetah_settings') || '{}'))
    // Initial check
    setIsOnline(navigator.onLine)

    // Event listeners for online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Start sales sync service when component mounts
  useEffect(() => {
    if (user?.token) {
      salesSyncService.start()
    }

    return () => {
      salesSyncService.stop()
    }
  }, [user?.token])

  // Keep unsynced count fresh
  useEffect(() => {
    getUnsyncedCount()
  }, [getUnsyncedCount])

  // Fetch product categories when component mounts
  useEffect(() => {
    fetchProductCategories()
  }, [fetchProductCategories])

  // Optimized debounced search effect with shorter delay
  useEffect(() => {
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

  // Helper function to check if query looks like a product code
  const looksLikeProductCode = (query: string): boolean => {
    const trimmed = query.trim()
    // Product codes are typically alphanumeric and not too long
    // This is a simple heuristic - adjust based on your actual product code format
    return trimmed.length > 0 && trimmed.length <= 20 && /^[A-Za-z0-9-_]+$/.test(trimmed)
  }

  // Handle Enter key press for search
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

    // Open payment modal instead of directly processing
    setIsPaymentModalOpen(true)
  }

  // Intercept logout to warn when there are unsynced sales
  const handleLogoutRequested = async (): Promise<void> => {
    try {
      await getUnsyncedCount()
    } catch {}
    if (unsyncedCount > 0) {
      setIsLogoutModalOpen(true)
    } else {
      logout()
    }
  }

  const handleSyncThenLogout = async (): Promise<void> => {
    setIsSyncingLogout(true)
    try {
      await syncSales()
      await getUnsyncedCount()
      setIsLogoutModalOpen(false)
      if (useSalesStore.getState().unsyncedCount > 0) {
        // Still pending; ask for confirmation
        setIsConfirmLogoutOpen(true)
      } else {
        logout()
      }
    } catch {
      // On error, allow user to decide
      setIsConfirmLogoutOpen(true)
    } finally {
      setIsSyncingLogout(false)
    }
  }

  // Handle payment submission
  const handlePaymentSubmit = async (paymentData: any): Promise<void> => {
    try {
      const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      // const taxAmount = subtotal * 0.15 // 15% tax
      // const totalAmount = subtotal + taxAmount
      const taxAmount = 0
      const totalAmount = subtotal + taxAmount


      // Create sale_items in API format
      const saleItems = cartItems.map((item) => ({
        name: item.name,
        code: item.code || '',
        stock_alert: '5', // Default value
        product_id: parseInt(item.id) || 0,
        product_cost: item.price || 0, // Using price as cost for now
        product_price: item.price || 0,
        net_unit_cost: item.price || 0,
        tax_type: 1, // Default tax type
        tax_amount: 0, // No tax applied in current implementation
        discount_type: 1, // Default discount type
        discount_value: 0, // No discount applied
        discount_amount: 0,
        product_unit: '18', // Default unit
        sale_unit: '28', // Default sale unit
        quantity: item.quantity || 1,
        sub_total: (item.price || 0) * (item.quantity || 1),
        id: parseInt(item.id) || 0,
        sale_id: 1, // Will be assigned by the API
        tax_value: 0,
        hold_item_id: '',
        wholesale_value: 0,
        wholesale_min: 0,
        wholesale_type: 'fixed',
        current_price: item.price || 0,
        is_wholesale_applied: false
      }))

      // Create sale record with payment information and API compatibility
      const saleData = {
        invoice_number: saleRef,
        customer_name: null, // Could be added from a customer input field
        customer_phone: null, // Could be added from a customer input field
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_method: paymentData.paymentType,
        payment_status: paymentData.paymentStatus,
        items: JSON.stringify(cartItems), // Convert to JSON string as expected by database
        note: paymentData.note,
        // New API compatibility fields
        ref: saleRef,
        date: new Date().toISOString(),
        customer_id: 1, // Default customer ID
        warehouse_id: 1, // Default warehouse ID
        sale_items: JSON.stringify(saleItems), // Convert to JSON string as expected by database
        grand_total: totalAmount.toString(),
        discount: 0,
        shipping: 0,
        // tax_rate: 0.15, // 15% tax rate
        tax_rate: 0,
        status: 1, // Active status
        hold_ref_no: null ,// Use null instead of empty string
        user_id: user!.id, // Add required user_id field from auth store
      }

      await createSale(saleData)

      // Generate receipt and trigger print immediately (do not wait)
      const receiptData = generateReceiptData(saleRef, cartItems, paymentData, settings, saleRef)
      setIsPaymentModalOpen(false)
      useProductsStore.getState().clearCart()
      // Fire-and-forget printing
      printReceipt(receiptData).catch((err) => {
        console.error('[PRINT] Printing failed:', err)
      })
    } catch (error) {
      console.error('Payment failed:', error)

      // Provide more detailed error information
      let errorMessage = 'Payment failed. Please try again.'
      if (error instanceof Error) {
        errorMessage = `Payment failed: ${error.message}`
      } else if (typeof error === 'string') {
        errorMessage = `Payment failed: ${error}`
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Payment failed: ${(error as any).message}`
      }

      alert(errorMessage)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <DashboardHeader
        currentTime={currentTime}
        settings={settings}
        user={user}
        isOnline={isOnline}
        unsyncedCount={unsyncedCount}
        onLogout={handleLogoutRequested}
      />
      <div className="flex-1  flex overflow-hidden">
        <div className="flex bg-white flex-col items-end h-[100%]">
          <div>

          <TransactionPanel
            cartItems={cartItems}
            onClearCart={() => useProductsStore.getState().clearCart()}
            onRemoveFromCart={removeFromCart}
            onUpdateQuantity={updateCartItemQuantity}
            onAddItem={(product) => useProductsStore.getState().addToCart(product)}
            saleRef={saleRef}
          />
          </div>
          <div className="h-[100%]"></div>

          <div className="w-full bg-white border-l border-gray-200 flex flex-col mb-4">
            <PaymentSummary cartItems={cartItems} onCheckout={handleCheckout} />
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

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cartItems={cartItems}
        onSubmit={handlePaymentSubmit}
      />

      {/* Logout warning modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Unsynced sales detected</h3>
            <p className="text-sm text-gray-700 mb-4">
              You have {unsyncedCount} unsynced sale{unsyncedCount === 1 ? '' : 's'}. Do you want to
              sync them before logging out?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md"
                onClick={() => setIsConfirmLogoutOpen(true)}
              >
                Logout anyway
              </button>
              <button
                className="px-4 py-2 bg-green-700 text-white rounded-md disabled:opacity-60"
                onClick={handleSyncThenLogout}
                disabled={isSyncingLogout}
              >
                {isSyncingLogout ? 'Syncing…' : 'Sync and logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm logout without syncing */}
      {isConfirmLogoutOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Proceed without syncing?</h3>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to logout without syncing pending sales?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md"
                onClick={() => {
                  setIsConfirmLogoutOpen(false)
                  setIsLogoutModalOpen(false)
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md"
                onClick={() => {
                  setIsConfirmLogoutOpen(false)
                  setIsLogoutModalOpen(false)
                  logout()
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
