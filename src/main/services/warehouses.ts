import { getDatabase } from '../database/connection'
import { WarehouseRecord } from '../database/types'
// import { getBaseUrl } from '../database/connection'
// import { requireCurrentUserToken } from './auth'
import { apiClient } from './apiClient'

export function upsertWarehouses(warehouses: WarehouseRecord[]): void {
  const database = getDatabase()
  const stmt = database.prepare(
    `INSERT INTO warehouses (id, name, phone, country, city, email, zip_code, state, address, created_at, updated_at)
     VALUES (@id, @name, @phone, @country, @city, @email, @zip_code, @state, @address, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       phone = excluded.phone,
       country = excluded.country,
       city = excluded.city,
       email = excluded.email,
       zip_code = excluded.zip_code,
       state = excluded.state,
       address = excluded.address,
       updated_at = excluded.updated_at`
  )
  const insertMany = database.transaction((rows: WarehouseRecord[]) => {
    for (const row of rows) stmt.run(row)
  })
  insertMany(warehouses)
}

export function getWarehouses(): WarehouseRecord[] {
  const database = getDatabase()
  return database.prepare('SELECT * FROM warehouses ORDER BY name').all() as WarehouseRecord[]
}

export function getWarehouseById(id: number): WarehouseRecord | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM warehouses WHERE id = ?').get(id) as
    | WarehouseRecord
    | undefined
  return result || null
}

export function getDefaultWarehouse(): WarehouseRecord | null {
  const database = getDatabase()
  // Try to get the first warehouse, or return null if none exist
  const result = database.prepare('SELECT * FROM warehouses ORDER BY id LIMIT 1').get() as
    | WarehouseRecord
    | undefined
  return result || null
}

export async function fetchAndSaveWarehouses(): Promise<void> {
  console.log('[DB] Fetching warehouses from remote API...')

  try {
    const response = await apiClient.get('/warehouses')
    console.log('[DB] Warehouses API response:', response)

    // Extract warehouses array using flexible extraction
    const warehousesData = apiClient.extractArrayData(response, 'data', 'warehouses', 'data.data')

    if (warehousesData.length === 0) {
      // Try alternative extraction paths
      const altData = apiClient.extractData(response, 'data', 'attributes')
      if (Array.isArray(altData)) {
        warehousesData.push(...altData)
      }
    }

    if (warehousesData.length > 0) {
      const warehouses = warehousesData.map((warehouse: any) => ({
        id: warehouse.id || warehouse.attributes?.id || Math.random().toString(),
        name: warehouse.attributes?.name || warehouse.name || 'Default Warehouse',
        phone: warehouse.attributes?.phone || warehouse.phone || '',
        country: warehouse.attributes?.country || warehouse.country || 'Nigeria',
        city: warehouse.attributes?.city || warehouse.city || 'Lagos',
        email: warehouse.attributes?.email || warehouse.email || '',
        zip_code: warehouse.attributes?.zip_code || warehouse.zip_code || null,
        state: warehouse.attributes?.state || warehouse.state || '',
        address: warehouse.attributes?.address || warehouse.address || '',
        created_at: warehouse.attributes?.created_at || warehouse.created_at || new Date().toISOString(),
        updated_at: warehouse.attributes?.updated_at || warehouse.updated_at || new Date().toISOString()
      }))

      upsertWarehouses(warehouses)
      console.log(`[DB] ${warehouses.length} warehouses saved successfully with flexible extraction`)
    } else {
      console.warn('[DB] No warehouses data found in API response, creating default warehouse...')

      // Create a default warehouse if API doesn't return any
      const defaultWarehouses: WarehouseRecord[] = [
        {
          id: 1,
          name: 'Main Warehouse',
          phone: '',
          country: 'Nigeria',
          city: 'Lagos',
          email: '',
          zip_code: null,
          state: 'Lagos',
          address: 'Main Warehouse Address',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      upsertWarehouses(defaultWarehouses)
      console.log(`[DB] ${defaultWarehouses.length} default warehouses created`)
    }
  } catch (error: any) {
    console.error('[DB] Failed to fetch warehouses:', error.message)

    // Create default warehouse on error
    console.log('[DB] Creating default warehouse due to API failure...')
    const defaultWarehouses: WarehouseRecord[] = [
      {
        id: 1,
        name: 'Main Warehouse',
        phone: '',
        country: 'Nigeria',
        city: 'Lagos',
        email: '',
        zip_code: null,
        state: 'Lagos',
        address: 'Main Warehouse Address',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    try {
      upsertWarehouses(defaultWarehouses)
      console.log('[DB] Default warehouse created successfully')
    } catch (dbError: any) {
      console.error('[DB] Failed to create default warehouse:', dbError.message)
      throw error // Throw original API error
    }
  }
}
