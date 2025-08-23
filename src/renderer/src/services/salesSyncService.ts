import { useSalesStore } from '@renderer/store/sales'
import { useAuthStore } from '@renderer/store/auth'

class SalesSyncService {
  private syncInterval: NodeJS.Timeout | null = null
  private isRunning = false
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'
  }

  start() {
    if (this.isRunning) return

    this.isRunning = true
    console.log('[SalesSyncService] Starting automatic sales sync...')

    // Check for sales to sync every 2 minutes
    this.syncInterval = setInterval(
      async () => {
        await this.checkAndSync()
      },
      2 * 60 * 1000
    )

    // Also check immediately
    this.checkAndSync()
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.isRunning = false
    console.log('[SalesSyncService] Stopped automatic sales sync')
  }

  private async checkAndSync() {
    try {
      const authStore = useAuthStore.getState()
      const salesStore = useSalesStore.getState()

      // Check if user is authenticated
      if (!authStore.user?.token) {
        console.log('[SalesSyncService] No auth token, skipping sync')
        return
      }

      // Check if there are unsynced sales
      const unsyncedCount = salesStore.unsyncedCount
      if (unsyncedCount === 0) {
        console.log('[SalesSyncService] No unsynced sales')
        return
      }

      console.log(`[SalesSyncService] Found ${unsyncedCount} unsynced sales, attempting sync...`)

      // Attempt to sync sales
      await salesStore.syncSales(this.baseUrl, authStore.user.token)

      console.log('[SalesSyncService] Sales sync completed successfully')
    } catch (error: any) {
      console.error('[SalesSyncService] Sales sync failed:', error.message)

      // If sync fails, it might be due to network issues
      // The service will retry on the next interval
    }
  }

  // Manual sync method
  async manualSync() {
    try {
      const authStore = useAuthStore.getState()
      const salesStore = useSalesStore.getState()

      if (!authStore.user?.token) {
        throw new Error('No authentication token available')
      }

      await salesStore.syncSales(this.baseUrl, authStore.user.token)
      return { success: true }
    } catch (error: any) {
      console.error('[SalesSyncService] Manual sync failed:', error)
      throw error
    }
  }

  // Check online status and restart sync if needed
  checkOnlineStatus() {
    if (navigator.onLine && !this.isRunning) {
      console.log('[SalesSyncService] Back online, restarting sync...')
      this.start()
    } else if (!navigator.onLine && this.isRunning) {
      console.log('[SalesSyncService] Gone offline, pausing sync...')
      this.stop()
    }
  }
}

// Create singleton instance
export const salesSyncService = new SalesSyncService()

// Set up online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    salesSyncService.checkOnlineStatus()
  })

  window.addEventListener('offline', () => {
    salesSyncService.checkOnlineStatus()
  })
}

export default salesSyncService
