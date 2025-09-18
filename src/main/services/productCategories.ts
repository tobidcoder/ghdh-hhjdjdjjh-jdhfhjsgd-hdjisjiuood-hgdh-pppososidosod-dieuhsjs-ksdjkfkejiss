import { getDatabase } from '../database/connection'
import { ProductCategoryRecord } from '../database/types'
import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken } from './auth'
import { apiClient } from './apiClient'

export function upsertProductCategories(categories: ProductCategoryRecord[]): void {
  const database = getDatabase()
  const stmt = database.prepare(
    `INSERT INTO product_categories (id, name, image, products_count, created_at, updated_at)
     VALUES (@id, @name, @image, @products_count, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       image = excluded.image,
       products_count = excluded.products_count,
       updated_at = excluded.updated_at`
  )
  const insertMany = database.transaction((rows: ProductCategoryRecord[]) => {
    for (const row of rows) stmt.run(row)
  })
  insertMany(categories)
}

export function getProductCategories(): ProductCategoryRecord[] {
  const database = getDatabase()
  return database
    .prepare('SELECT * FROM product_categories ORDER BY name')
    .all() as ProductCategoryRecord[]
}

export function getProductCategoryById(id: number): ProductCategoryRecord | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM product_categories WHERE id = ?').get(id) as
    | ProductCategoryRecord
    | undefined
  return result || null
}

export function getProductCategoryByName(name: string): ProductCategoryRecord | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM product_categories WHERE name = ?').get(name) as
    | ProductCategoryRecord
    | undefined
  return result || null
}

export async function fetchAndSaveProductCategories(): Promise<void> {
  console.log('[DB] Fetching product categories from remote API...')

  try {
    const response = await apiClient.get('/product-categories')
    console.log('[DB] Product Categories API response:', response)

    // Extract categories array using flexible extraction
    const categoriesData = apiClient.extractArrayData(response, 'data', 'categories', 'data.data')

    if (categoriesData.length === 0) {
      // Try alternative extraction paths
      const altData = apiClient.extractData(response, 'data', 'attributes')
      if (Array.isArray(altData)) {
        categoriesData.push(...altData)
      }
    }

    if (categoriesData.length > 0) {
      const categories = categoriesData.map((category: any) => ({
        id: category.id || category.attributes?.id || Math.random().toString(),
        name: category.attributes?.name || category.name || 'Uncategorized',
        image: category.attributes?.image ? JSON.stringify(category.attributes.image) : null,
        products_count: category.attributes?.products_count || category.products_count || 0,
        created_at: category.attributes?.created_at || category.created_at || new Date().toISOString(),
        updated_at: category.attributes?.updated_at || category.updated_at || new Date().toISOString()
      }))

      upsertProductCategories(categories)
      console.log(`[DB] ${categories.length} product categories saved successfully with flexible extraction`);
    } else {
      console.warn('[DB] No product categories data found in API response, creating default categories...');

      // Create default categories if API doesn't return any
      // const defaultCategories: ProductCategoryRecord[] = [
      //   {
      //     id: '1',
      //     name: 'General',
      //     image: null,
      //     products_count: 0,
      //     created_at: new Date().toISOString(),
      //     updated_at: new Date().toISOString()
      //   },
      //   {
      //     id: '2',
      //     name: 'Electronics',
      //     image: null,
      //     products_count: 0,
      //     created_at: new Date().toISOString(),
      //     updated_at: new Date().toISOString()
      //   },
      //   {
      //     id: '3',
      //     name: 'Clothing',
      //     image: null,
      //     products_count: 0,
      //     created_at: new Date().toISOString(),
      //     updated_at: new Date().toISOString()
      //   }
      // ]

      // upsertProductCategories(defaultCategories)
      // console.log(`[DB] ${defaultCategories.length} default product categories created`)
    }
  } catch (error: any) {
    console.error('[DB] Failed to fetch product categories:', error.message)

    // Create default categories on error
    // console.log('[DB] Creating default product categories due to API failure...')
    // const defaultCategories: ProductCategoryRecord[] = [
    //   {
    //     id: '1',
    //     name: 'General',
    //     image: null,
    //     products_count: 0,
    //     created_at: new Date().toISOString(),
    //     updated_at: new Date().toISOString()
    //   }
    // ]

    try {
      // upsertProductCategories(defaultCategories)
      // console.log('[DB] Default product categories created successfully')
    } catch (dbError: any) {
      console.error('[DB] Failed to create default product categories:', dbError.message)
      throw error // Throw original API error
    }
  }
}
