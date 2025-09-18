import { getDatabase } from '../database/connection'
import { ProductRecord, ProductSyncProgress } from '../database/types'
import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken } from './auth'

export async function syncProductsFromRemote(): Promise<void> {
  console.log('[DB] Starting product sync from remote...')

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

    console.log('[DB] Using base URL:', baseUrl)

    // Attempt the API request with retries
    let lastError: Error | null = null
    let retries = 3
    let response: Response | null = null
    let data: any = null

    while (retries > 0) {
      try {
        response = await fetch(`${baseUrl}/products`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication failed: ${errorText}`)
          }
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        data = await response.json()
        break // Success - exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        retries--
        if (retries > 0) {
          console.log(
            `[DB] Retrying product fetch, ${retries} attempts remaining. Last error: ${lastError.message}`
          )
          await new Promise((resolve) => setTimeout(resolve, (4 - retries) * 1000))
          continue
        }
        throw new Error(
          `Failed to fetch products after all retries. Last error: ${lastError.message}`
        )
      }
    }

    if (!data?.success || !data?.data || !Array.isArray(data.data)) {
      throw new Error(
        `Invalid API response format. Expected: {success: true, data: [...]}, Got: ${JSON.stringify(data)}`
      )
    }

    const products = data.data.map((product: any) => ({
      id: String(product.id),
      name: product.attributes?.name || product.name,
      price: parseFloat(product.attributes?.selling_price || product.selling_price) || 0,
      category: product.attributes?.category_id || product.category_id || 'Uncategorized',
      code:
        product.attributes?.sku || product.attributes?.code || product.sku || product.code || null,
      raw_response: JSON.stringify(product)
    }))

    // console.log('[DB] Sample product data:', products.slice(0, 2))

    console.log(`[DB] Processing ${products.length} products...`)
    const database = getDatabase()

    // Check table structure
    try {
      const tableInfo = database.prepare('PRAGMA table_info(products)').all()
      console.log('[DB] Products table structure:', tableInfo)
    } catch (tableError) {
      console.error('[DB] Failed to get table info:', tableError)
    }

    try {
      // Clear existing products if we have new ones
      // if (products.length > 0) {
      //   console.log('[DB] Clearing existing products...')
      //   const deleteResult = database.prepare('DELETE FROM products').run()
      //   console.log('[DB] Deleted', deleteResult.changes, 'existing products')
      // }

      // Insert new products
      const insertStmt = database.prepare(`
        INSERT INTO products (id, name, price, category, code, raw_response)
        VALUES (@id, @name, @price, @category, @code, @raw_response)
      `)

      let insertedCount = 0
      for (const product of products) {
        try {
          const result = insertStmt.run(product)
          insertedCount++
          if (insertedCount % 100 === 0) {
            console.log(`[DB] Inserted ${insertedCount}/${products.length} products...`)
          }
        } catch (insertError) {
          console.error('[DB] Failed to insert product:', product.id, insertError)
          throw insertError
        }
      }
      console.log(`[DB] Successfully inserted ${insertedCount} products`)

      // Verify products were inserted
      const verifyCount = database.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
      console.log('[DB] Verification: Total products in database:', verifyCount.count)

      // Update sync progress
      console.log('[DB] Updating sync progress...')
      const progressResult = database
        .prepare(
          `
        INSERT OR REPLACE INTO product_sync_progress (
          id, current_page, last_page, is_completed, last_sync_at, total_products
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
        )
        .run('product_sync', 1, 1, true, new Date().toISOString(), products.length)
      console.log('[DB] Sync progress updated:', progressResult.changes, 'rows affected')

      console.log('[DB] Product sync completed successfully')
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      console.error('[DB] Database operation failed:', errorMessage)
      throw new Error(`Failed to save products to database: ${errorMessage}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[DB] Product sync failed:', errorMessage)

    // Update sync progress with error state
    try {
      const database = getDatabase()
      database
        .prepare(
          `
        INSERT OR REPLACE INTO product_sync_progress (
          id, current_page, last_page, is_completed, last_sync_at, total_products
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
        )
        .run('product_sync', 1, 1, false, new Date().toISOString(), 0)
    } catch (progressError) {
      console.error('[DB] Failed to update sync progress:', progressError)
    }

    throw error
  }
}

export function resetProductSyncProgress(): void {
  const database = getDatabase()
  database.prepare('DELETE FROM product_sync_progress WHERE id = ?').run('product_sync')
}

export function getProductSyncProgress(): ProductSyncProgress | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM product_sync_progress WHERE id = ?').get('product_sync') as
    | ProductSyncProgress
    | undefined

  console.log('[DB] Getting product sync progress:', result)
  return result || null
}

export function searchProductByCode(code: string): ProductRecord | null {
  const database = getDatabase()
  return (
    (database
      .prepare('SELECT id, name, price, category, code, raw_response FROM products WHERE code = ?')
      .get(code) as ProductRecord | undefined) || null
  )
}

export function searchProducts(query: string, limit: number = 50): ProductRecord[] {
  const database = getDatabase()
  const searchTerm = `%${query}%`
  return database
    .prepare(
      `
      SELECT id, name, price, category, code, raw_response
      FROM products
      WHERE name LIKE ? OR code LIKE ? OR category LIKE ?
      ORDER BY name
      LIMIT ?
    `
    )
    .all(searchTerm, searchTerm, searchTerm, limit) as ProductRecord[]
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

export function listProducts(category?: string | number, limit: number = 50): ProductRecord[] {
  const database = getDatabase()

  if (category && category !== 'all') {
    if (typeof category === 'number') {
      return database
        .prepare(
          `
          SELECT p.id, p.name, p.price, p.category, p.code, p.raw_response
          FROM products p
          INNER JOIN product_categories pc ON p.category = pc.id
          WHERE pc.id = ?
          ORDER BY p.name
          LIMIT ?
        `
        )
        .all(category, limit) as ProductRecord[]
    }

    return database
      .prepare(
        `
        SELECT id, name, price, category, code, raw_response
        FROM products
        WHERE category = ?
        ORDER BY name
        LIMIT ?
      `
      )
      .all(category, limit) as ProductRecord[]
  }

  return database
    .prepare(
      `
      SELECT id, name, price, category, code, raw_response
      FROM products
      ORDER BY name
      LIMIT ?
    `
    )
    .all(limit) as ProductRecord[]
}
