import { ProductRecord, ProductSyncProgress } from '../database/types'
import { getBaseUrl, getDatabase } from '../database/connection'
import { requireCurrentUserToken } from './auth'
import Database from 'better-sqlite3'

const PROGRESS_ID = 'product_sync'
let productSyncRunning = false

export function isProductSyncRunning(): boolean {
  return productSyncRunning
}

export async function fetchProductsFromApi(
  userToken: string,
  baseUrl: string
)  {
  const response = await fetch(`${baseUrl}/products`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  if (!data.success || !data.data || !Array.isArray(data.data)) {
    throw new Error(
      `Invalid response format from products API. Expected: {success: true, data: [...]}, Got: ${JSON.stringify(data)}`
    )
  }

  return data
}



export function upsertProducts(products: any[]): void {
  const database = getDatabase()

  const insertStmt = database.prepare(`
    INSERT OR REPLACE INTO products (id, name, price, category, code, raw_response)
    VALUES (@id, @name, @price, @category, @code, @raw_response)
  `)

  for (const product of products) {
    insertStmt.run(product)
  }
}

function requireDb(): Database.Database {
  return getDatabase()
}

function updateProductSyncProgress(progress: Partial<ProductSyncProgress>): void {
  const database = getDatabase()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO product_sync_progress (id, current_page, last_page, is_completed, last_sync_at, total_products)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    PROGRESS_ID,
    progress.current_page || 1,
    progress.last_page || 1,
    progress.is_completed ? 1 : 0,
    now,
    progress.total_products || 0
  )
}


// Product sync functions
export function getProductSyncProgress(): ProductSyncProgress | null {
  const database = requireDb()
  const result = database
    .prepare('SELECT * FROM product_sync_progress WHERE id = ?')
    .get(PROGRESS_ID) as ProductSyncProgress | undefined

  return result || null
}

export function resetProductSyncProgress(): void {
  const database = requireDb()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO product_sync_progress (id, current_page, last_page, is_completed, last_sync_at, total_products)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(PROGRESS_ID, 1, 1, 0, now, 0)
}

