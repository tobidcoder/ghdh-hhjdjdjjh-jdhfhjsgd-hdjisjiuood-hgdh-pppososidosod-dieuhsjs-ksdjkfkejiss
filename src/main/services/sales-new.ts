// import { getDatabase } from '../database/connection'
import { SaleRecord } from '../database/types'
import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken } from './auth'
import { withRetry } from '../utils/retryUtils'
import { getPendingSales, updateSaleSyncStatus } from './sales'

export async function syncSaleToRemote(
  sale: SaleRecord,
  userToken: string,
  baseUrl: string
): Promise<void> {
  const saleData = {
    reference_code: sale.invoice_number,
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
    subtotal: sale.subtotal,
    tax_amount: sale.tax_amount,
    total_amount: sale.total_amount,
    payment_method: sale.payment_method,
    payment_status: sale.payment_status,
    items: JSON.parse(sale.items),
    date: sale.date,
    customer_id: sale.customer_id,
    warehouse_id: sale.warehouse_id,
    sale_items: sale.sale_items ? JSON.parse(sale.sale_items) : [],
    grand_total: sale.grand_total,
    discount: sale.discount,
    shipping: sale.shipping,
    tax_rate: sale.tax_rate,
    note: sale.note,
    status: sale.status
  }

  await withRetry(
    async () => {
      const response = await fetch(`${baseUrl}/sales`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(saleData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const responseData = await response.json()
      return responseData
    },
    {
      maxRetries: 3,
      delayMs: 1000,
      exponentialBackoff: true,
      retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'socket hang up'],
      onRetry: (error, attempt) => {
        console.log(
          `[DB] Retrying sale sync for ${sale.invoice_number}, attempt ${attempt}/3. Error: ${error.message}`
        )
      }
    }
  )
}

export async function syncSalesToRemote(): Promise<void> {
  console.log('[DB] Starting sales sync to remote...')

  try {
    const userToken = requireCurrentUserToken()
    const baseUrl = getBaseUrl()

    // Validate required data
    if (!baseUrl) {
      throw new Error('Base URL is not configured')
    }
    if (!userToken) {
      throw new Error('Authentication token is missing')
    }

    const pendingSales = getPendingSales()
    console.log(`[DB] Found ${pendingSales.length} pending sales to sync`)

    for (const sale of pendingSales) {
      try {
        // Update status to syncing
        updateSaleSyncStatus(sale.id, 'syncing')

        await syncSaleToRemote(sale, userToken, baseUrl)
        console.log(`[DB] Sale ${sale.invoice_number} synced successfully`)
        updateSaleSyncStatus(sale.id, 'synced')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        // Special handling for auth errors
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          console.error('[DB] Authentication error during sales sync:', errorMessage)
          throw new Error('Authentication failed during sales sync')
        }

        console.error(`[DB] Error syncing sale ${sale.invoice_number}:`, errorMessage)
        updateSaleSyncStatus(sale.id, 'failed', errorMessage)
      }
    }

    console.log('[DB] Sales sync completed')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[DB] Sales sync failed:', errorMessage)
    throw error
  }
}

// Re-export other existing functions
export {
  createSale,
  getPendingSales,
  getUnsyncedSalesCount,
  updateSaleSyncStatus,
  deleteSyncedSale,
  getSalesByDateRange,
  getSaleById
} from './sales'
