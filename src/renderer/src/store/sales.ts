import { create } from 'zustand'

export interface Sale {
  id: string
  invoice_number: string
  customer_name: string | null
  customer_phone: string | null
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_method: string
  payment_status: string
  items: string
  created_at: string
  synced_at: string | null
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed'
  sync_attempts: number
  last_sync_error: string | null
}

interface SalesState {
  // Sales state
  sales: Sale[]
  unsyncedCount: number
  isSyncing: boolean
  syncError: string | null

  // Actions
  createSale: (
    saleData: Omit<
      Sale,
      'id' | 'created_at' | 'synced_at' | 'sync_status' | 'sync_attempts' | 'last_sync_error'
    >
  ) => Promise<Sale>
  getUnsyncedCount: () => Promise<void>
  syncSales: (baseUrl: string, userToken: string) => Promise<void>
  clearError: () => void
}

export const useSalesStore = create<SalesState>((set, get) => ({
  // Sales state
  sales: [],
  unsyncedCount: 0,
  isSyncing: false,
  syncError: null,

  // Actions
  createSale: async (saleData) => {
    try {
      const sale = await window.api.db.createSale(saleData)
      // Update unsynced count
      await get().getUnsyncedCount()
      return sale
    } catch (error: any) {
      console.error('Failed to create sale:', error)
      throw error
    }
  },

  getUnsyncedCount: async () => {
    try {
      const count = await window.api.db.getUnsyncedSalesCount()
      set({ unsyncedCount: count })
    } catch (error: any) {
      console.error('Failed to get unsynced count:', error)
    }
  },

  syncSales: async (baseUrl: string, userToken: string) => {
    set({ isSyncing: true, syncError: null })
    try {
      await window.api.db.syncSales(baseUrl, userToken)
      // Update unsynced count after sync
      await get().getUnsyncedCount()
      set({ isSyncing: false })
    } catch (error: any) {
      set({ syncError: error.message, isSyncing: false })
      throw error
    }
  },

  clearError: () => set({ syncError: null })
}))
