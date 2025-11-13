import { create } from 'zustand'
import { calculateWholesalePrice } from '../lib/wholesalePricing'

export interface Product {
  id: string
  name: string
  price: number
  category: string
  code: string | null
  raw_response?: string | null
}

export interface ProductSyncProgress {
  id: string
  current_page: number
  last_page: number
  is_completed: boolean
  last_sync_at: string
  total_products: number
}

interface CartItem {
  id: string
  name: string
  price: number // This will be the effective price (base or wholesale)
  basePrice: number // Original price
  quantity: number
  code: string | null
  raw_response?: string | null
  isWholesale?: boolean // Flag to indicate if wholesale pricing is applied
}

// Export CartItem for use in components
export type { CartItem }

interface ProductsState {
  // Product list management
  products: Product[]
  selectedCategory: 'all' | number
  isLoading: boolean
  error: string | null
  searchQuery: string

  // Product sync management
  syncProgress: ProductSyncProgress | null
  isSyncing: boolean
  syncError: string | null

  // Cart management
  cartItems: CartItem[]

  // Product list actions
  setCategory: (category: 'all' | number) => void
  setSearchQuery: (query: string) => void
  refresh: () => Promise<void>
  searchProducts: (query: string) => Promise<void>

  // Product sync actions
  startSync: () => Promise<void>
  checkSyncProgress: () => Promise<void>
  resetSync: () => Promise<void>
  getProductsUpdated: () => Promise<void>
  clearError: () => void

  // Cart actions
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateCartItemQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  searchProductByCode: (code: string) => Promise<Product | null>
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  // Product list state
  products: [],
  selectedCategory: 'all',
  isLoading: false,
  error: null,
  searchQuery: '',

  // Product sync state
  syncProgress: null,
  isSyncing: false,
  syncError: null,

  // Cart state
  cartItems: [],

  // Product list actions
  setCategory: (category: 'all' | number) => {
    set({ selectedCategory: category })
    void get().refresh()
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  refresh: async () => {
    set({ isLoading: true, error: null })
    try {
      const category = get().selectedCategory
      const rows = await window.api.db.listProducts(category === 'all' ? undefined : category, 50)
      set({ products: rows, isLoading: false })
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to load products', isLoading: false })
    }
  },

  searchProducts: async (query: string) => {
    if (!query.trim()) {
      await get().refresh()
      return
    }

    set({ isLoading: true, error: null, searchQuery: query })
    try {
      const rows = await window.api.db.searchProducts(query, 50)
      set({ products: rows, isLoading: false })
    } catch (err: any) {
      set({ error: err?.message ?? 'Search failed', isLoading: false })
    }
  },

  // Product sync actions
  startSync: async () => {
    set({ isSyncing: true, syncError: null })
    try {
      await window.api.products.sync.start()
      // Check progress after starting
      await get().checkSyncProgress()
    } catch (err: any) {
      set({ syncError: err?.message ?? 'Product sync failed', isSyncing: false })
    }
  },

  checkSyncProgress: async () => {
    try {
      const progress = await window.api.products.sync.progress()
      set({ syncProgress: progress })
      // If sync is still in progress, check again in 5 seconds
      if (progress && !progress.is_completed && !get().isSyncing) {
        setTimeout(() => get().checkSyncProgress(), 5000)
      } else if (progress?.is_completed) {
        set({ isSyncing: false })
        // Refresh products after sync completion
        await get().refresh()
      }
    } catch (err: any) {
      console.error('Failed to check sync progress:', err)
    }
  },

  resetSync: async () => {
    try {
      await window.api.products.sync.reset()
      set({ syncProgress: null, syncError: null, isSyncing: false })
    } catch (err: any) {
      set({ syncError: err?.message ?? 'Failed to reset sync' })
    }
  },

  getProductsUpdated: async () => {
    set({ isSyncing: true, syncError: null })
    try {
      await window.api.products.sync.getUpdated()
      // Refresh products after update
      await get().refresh()
      // Check progress to update sync status
      await get().checkSyncProgress()
    } catch (err: any) {
      set({ syncError: err?.message ?? 'Failed to get updated products', isSyncing: false })
    }
  },

  clearError: () => set({ syncError: null, error: null }),

  // Cart actions
  addToCart: (product: Product) => {
    const { cartItems } = get()
    const existingItem = cartItems.find((item) => item.id === product.id)

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1
      const effectivePrice = calculateWholesalePrice(
        product.price,
        newQuantity,
        product.raw_response || null
      )
      const isWholesale = effectivePrice < product.price

      set({
        cartItems: cartItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: newQuantity, price: effectivePrice, isWholesale }
            : item
        )
      })
    } else {
      const effectivePrice = calculateWholesalePrice(product.price, 1, product.raw_response || null)
      const isWholesale = effectivePrice < product.price

      set({
        cartItems: [
          ...cartItems,
          {
            id: product.id,
            name: product.name,
            price: effectivePrice,
            basePrice: product.price,
            quantity: 1,
            code: product.code,
            raw_response: product.raw_response,
            isWholesale
          }
        ]
      })
    }
  },

  removeFromCart: (productId: string) => {
    const { cartItems } = get()
    set({ cartItems: cartItems.filter((item) => item.id !== productId) })
  },

  updateCartItemQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromCart(productId)
    } else {
      const { cartItems } = get()
      set({
        cartItems: cartItems.map((item) => {
          if (item.id === productId) {
            // Recalculate price based on new quantity
            const effectivePrice = calculateWholesalePrice(
              item.basePrice,
              quantity,
              item.raw_response || null
            )
            const isWholesale = effectivePrice < item.basePrice

            return { ...item, quantity, price: effectivePrice, isWholesale }
          }
          return item
        })
      })
    }
  },

  clearCart: () => set({ cartItems: [] }),

  searchProductByCode: async (code: string) => {
    try {
      const product = await window.api.db.searchProductByCode(code)
      return product
    } catch (error) {
      console.error('Failed to search product by code:', error)
      return null
    }
  }
}))
