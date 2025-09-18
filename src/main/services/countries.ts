import { getDatabase } from '../database/connection'
import { CountryRecord } from '../database/types'
import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken } from './auth'
import { apiClient } from './apiClient'

export function upsertCountries(countries: CountryRecord[]): void {
  const database = getDatabase()
  const stmt = database.prepare(
    `INSERT INTO countries (id, name, short_code, phone_code, active, logo_url, created_at, updated_at)
     VALUES (@id, @name, @short_code, @phone_code, @active, @logo_url, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       short_code = excluded.short_code,
       phone_code = excluded.phone_code,
       active = excluded.active,
       logo_url = excluded.logo_url,
       updated_at = excluded.updated_at`
  )
  const insertMany = database.transaction((rows: CountryRecord[]) => {
    for (const row of rows) stmt.run(row)
  })
  insertMany(countries)
}

export function getCountries(): CountryRecord[] {
  const database = getDatabase()
  return database.prepare('SELECT * FROM countries ORDER BY name').all() as CountryRecord[]
}

export function getActiveCountries(): CountryRecord[] {
  const database = getDatabase()
  return database.prepare('SELECT * FROM countries WHERE active = 1 ORDER BY name').all() as CountryRecord[]
}

export function getCountryByCode(shortCode: string): CountryRecord | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM countries WHERE short_code = ?').get(shortCode) as CountryRecord | undefined
  return result || null
}

export async function fetchAndSaveCountries(): Promise<void> {
  console.log('[DB] Fetching countries from remote API...')

  try {
    const response = await apiClient.get('/countries')
    console.log('[DB] Countries API response:', response)

    // Extract countries array using flexible extraction
    const countriesData = apiClient.extractArrayData(response, 'data', 'countries', 'data.data')
    
    if (countriesData.length === 0) {
      // Try alternative extraction paths
      const altData = apiClient.extractData(response, 'data', 'attributes')
      if (Array.isArray(altData)) {
        countriesData.push(...altData)
      }
    }

    if (countriesData.length > 0) {
      const countries = countriesData.map((country: any) => ({
        id: country.id || country.attributes?.id || Math.random().toString(),
        name: country.attributes?.name || country.name || 'Unknown Country',
        short_code: country.attributes?.short_code || country.short_code || country.code || 'XX',
        phone_code: country.attributes?.phone_code || country.phone_code || country.dial_code || '+0',
        active: country.attributes?.active !== undefined ? country.attributes.active : (country.active !== undefined ? country.active : 1),
        logo_url: country.attributes?.logo_url || country.logo_url || country.flag || null,
        created_at: country.attributes?.created_at || country.created_at || new Date().toISOString(),
        updated_at: country.attributes?.updated_at || country.updated_at || new Date().toISOString()
      }))

      upsertCountries(countries)
      console.log(`[DB] ${countries.length} countries saved successfully with flexible extraction`)
    } else {
      console.warn('[DB] No countries data found in API response, creating default countries...')
      
      // Create some default countries if API doesn't return any
      const defaultCountries: CountryRecord[] = [
        {
          id: '1',
          name: 'Nigeria',
          short_code: 'NG',
          phone_code: '+234',
          active: 1,
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'United States',
          short_code: 'US',
          phone_code: '+1',
          active: 1,
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'United Kingdom',
          short_code: 'GB',
          phone_code: '+44',
          active: 1,
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      upsertCountries(defaultCountries)
      console.log(`[DB] ${defaultCountries.length} default countries created`)
    }
  } catch (error: any) {
    console.error('[DB] Failed to fetch countries:', error.message)
    
    // Create default countries on error
    console.log('[DB] Creating default countries due to API failure...')
    const defaultCountries: CountryRecord[] = [
      {
        id: '1',
        name: 'Nigeria',
        short_code: 'NG',
        phone_code: '+234',
        active: 1,
        logo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    try {
      upsertCountries(defaultCountries)
      console.log('[DB] Default countries created successfully')
    } catch (dbError: any) {
      console.error('[DB] Failed to create default countries:', dbError.message)
      throw error // Throw original API error
    }
  }
}


