import { create } from 'zustand'

export interface Product {
  id: string
  name: string
  price: number
  category: string
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

interface ProductsState {
  // Product list management
  products: Product[]
  selectedCategory: string
  isLoading: boolean
  error: string | null
  
  // Product sync management
  syncProgress: ProductSyncProgress | null
  isSyncing: boolean
  syncError: string | null
  
  // Product list actions
  setCategory: (category: string) => void
  refresh: () => Promise<void>
  
  // Product sync actions
  startSync: (baseUrl: string, userToken: string) => Promise<void>
  checkSyncProgress: () => Promise<void>
  resetSync: () => Promise<void>
  clearError: () => void
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  // Product list state
  products: [],
  selectedCategory: 'all',
  isLoading: false,
  error: null,
  
  // Product sync state
  syncProgress: null,
  isSyncing: false,
  syncError: null,
  
  // Product list actions
  setCategory: (category: string) => {
    set({ selectedCategory: category })
    void get().refresh()
  },
  
  refresh: async () => {
    set({ isLoading: true, error: null })
    try {
      const category = get().selectedCategory
      const rows = await window.api.db.listProducts(category === 'all' ? undefined : category)
      set({ products: rows, isLoading: false })
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to load products', isLoading: false })
    }
  },
  
  // Product sync actions
  startSync: async (baseUrl: string, userToken: string) => {
    set({ isSyncing: true, syncError: null })
    try {
      await window.api.products.sync.start({ baseUrl, userToken })
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
  
  clearError: () => set({ syncError: null, error: null })
}))


