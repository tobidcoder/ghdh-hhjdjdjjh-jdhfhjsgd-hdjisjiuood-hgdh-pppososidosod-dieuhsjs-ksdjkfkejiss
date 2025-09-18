import { useSalesStore } from '@renderer/store/sales'

class SalesSyncService {
  private syncInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    console.log('[SalesSyncService] Initialized')
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

  private async checkAndSync(): Promise<void> {
    try {
      console.log('[SalesSyncService] Checking for unsynced sales...')
      const salesStore = useSalesStore.getState()
      
      // First update the count
      await salesStore.getUnsyncedCount()
      
      // Then check the current count from state
      if (salesStore.unsyncedCount > 0) {
        console.log(`[SalesSyncService] Found ${salesStore.unsyncedCount} unsynced sales, starting sync...`)
        await salesStore.syncSales()
        console.log('[SalesSyncService] Sales sync completed')
      } else {
        console.log('[SalesSyncService] No unsynced sales found')
      }
    } catch (error) {
      console.error('[SalesSyncService] Error during sales sync:', error)
    }
  }

  async manualSync(): Promise<void> {
    try {
      console.log('[SalesSyncService] Manual sales sync requested...')
      const salesStore = useSalesStore.getState()
      await salesStore.syncSales()
      console.log('[SalesSyncService] Manual sales sync completed')
    } catch (error) {
      console.error('[SalesSyncService] Error during manual sales sync:', error)
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
