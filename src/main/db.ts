import { app, ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

let db: Database.Database | null = null

export interface ProductRecord {
  id: string
  name: string
  price: number
  category: string
  raw_response: string | null
}

export interface ProductSyncProgress {
  id: string
  current_page: number
  last_page: number
  is_completed: boolean
  last_sync_at: string
  total_products: number
}

export interface UserRecord {
  id: string
  username: string
  email: string | null
  name: string | null
  token: string | null
  password_salt: string
  password_hash: string
  created_at: string
  updated_at: string
  raw_response: string | null
}

export function getDatabaseFilePath(): string {
  const userDataDir = app.getPath('userData')
  const filePath = join(userDataDir, 'data', 'cheetah.sqlite3')
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return filePath
}

export function closeDatabase(): void {
  if (db) {
    try {
      db.close()
      console.log('[DB] Database closed')
    } catch (error: any) {
      console.error('[DB] Error closing database:', error.message)
    }
    db = null
  }
}

export function initDatabase(): void {
  if (db) return
  
  try {
    const filePath = getDatabaseFilePath()
    db = new Database(filePath)
    console.log('[DB] Using file:', filePath)

    // Configure database for better concurrency
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('busy_timeout = 5000') // Wait up to 5 seconds if database is locked

    // Run migrations to ensure all tables and columns exist
    runMigrations()
  } catch (error: any) {
    console.error('[DB] Failed to initialize database:', error.message)
    if (error.message.includes('database is locked')) {
      console.error('[DB] Database is locked. Please close any other instances of the app.')
    }
    throw error
  }

  // Seed minimal products if empty to enable immediate UI testing
  const count = db.prepare('SELECT COUNT(1) as c FROM products').get() as { c: number }
  if (count.c === 0) {
    const seedProducts: ProductRecord[] = [
      { id: '1', name: 'MERBA DOUBLE CHOCO 200G', price: 4200, category: 'BISCUIT & COOKIES', raw_response: null },
      { id: '2', name: 'MERBER WHITE CHOCO CRANB 150G', price: 3300, category: 'BISCUIT & COOKIES', raw_response: null },
      { id: '3', name: 'MERBA CHOCO CHIP COOKIES 150G', price: 2950, category: 'BISCUIT & COOKIES', raw_response: null },
      { id: '4', name: 'MERBA NOUGATELLI COOKIES', price: 2200, category: 'BISCUIT & COOKIES', raw_response: null },
      { id: '5', name: 'HELLEMA SPECULAAS', price: 599.99, category: 'BISCUIT & COOKIES', raw_response: null },
      { id: '6', name: 'LORD OF WAFERS', price: 100, category: 'BISCUIT & COOKIES', raw_response: null },
      { id: '7', name: 'MERBA TRIPLE CHOCOLATE COOKIES', price: 2300, category: 'BISCUIT & COOKIES', raw_response: null },
      { id: '8', name: 'BEST DREAM PURPLE COOKIES', price: 450, category: 'BISCUIT & COOKIES', raw_response: null }
    ]
    upsertProducts(seedProducts)
  }

  registerDatabaseIpcHandlers()
}

function runMigrations(): void {
  console.log('[DB] Running migrations...')
  
  try {
    // Create migrations table if it doesn't exist
    db!.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at TEXT NOT NULL
      );
    `)
  } catch (error: any) {
    console.error('[DB] Failed to create migrations table:', error.message)
    throw error
  }

  // Migration 1: Create products table
  if (!migrationExists('001_create_products_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          category TEXT NOT NULL
        );
      `)
      markMigrationComplete('001_create_products_table')
      console.log('[DB] Migration 001: Created products table')
    } catch (error: any) {
      console.error('[DB] Migration 001 failed:', error.message)
      throw error
    }
  }

  // Migration 2: Create users table
  if (!migrationExists('002_create_users_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT,
          name TEXT,
          token TEXT,
          password_salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `)
      markMigrationComplete('002_create_users_table')
      console.log('[DB] Migration 002: Created users table')
    } catch (error: any) {
      console.error('[DB] Migration 002 failed:', error.message)
      throw error
    }
  }

  // Migration 3: Add raw_response column to users table
  if (!migrationExists('003_add_raw_response_to_users')) {
    try {
      // Check if column exists
      const columns = db!.prepare("PRAGMA table_info(users)").all() as any[]
      const hasRawResponse = columns.some(col => col.name === 'raw_response')
      
      if (!hasRawResponse) {
        // Create new table with the column
        db!.exec(`
          CREATE TABLE users_new (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            name TEXT,
            token TEXT,
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            raw_response TEXT
          );
        `)
        
        // Copy data from old table to new table
        db!.exec(`
          INSERT INTO users_new (id, username, email, name, token, password_salt, password_hash, created_at, updated_at)
          SELECT id, username, email, name, token, password_salt, password_hash, created_at, updated_at
          FROM users;
        `)
        
        // Drop old table and rename new table
        db!.exec('DROP TABLE users;')
        db!.exec('ALTER TABLE users_new RENAME TO users;')
        
        console.log('[DB] Migration 003: Added raw_response column to users table')
      }
    } catch (error: any) {
      console.log('[DB] Migration 003 error:', error.message)
    }
    markMigrationComplete('003_add_raw_response_to_users')
  }

  // Migration 4: Add raw_response column to products table and create product_sync_progress table
  if (!migrationExists('004_add_raw_response_to_products_and_sync_progress')) {
    try {
      // Check if raw_response column exists in products table
      const productColumns = db!.prepare("PRAGMA table_info(products)").all() as any[]
      const hasProductRawResponse = productColumns.some(col => col.name === 'raw_response')
      
      if (!hasProductRawResponse) {
        // Create new products table with raw_response column
        db!.exec(`
          CREATE TABLE products_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            raw_response TEXT
          );
        `)
        
        // Copy data from old products table to new table
        db!.exec(`
          INSERT INTO products_new (id, name, price, category)
          SELECT id, name, price, category
          FROM products;
        `)
        
        // Drop old table and rename new table
        db!.exec('DROP TABLE products;')
        db!.exec('ALTER TABLE products_new RENAME TO products;')
        
        console.log('[DB] Migration 004: Added raw_response column to products table')
      }

      // Create product_sync_progress table
      db!.exec(`
        CREATE TABLE IF NOT EXISTS product_sync_progress (
          id TEXT PRIMARY KEY DEFAULT 'default',
          current_page INTEGER NOT NULL DEFAULT 1,
          last_page INTEGER NOT NULL DEFAULT 1,
          is_completed BOOLEAN NOT NULL DEFAULT 0,
          last_sync_at TEXT NOT NULL,
          total_products INTEGER NOT NULL DEFAULT 0
        );
      `)
      
      console.log('[DB] Migration 004: Created product_sync_progress table')
    } catch (error: any) {
      console.error('[DB] Migration 004 failed:', error.message)
      throw error
    }
    markMigrationComplete('004_add_raw_response_to_products_and_sync_progress')
  }

  console.log('[DB] All migrations completed')
}

function migrationExists(name: string): boolean {
  const result = db!.prepare('SELECT 1 FROM migrations WHERE name = ?').get(name)
  return !!result
}

function markMigrationComplete(name: string): void {
  const now = new Date().toISOString()
  db!.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(name, now)
}

function requireDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function listProducts(category?: string): ProductRecord[] {
  const database = requireDb()
  if (category) {
    return database
      .prepare('SELECT id, name, price, category, raw_response FROM products WHERE category = ? ORDER BY name')
      .all(category) as ProductRecord[]
  }
  return database
    .prepare('SELECT id, name, price, category, raw_response FROM products ORDER BY name')
    .all() as ProductRecord[]
}

export function upsertProducts(products: ProductRecord[]): void {
  const database = requireDb()
  const stmt = database.prepare(
    `INSERT INTO products (id, name, price, category, raw_response)
     VALUES (@id, @name, @price, @category, @raw_response)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       price = excluded.price,
       category = excluded.category,
       raw_response = excluded.raw_response`
  )
  const insertMany = database.transaction((rows: ProductRecord[]) => {
    for (const row of rows) stmt.run(row)
  })
  insertMany(products)
}

// Product sync functions
export function getProductSyncProgress(): ProductSyncProgress | null {
  const database = requireDb()
  const result = database.prepare(
    'SELECT * FROM product_sync_progress WHERE id = ?'
  ).get('default') as ProductSyncProgress | undefined
  
  return result || null
}

export function updateProductSyncProgress(progress: Partial<ProductSyncProgress>): void {
  const database = requireDb()
  const now = new Date().toISOString()
  
  const stmt = database.prepare(`
    INSERT INTO product_sync_progress (id, current_page, last_page, is_completed, last_sync_at, total_products)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      current_page = excluded.current_page,
      last_page = excluded.last_page,
      is_completed = excluded.is_completed,
      last_sync_at = excluded.last_sync_at,
      total_products = excluded.total_products
  `)
  
  stmt.run(
    'default',
    progress.current_page || 1,
    progress.last_page || 1,
    progress.is_completed ? 1 : 0,
    progress.last_sync_at || now,
    progress.total_products || 0
  )
}

export function resetProductSyncProgress(): void {
  const database = requireDb()
  const now = new Date().toISOString()
  
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO product_sync_progress (id, current_page, last_page, is_completed, last_sync_at, total_products)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  
  stmt.run('default', 1, 1, 0, now, 0)
}

export async function syncProductsFromRemote(baseUrl: string, userToken: string): Promise<void> {
  console.log('[DB] Starting product sync from remote...')
  console.log('[DB] Base URL:', baseUrl)
  console.log('[DB] Token available:', !!userToken)
  
  // Reset sync progress
  resetProductSyncProgress()
  
  // First, test the connection with a simple endpoint
  try {
    console.log('[DB] Testing connection...')
    const testUrl = new URL('/api/user', baseUrl) // or any simple endpoint
    const testResponse = await fetch(testUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    console.log(`[DB] Test response status: ${testResponse.status}`)
    if (testResponse.ok) {
      const testData = await testResponse.json()
      console.log('[DB] Test response data:', testData)
    }
  } catch (error) {
    console.log('[DB] Test connection failed:', error)
  }
  
  let currentPage = 1
  let lastPage = 10
  let totalProducts = 0
  
  // Try different possible endpoints
  const endpoints = ['/products', '/api/products', '/api/v1/products']
  
  for (const endpoint of endpoints) {
    try {
      console.log(`[DB] Trying endpoint: ${endpoint}`)
      
      while (currentPage <= lastPage) {
        console.log(`[DB] Fetching products page ${currentPage}...`)
        
        const url = new URL(endpoint, baseUrl)
        url.searchParams.set('page', currentPage.toString())
      
      console.log(`[DB] Making request to: ${url.toString()}`)
      console.log(`[DB] Headers:`, {
        'Authorization': `Bearer ${userToken.substring(0, 10)}...`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      })
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`[DB] Response status: ${response.status}`)
      console.log(`[DB] Response headers:`, Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available')
        console.error(`[DB] Error response body:`, errorText)
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log(`[DB] Received products data:`, {
        current_page: data.meta.current_page,
        last_page: data.meta.last_page,
        total: data.meta.total,
        data_length: data.data?.length || 0,
        has_data: !!data.data,
        is_array: Array.isArray(data.data)
      })
      console.log(`[DB] Full response structure:`, Object.keys(data))
      
      // Update pagination info on first page
      if (currentPage === 1) {
        lastPage = data.meta.last_page || 1
        totalProducts = data.meta.total || 0
      }
      
      // Process and store products
      if (data.data && Array.isArray(data.data)) {
        const products: ProductRecord[] = data.data.map((product: any) => ({
          id: String(product.id),
          name: product.attributes.name || '',
          price: parseFloat(product.attributes.price) || 0,
          category: product.attributes.category || '',
          raw_response: JSON.stringify(product)
        }))
        
        upsertProducts(products)
        console.log(`[DB] Stored ${products.length} products from page ${currentPage}`)
      }
      
      // Update sync progress
      updateProductSyncProgress({
        current_page: currentPage,
        last_page: lastPage,
        is_completed: currentPage >= lastPage,
        total_products: totalProducts
      })
      
        // Wait 20 seconds before next page (except for the last page)
        if (currentPage < lastPage) {
          console.log(`[DB] Waiting 20 seconds before next page...`)
          await new Promise(resolve => setTimeout(resolve, 20000))
        }
        
        currentPage++
      }
      
      console.log(`[DB] Product sync completed successfully with endpoint: ${endpoint}`)
      return // Success, exit the function
      
    } catch (error: any) {
      console.error(`[DB] Endpoint ${endpoint} failed:`, error.message)
      if (endpoint === endpoints[endpoints.length - 1]) {
        // This was the last endpoint, throw the error
        console.error('[DB] All endpoints failed')
        // Update progress to show failure
        updateProductSyncProgress({
          current_page: currentPage,
          last_page: lastPage,
          is_completed: false,
          total_products: totalProducts
        })
        throw error
      }
      // Continue to next endpoint
      continue
    }
  }
}

// User management functions
export function findUserByEmailOrUsername(emailOrUsername: string): UserRecord | null {
  const database = requireDb()
  const result = database.prepare(
    'SELECT * FROM users WHERE email = ? OR username = ?'
  ).get(emailOrUsername, emailOrUsername) as UserRecord | undefined
  
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
  const database = requireDb()
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

async function remoteLogin(baseUrl: string, credentials: { email: string; password: string }): Promise<any> {
  // Try different possible endpoints
  const endpoints = [ '/login', '/api/login']
  
  for (const endpoint of endpoints) {
    try {
      const url = new URL(endpoint, baseUrl).toString()
      console.log('[DB] Trying endpoint:', url)
      console.log('[DB] Credentials:', { email: credentials.email, password: '***' })
      
      // First, try to get CSRF token if it's a Laravel app
      let csrfToken = ''
      try {
        const csrfResponse = await fetch(url.replace(endpoint, '/sanctum/csrf-cookie'), {
          method: 'GET',
          credentials: 'include'
        })
        if (csrfResponse.ok) {
          // Extract CSRF token from cookies
          const cookies = csrfResponse.headers.get('set-cookie')
          if (cookies) {
            const csrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/)
            if (csrfMatch) {
              csrfToken = decodeURIComponent(csrfMatch[1])
              console.log('[DB] Got CSRF token:', csrfToken)
            }
          }
        }
      } catch (error) {
        console.log('[DB] Could not get CSRF token, proceeding without it')
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken
      }
      
      const res = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(credentials)
      })
      
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        console.log('[DB] Remote login successful with endpoint:', endpoint)
        return data
      } else {
        const text = await res.text().catch(() => '')
        console.log(`[DB] Endpoint ${endpoint} failed:`, res.status, text)
        if (endpoint === endpoints[endpoints.length - 1]) {
          // This was the last endpoint, throw the error
          console.log('[DB] All endpoints failed')
          console.log('[DB] Response headers:', Object.fromEntries(res.headers.entries()))
          throw new Error(`Remote login failed: ${res.status} ${text}`)
        }
        // Continue to next endpoint
        continue
      }
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
  const id = String(user.id ?? user.userId ?? user.uuid)
  const email: string | null = user.email ?? null
  const firstName = user.first_name ?? user.firstName ?? null
  const lastName = user.last_name ?? user.lastName ?? null
  const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim()
  const name: string | null = combinedName || user.name || null
  const token: string | null = top?.new_token?.access_token ?? top?.token ?? null
  const username: string = (user.username ?? email ?? String(id)).toString()
  return { id, username, email, name, token }
}

// Add product sync IPC handlers
function registerProductSyncIpcHandlers(): void {
  ipcMain.handle('products:sync:start', async (_event, { baseUrl, userToken }: { baseUrl: string; userToken: string }) => {
    try {
      await syncProductsFromRemote(baseUrl, userToken)
      return { success: true }
    } catch (error: any) {
      throw new Error(`Product sync failed: ${error.message}`)
    }
  })

  ipcMain.handle('products:sync:progress', () => {
    return getProductSyncProgress()
  })

  ipcMain.handle('products:sync:reset', () => {
    resetProductSyncProgress()
    return { success: true }
  })
}

function registerDatabaseIpcHandlers(): void {
  console.log('[DB] Registering IPC handlers...')
  
  ipcMain.handle('db:products:list', (_event, category?: string) => {
    return listProducts(category)
  })

  ipcMain.handle('db:products:upsertMany', (_event, products: ProductRecord[]) => {
    upsertProducts(products)
    return { success: true }
  })

  ipcMain.handle('db:path', () => {
    return getDatabaseFilePath()
  })

  ipcMain.handle('auth:login', async (_event, credentials: { email: string; password: string }) => {
    const baseUrl = process.env.BASE_URL || ''
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
      if (!baseUrl) {
        console.log('[DB] No BASE_URL configured for remote fallback')
        throw new Error('Invalid credentials and no backend configured')
      }
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
    if (!baseUrl) {
      console.log('[DB] No BASE_URL configured for remote login')
      throw new Error('User not found locally and no backend configured')
    }
    
    try {
      console.log('[DB] Attempting remote login for new user')
      const remote = await remoteLogin(baseUrl, credentials)
      const stored = upsertUserFromRemote(remote, credentials.password)
      return { user: toUserPayload(stored), source: 'remote' as const }
    } catch (error: any) {
      console.log('[DB] Remote login failed:', error.message)
      throw new Error(error.message || 'Login failed')
    }
  })

  // Dev helper: seed a user directly from a provided API response payload
  ipcMain.handle('auth:seedFromResponse', (_event, payload: { response: any; password: string }) => {
    console.log('[DB] Seeding user from response...')
    const stored = upsertUserFromRemote(payload.response, payload.password)
    return { user: toUserPayload(stored) }
  })

  // Helper to get raw response data for a user
  ipcMain.handle('auth:getRawResponse', (_event, emailOrUsername: string) => {
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
  })

  // Register product sync handlers
  registerProductSyncIpcHandlers()
}
