import { getDatabase } from '../database/connection'
import { UnitRecord } from '../database/types'
import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken } from './auth'

export function upsertUnits(units: UnitRecord[]): void {
  const database = getDatabase()
  const stmt = database.prepare(
    `INSERT INTO units (id, name, short_name, base_unit_id, operator, operation_value, business_profile_id, created_at, updated_at)
     VALUES (@id, @name, @short_name, @base_unit_id, @operator, @operation_value, @business_profile_id, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       short_name = excluded.short_name,
       base_unit_id = excluded.base_unit_id,
       operator = excluded.operator,
       operation_value = excluded.operation_value,
       business_profile_id = excluded.business_profile_id,
       updated_at = excluded.updated_at`
  )
  const insertMany = database.transaction((rows: UnitRecord[]) => {
    for (const row of rows) stmt.run(row)
  })
  insertMany(units)
}

export function getUnits(): UnitRecord[] {
  const database = getDatabase()
  return database.prepare('SELECT * FROM units ORDER BY name').all() as UnitRecord[]
}

export function getUnitById(id: number): UnitRecord | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM units WHERE id = ?').get(id) as
    | UnitRecord
    | undefined
  return result || null
}

export function getBaseUnits(): UnitRecord[] {
  const database = getDatabase()
  return database
    .prepare('SELECT * FROM units WHERE base_unit_id IS NULL ORDER BY name')
    .all() as UnitRecord[]
}

export async function fetchAndSaveUnits(): Promise<void> {
  console.log('[DB] Fetching units from remote API...')

  const userToken = requireCurrentUserToken()
  const baseUrl = getBaseUrl()

  if (!baseUrl) {
    throw new Error('Base URL is not configured')
  }

  let retries = 3
  let lastError = ''

  while (retries > 0) {
    try {
      const response = await fetch(`${baseUrl}/units`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json'
        }
      })

      const responseText = await response.text()
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error('[DB] Failed to parse response:', responseText)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`
        if (response.status === 401 || response.status === 403) {
          // Don't retry auth errors
          throw new Error(`Authentication error: ${errorMessage}`)
        }
        throw new Error(errorMessage)
      }

      console.log('[DB] Units API response:', data?.data?.length)

      if ( data?.data && Array.isArray(data?.data)) {
        const units = data?.data?.map((unit: any) => ({
          id: unit?.id,
          name: unit?.attributes?.name || unit?.name,
          short_name: unit?.attributes?.short_name || unit?.short_name,
          base_unit_id: unit?.attributes?.base_unit_id || unit?.base_unit_id || null,
          operator: unit?.attributes?.operator || unit?.operator || null,
          operation_value: unit?.attributes?.operation_value || unit?.operation_value || null,
          business_profile_id:
            unit?.attributes?.business_profile_id || unit?.business_profile_id || 1,
          created_at: unit?.attributes?.created_at || unit?.created_at || new Date().toISOString(),
          updated_at: unit?.attributes?.updated_at || unit?.updated_at || new Date().toISOString()
        }))

        upsertUnits(units)
        console.log(`[DB] ${units.length} units saved successfully`)
        break // Success, exit retry loop
      } else {
        throw new Error('Invalid response format from units API')
      }
    } catch (error: any) {
      lastError = error.message
      console.error('[DB] Failed to fetch units:', lastError)
      retries--

      if (retries > 0) {
        // Wait before retrying, with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, (4 - retries) * 1000))
        console.log(`[DB] Retrying units fetch, ${retries} attempts remaining`)
        continue
      }
      throw new Error(`Failed to fetch units after all retries: ${lastError}`)
    }
  }
}
