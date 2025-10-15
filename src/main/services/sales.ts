import { getDatabase } from '../database/connection'
import { SaleRecord } from '../database/types'
import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken, requireCurrentUserId, clearCurrentUserData } from './auth'
import { BrowserWindow } from 'electron'

// Sales functions
export function createSale(sale: any): SaleRecord {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const now = new Date().toISOString()
  const saleId = sale.ref
  const currentUserId = requireCurrentUserId()

  const stmt = database.prepare(`
    INSERT INTO sales (
      id, invoice_number, customer_name, customer_phone, subtotal, tax_amount,
      total_amount, payment_method, payment_status, items, created_at, synced_at,
      sync_status, sync_attempts, last_sync_error, ref, date, customer_id,
      warehouse_id, sale_items, grand_total, discount, shipping, tax_rate,
      note, status, hold_ref_no, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    saleId,
    sale.ref ,
    sale.customer_name || null,
    sale.customer_phone || null,
    sale.subtotal || 0,
    sale.tax_amount || 0,
    sale.total_amount || 0,
    sale.payment_method || 'cash',
    sale.payment_status || 1,
    JSON.stringify(sale.items || []),
    now,
    null, // synced_at
    'pending', // sync_status
    0, // sync_attempts
    null, // last_sync_error
    sale.ref,
    sale.date || now,
    sale.customer_id || 0,
    sale.warehouse_id || 1,
    JSON.stringify(sale.sale_items || []),
    sale.grand_total || sale.total_amount || 0,
    sale.discount || 0,
    sale.shipping || 0,
    sale.tax_rate || 0,
    sale.note || null,
    sale.status || 1,
    sale.hold_ref_no || null,
    currentUserId
  )

  return getSaleById(saleId)!
}

export function getPendingSales(): SaleRecord[] {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const currentUserId = requireCurrentUserId()
  return database
    .prepare("SELECT * FROM sales WHERE sync_status != 'synced' AND user_id = ? ORDER BY created_at DESC")
    .all(currentUserId) as SaleRecord[]
}

export function getUnsyncedSalesCount(): number {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const currentUserId = requireCurrentUserId()
  const result = database
    .prepare("SELECT COUNT(*) as count FROM sales WHERE sync_status != 'synced' AND user_id = ?")
    .get(currentUserId) as { count: number }
  return result.count
}

export function updateSaleSyncStatus(
  saleId: string,
  status: 'pending' | 'syncing' | 'synced' | 'failed',
  error?: string
): void {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const now = new Date().toISOString()
  const stmt = database.prepare(`
    UPDATE sales SET
      sync_status = ?,
      synced_at = ?,
      last_sync_error = ?,
      sync_attempts = sync_attempts + 1
    WHERE id = ?
  `)

  stmt.run(status, status === 'synced' ? now : null, error || null, saleId)
}

export function deleteSyncedSale(saleId: string): void {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const currentUserId = requireCurrentUserId()
  database.prepare('DELETE FROM sales WHERE id = ? AND sync_status = "synced" AND user_id = ?').run(saleId, currentUserId)
}

export function getSalesByDateRange(startDate: string, endDate: string): SaleRecord[] {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const currentUserId = requireCurrentUserId()
  return database
    .prepare(
      `
    SELECT * FROM sales
    WHERE date BETWEEN ? AND ? AND user_id = ?
    ORDER BY date DESC
  `
    )
    .all(startDate, endDate, currentUserId) as SaleRecord[]
}

export function getSaleById(saleId: string): SaleRecord | null {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const currentUserId = requireCurrentUserId()
  const result = database.prepare('SELECT * FROM sales WHERE id = ? AND user_id = ?').get(saleId, currentUserId) as
    | SaleRecord
    | undefined
  return result || null
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

        // Prepare sale data for API
        const saleData = {
          reference_code: sale.invoice_number,
          payment_type: parseInt(sale.payment_method),
          payment_status: parseInt(sale.payment_status),
          hold_ref_no: "",
          // payment_status: sale.payment_status,
          // items: JSON.parse(sale.items),
          date: sale.date,
          customer_id: sale.customer_id,
          warehouse_id: sale.warehouse_id,
          sale_items: sale.sale_items ? JSON.parse(JSON.parse(sale.sale_items)) : [],
          grand_total: sale.grand_total,
          discount: sale.discount,
          shipping: sale.shipping,
          tax_rate: sale.tax_rate,
          note: sale.note,
          status: sale.status
        }

        // Add retry logic for network errors
        let retries = 1
        let lastError: string = ''

        try {
          while (retries > 0) {
            try {
              const response = await fetch(`${baseUrl}/sales`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${userToken}`,
                  'Content-Type': 'application/json',
                  Accept: 'application/json'
                },
                body: JSON.stringify(saleData)
              })
              console.log('response.ok', response)
              if (response.ok) {
                const responseData = await response.json()
                console.log(`[DB] Sale ${sale.invoice_number} synced successfully`, responseData)
                updateSaleSyncStatus(sale.id, 'synced')
                break // Success, exit retry loop
              } else {
                const errorText = await response.text()
                lastError = `HTTP ${response.status}: ${errorText}`
                if (response.status === 401 || response.status === 403) {
                  // On auth errors: clear current user and notify renderer to force logout
                  try {
                    clearCurrentUserData()
                  } catch {}
                  try {
                    BrowserWindow.getAllWindows().forEach((w) =>
                      w.webContents.send('auth:forceLogout401')
                    )
                  } catch {}
                  // Don't retry auth errors
                  throw new Error(`Authentication error: ${lastError}`)
                }
                throw new Error(lastError)
              }
            } catch (error: any) {
              lastError = error.message
              retries--
              if (retries > 0) {
                // Wait before retrying, with exponential backoff
                await new Promise((resolve) => setTimeout(resolve, (4 - retries) * 1000))
                console.log(
                  `[DB] Retrying sale sync for ${sale.invoice_number}, ${retries} attempts remaining`
                )
                continue
              }
              console.error(
                `[DB] Failed to sync sale ${sale.invoice_number} after all retries:`,
                lastError
              )
              updateSaleSyncStatus(sale.id, 'failed', lastError)
              throw new Error(lastError)
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`[DB] Error processing sale ${sale.invoice_number}:`, errorMessage)
          // console.log(`sale-${saleData.invoice_number}`, saleData);

          updateSaleSyncStatus(sale.id, 'failed', errorMessage)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[DB] Error processing sale ${sale.invoice_number}:`, errorMessage)
        updateSaleSyncStatus(sale.id, 'failed', errorMessage)
      }
    }

    console.log('[DB] Sales sync completed')
    return
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[DB] Sales sync failed:', errorMessage)
    throw error
  }
}
