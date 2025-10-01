import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getDatabase } from '../database/connection'
import { getBaseUrl } from '../database/connection'
import { UserRecord } from '../database/types'
import { apiClient } from './apiClient'

// User management functions
export function findUserByEmailOrUsername(emailOrUsername: string): UserRecord | null {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const result = database
    .prepare('SELECT * FROM users WHERE email = ? OR username = ?')
    .get(emailOrUsername, emailOrUsername) as UserRecord | undefined

  return result || null
}

export function upsertUserNormalized(
  id: string,
  username: string,
  email: string | null,
  name: string | null,
  token: string | null,
  passwordSalt: string,
  passwordHash: string,
  rawResponse?: any
): UserRecord {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT INTO users (id, username, email, name, token, password_salt, password_hash, created_at, updated_at, raw_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      email = excluded.email,
      name = excluded.name,
      token = excluded.token,
      password_salt = excluded.password_salt,
      password_hash = excluded.password_hash,
      updated_at = excluded.updated_at,
      raw_response = excluded.raw_response
  `)

  stmt.run(
    id,
    username,
    email,
    name,
    token,
    passwordSalt,
    passwordHash,
    now,
    now,
    rawResponse ? JSON.stringify(rawResponse) : null
  )

  return findUserByEmailOrUsername(username)!
}

export function upsertUserFromRemote(remote: any, plainPassword: string): UserRecord {
  const normalized = normalizeRemoteResponse(remote)
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plainPassword, salt, 64).toString('hex')

  return upsertUserNormalized(
    normalized.id,
    normalized.username,
    normalized.email,
    normalized.name,
    normalized.token,
    salt,
    hash,
    remote
  )
}

export function toUserPayload(user: UserRecord): any {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    token: user.token,
    raw_response: user.raw_response ? JSON.parse(user.raw_response) : null
  }
}

export function verifyPassword(plainPassword: string, salt: string, hash: string): boolean {
  try {
    const computedHash = scryptSync(plainPassword, salt, 64).toString('hex')
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'))
  } catch {
    return false
  }
}

async function remoteLogin(
  _baseUrl: string,
  credentials: { email: string; password: string }
): Promise<any> {
  // Try different possible endpoints
  const endpoints = ['/login', '/api/login']

  for (const endpoint of endpoints) {
    try {
      console.log('[DB] Trying endpoint:', endpoint)
      console.log('[DB] Credentials:', { email: credentials.email, password: '***' })

      // Use the flexible API client for login
      const response = await apiClient.post(endpoint, credentials)
      console.log('[DB] Remote login successful with endpoint:', endpoint)
      
      // Extract user data using flexible extraction
      const userData = apiClient.extractData(response, 'data.user', 'user', 'data.data.user')
      const token = apiClient.safeExtract(response, 'data.token', null) || 
                   apiClient.safeExtract(response, 'token', null) ||
                   apiClient.safeExtract(response, 'data.data.token', null)

      if (userData) {
        return {
          data: {
            user: userData,
            token: token
          },
          token: token,
          ...response
        }
      }

      // If no user data found, return the raw response
      return response

    } catch (error: any) {
      console.log(`[DB] Error with endpoint ${endpoint}:`, error.message)
      if (endpoint === endpoints[endpoints.length - 1]) {
        throw error
      }
      // Continue to next endpoint
      continue
    }
  }
}

function normalizeRemoteResponse(remote: any): {
  id: string
  username: string
  email: string | null
  name: string | null
  token: string | null
} {
  const top = remote?.data ?? remote
  const user = top?.user ?? top?.data?.user ?? null
  if (!user) {
    throw new Error('Login payload missing user')
  }

  return {
    id: user.id?.toString() ?? user.id,
    username: user.username ?? user.email ?? user.id?.toString(),
    email: user.email ?? null,
    name: user.first_name ?? user.username ?? null,
    token: top.token ?? null
  }
}

// Main login function
export async function performLogin(credentials: { email: string; password: string }): Promise<{
  user: any
  source: 'local' | 'remote'
}> {
  const baseUrl = getBaseUrl()
  console.log('[DB] Login attempt for:', credentials.email)
  console.log('[DB] BASE_URL from env:', baseUrl)

  const user = findUserByEmailOrUsername(credentials.email)

  if (user) {
    console.log('[DB] User found locally')
    const ok = verifyPassword(credentials.password, user.password_salt, user.password_hash)
    if (ok) {
      console.log('[DB] Local password verified')
      return { user: toUserPayload(user), source: 'local' as const }
    }
    // If local password mismatched, try remote (in case user changed password)
    try {
      console.log('[DB] Trying remote login for password mismatch')
      const remote = await remoteLogin(baseUrl, credentials)
      const stored = upsertUserFromRemote(remote, credentials.password)
      return { user: toUserPayload(stored), source: 'remote' as const }
    } catch (error) {
      throw new Error('Invalid credentials')
    }
  }

  // User not found locally, try remote login
  console.log('[DB] User not found locally, checking for remote login')
  try {
    console.log('[DB] Attempting remote login for new user')
    const remote = await remoteLogin(baseUrl, credentials)
    const stored = upsertUserFromRemote(remote, credentials.password)

    // After successful remote login, sync all data
    try {
      await syncAllData()
    } catch (syncError) {
      console.error('[DB] Initial data sync failed:', syncError)
      // Don't fail login if sync fails, just log the error
    }

    return { user: toUserPayload(stored), source: 'remote' as const }
  } catch (error: any) {
    console.log('[DB] Remote login failed:', error.message)
    throw new Error(error.message || 'Login failed')
  }
}

// Function to sync all data from remote API
export async function syncAllData(): Promise<void> {
  console.log('[DB] Starting initial data sync...')

  const syncTasks = [
    import('./productCategories').then((m) => m.fetchAndSaveProductCategories()),
    import('./paymentMethods').then((m) => m.fetchAndSavePaymentMethods()),
    import('./products').then((m) => m.syncProductsFromRemote()),
    import('./settings').then((m) => m.fetchAndSaveSettings()),
    import('./units').then((m) => m.fetchAndSaveUnits()),
    import('./warehouses').then((m) => m.fetchAndSaveWarehouses())
  ]

  try {
    await Promise.all(syncTasks)
    console.log('[DB] Initial data sync completed successfully')
  } catch (error) {
    console.error('[DB] Initial data sync failed:', error)
    throw error
  }
}

// Dev helper: seed a user directly from a provided API response payload
export function seedUserFromResponse(payload: { response: any; password: string }): { user: any } {
  console.log('[DB] Seeding user from response...')
  const stored = upsertUserFromRemote(payload.response, payload.password)
  return { user: toUserPayload(stored) }
}

// Helper to get raw response data for a user
export function getRawResponse(emailOrUsername: string): any {
  const user = findUserByEmailOrUsername(emailOrUsername)
  if (!user || !user.raw_response) {
    return null
  }
  try {
    return JSON.parse(user.raw_response)
  } catch (error) {
    console.error('[DB] Failed to parse raw response:', error)
    return null
  }
}

// Helper to get current user token (used by other services)
export function getCurrentUserToken(): string | null {
  const database = getDatabase()
  if (!database) {
    return null
  }

  const result = database
    .prepare('SELECT token FROM users WHERE token IS NOT NULL AND LENGTH(token) > 0 LIMIT 1')
    .get() as { token: string } | undefined
  return result?.token || null
}

// Helper to get current user ID (used by other services)
export function getCurrentUserId(): string | null {
  const database = getDatabase()
  if (!database) {
    return null
  }

  const result = database
    .prepare('SELECT id FROM users WHERE token IS NOT NULL AND LENGTH(token) > 0 LIMIT 1')
    .get() as { id: string } | undefined
  return result?.id || null
}

// Helper to require current user ID (used by other services)
export function requireCurrentUserId(): string {
  const userId = getCurrentUserId()
  if (!userId) {
    throw new Error('No user ID available. Please log in again.')
  }
  return userId
}

// Helper to require current user token (used by other services)
export function requireCurrentUserToken(): string {
  const token = getCurrentUserToken()
  if (!token) {
    throw new Error('No user token available. Please log in again.')
  }
  return token
}
