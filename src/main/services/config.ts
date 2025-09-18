import { getDatabase } from '../database/connection'
import { ConfigRecord } from '../database/types'
import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken } from './auth'

export function upsertConfig(configData: Omit<ConfigRecord, 'id' | 'created_at' | 'updated_at'>): ConfigRecord {
  const database = getDatabase()
  const now = new Date().toISOString()
  const id = 'config' // Single config record

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO config (
      id, permissions, is_currency_right, open_register, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    configData.permissions,
    configData.is_currency_right,
    configData.open_register ? 1 : 0,
    now,
    now
  )

  return getConfig()!
}

export function getConfig(): ConfigRecord | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM config WHERE id = ?').get('config') as ConfigRecord | undefined
  return result || null
}

export function isRegisterOpen(): boolean {
  const config = getConfig()
  return config?.open_register || false
}

export function getPermissions(): string[] {
  const config = getConfig()
  if (!config?.permissions) return []
  try {
    return JSON.parse(config.permissions)
  } catch {
    return []
  }
}

export function hasPermission(permission: string): boolean {
  const permissions = getPermissions()
  return permissions.includes(permission)
}

export async function fetchAndSaveConfig(): Promise<void> {
  console.log('[DB] Fetching business config from remote API...')

  const userToken = requireCurrentUserToken()
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/config`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    // console.log('[DB] Config API response:', data)

    if ( data?.data) {
      const config: Omit<ConfigRecord, 'id' | 'created_at' | 'updated_at'> = {
        permissions: JSON.stringify(data.data.attributes?.permissions || []),
        is_currency_right: data.data.attributes?.is_currency_right || '0',
        open_register: data.data.attributes?.open_register || false
      }

      upsertConfig(config)
      console.log('[DB] Business config saved successfully')
    } else {
      throw new Error('Invalid response format from config API')
    }
  } catch (error: any) {
    console.error('[DB] Failed to fetch business config:', error.message)
    throw error
  }
}