export async function syncProductsFromRemote(): Promise<void> {
  if (productSyncRunning) {
    console.log('[DB] Product sync already in progress, skipping new start')
    return
  }
  productSyncRunning = true
  try {
    console.log('[DB] Starting product sync from remote...')
    const baseUrl = getBaseUrl()
    console.log('[DB] Base URL:', baseUrl)
    const userToken = requireCurrentUserToken()
    console.log('[DB] Token available:', !!userToken)

    // Check existing sync progress first
    const existingProgress = getProductSyncProgress()
    let currentPage = 1
    let lastPage = 1
    let totalProducts = 0

    if (existingProgress && !existingProgress.is_completed) {
      // Resume from where we left off
      currentPage = existingProgress.current_page
      lastPage = existingProgress.last_page
      totalProducts = existingProgress.total_products
      console.log(
        `[DB] Resuming sync from page ${currentPage} of ${lastPage} (total: ${totalProducts})`
      )
    } else if (existingProgress && existingProgress.is_completed) {

      console.log('[DB] Sync already completed previously, no action taken')
      return
    } else {
      // Reset sync progress for new sync
      resetProductSyncProgress()
      console.log('[DB] Starting fresh sync')
    }

    // First, test the connection with a simple endpoint
    console.log('[DB] Testing connection...')

    // Try different possible endpoints
    const endpoint = '/products'

    try {
      console.log(`[DB] Trying endpoint: ${baseUrl}${endpoint}?page=1`)

      // If we're resuming and need pagination info, or starting fresh
      if (currentPage === 1 && lastPage === 1) {
        console.log('[DB] Fetching first page to get pagination info...')
        const firstPageUrl = `${baseUrl}${endpoint}?page=1`

        const firstPageResponse = await fetch(firstPageUrl, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: 'application/json'
          }
        })

        if (!firstPageResponse.ok) {
          const errorText = await firstPageResponse.text().catch(() => 'No error details available')
          throw new Error(
            `Failed to fetch first page: ${firstPageResponse.status} ${firstPageResponse.statusText} - ${errorText}`
          )
        }

        const firstPageData = await firstPageResponse.json()
        console.log(`[DB] First page data:`, {
          current_page: firstPageData.meta?.current_page,
          last_page: firstPageData.meta?.last_page,
          total: firstPageData.meta?.total,
          data_length: firstPageData.data?.length || 0
        })

        // Update pagination info from first page
        lastPage = firstPageData.meta?.last_page || 1
        currentPage = firstPageData.meta?.current_page || 1
        totalProducts = firstPageData.meta?.total || 0

        // Process and store first page products
        if (firstPageData.data && Array.isArray(firstPageData.data)) {
          const products: ProductRecord[] = firstPageData.data.map((product: any) => ({
            id: String(product.id),
            name: product.attributes.name || '',
            price: parseFloat(product.attributes.product_price) || 0,
            category: product.attributes.product_category_id || '',
            code: product.attributes.code || null,
            raw_response: JSON.stringify(product)
          }))

          upsertProducts(products)
          console.log(`[DB] Stored ${products.length} products from first page`)
        }

        // Move to next page for the main loop and persist as next-to-fetch
        currentPage = Math.min(currentPage + 1, lastPage + 1)

        // Update sync progress after first page
        updateProductSyncProgress({
          current_page: currentPage, // next page to fetch
          last_page: lastPage,
          is_completed: currentPage > lastPage,
          total_products: totalProducts
        })

        // If we've just completed the only page, we're done
        if (currentPage > lastPage) {
          console.log('[DB] Only one page, sync completed')
          return
        }
      }

      while (currentPage <= lastPage) {
        console.log(`[DB] Fetching products page ${currentPage}...`)

        const url = `${baseUrl}${endpoint}?page=${currentPage.toString()}`
        console.log(`[DB] Making request to: ${url}`)

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: 'application/json'
          }
        })

        console.log(`[DB] Response status: ${response.status}`)
        console.log(`[DB] Response headers:`, Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No error details available')
          console.error(`[DB] Error response body:`, errorText)
          throw new Error(
            `Failed to fetch products: ${response.status} ${response.statusText} - ${errorText}`
          )
        }

        const data = await response.json()
        console.log(`[DB] Received products data:`, {
          current_page: data.meta?.current_page,
          last_page: data.meta?.last_page,
          total: data.meta?.total,
          data_length: data.data?.length || 0,
          has_data: !!data.data,
          is_array: Array.isArray(data.data)
        })

        if (data.data && Array.isArray(data.data)) {
          const products: ProductRecord[] = data.data.map((product: any) => ({
            id: String(product.id),
            name: product.attributes.name || '',
            price: parseFloat(product.attributes.product_price) || 0,
            category: product.attributes.product_category_id || '',
            code: product.attributes.code || null,
            raw_response: JSON.stringify(product)
          }))

          upsertProducts(products)
          console.log(`[DB] Stored ${products.length} products from page ${currentPage}`)
        }

        // Increment to next page first, then persist as next-to-fetch
        currentPage = currentPage + 1

        updateProductSyncProgress({
          current_page: currentPage,
          last_page: lastPage,
          is_completed: currentPage > lastPage,
          total_products: totalProducts
        })

        if (currentPage > lastPage) {
          console.log('[DB] Reached last page, sync completed')
          break
        }

        console.log(`[DB] Waiting 20 seconds before next page...`)
        await new Promise((resolve) => setTimeout(resolve, 20000))
      }

      console.log(`[DB] Product sync completed successfully with endpoint: ${endpoint}`)
      return
    } catch (error: any) {
      console.error(`[DB] Endpoint ${endpoint} failed:`, error.message)
    }
  } finally {
    productSyncRunning = false
  }
}

// Re-export other functions
export {
  searchProductByCode,
  searchProducts,
  listProducts,
} from './products'
