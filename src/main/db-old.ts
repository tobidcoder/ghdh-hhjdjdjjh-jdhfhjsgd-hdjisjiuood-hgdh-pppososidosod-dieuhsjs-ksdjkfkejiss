import { app, ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Centralized base URL function
function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:8000/api'
  console.log('[DB] Using base URL:', baseUrl)
  return baseUrl
}

let db: Database.Database | null = null

export interface ProductRecord {
  id: string
  name: string
  price: number
  category: string
  code: string | null
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

export interface SaleRecord {
  id: string
  invoice_number: string
  customer_name: string | null
  customer_phone: string | null
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_method: string
  payment_status: string
  items: string // JSON string of cart items
  created_at: string
  synced_at: string | null
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed'
  sync_attempts: number
  last_sync_error: string | null
  // New fields for API compatibility
  ref: string | null
  date: string
  customer_id: number
  warehouse_id: number
  sale_items: string | null // JSON string of sale items in API format
  grand_total: string | null
  discount: number
  shipping: number
  tax_rate: number
  note: string | null
  status: number
  hold_ref_no: string | null
  user_id: string // ID of the user who created this sale
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

export interface SettingsRecord {
  id: string
  currency: string
  email: string
  company_name: string
  phone: string
  default_language: string
  default_customer: string
  default_warehouse: string
  address: string
  logo: string | null
  show_phone: string
  show_address: string
  show_customer: string
  show_email: string
  show_tax_discount_shipping: string
  show_note: string | null
  show_barcode_in_receipt: string
  show_logo_in_receipt: string
  protect_cart_product_delete: string
  protect_cart_product_reduce: string
  enable_shipping: string
  enable_tax: string
  enable_discount: string
  warehouse_name: string
  customer_name: string
  currency_symbol: string
  created_at: string
  updated_at: string
}

export interface FrontSettingsRecord {
  id: string
  currency: string
  email: string
  company_name: string
  phone: string
  default_language: string
  default_customer: string
  default_warehouse: string
  address: string
  protect_cart_product_delete: string
  protect_cart_product_reduce: string
  enable_shipping: string
  enable_tax: string
  enable_discount: string
  logo: string | null
  warehouse_name: string
  customer_name: string
  currency_symbol: string
  roles: string | null // JSON string of roles array
  connected_accounts: string | null // JSON string of connected accounts array
  created_at: string
  updated_at: string
}

export interface CountryRecord {
  id: number
  name: string
  short_code: string
  phone_code: number
  active: number
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface ConfigRecord {
  id: string
  permissions: string // JSON string of permissions array
  is_currency_right: string
  open_register: boolean
  created_at: string
  updated_at: string
}

export interface WarehouseRecord {
  id: number
  name: string
  phone: string
  country: string
  city: string
  email: string
  zip_code: string | null
  state: string
  address: string
  created_at: string
  updated_at: string
}

export interface ProductCategoryRecord {
  id: number
  name: string
  image: string | null // JSON string of image array
  products_count: number
  created_at: string
  updated_at: string
}

export interface PaymentMethodRecord {
  id: number
  name: string
  display_name: string
  active: boolean
  business_profile_id: number
  user_id: number
  created_at: string
  updated_at: string
}

export interface UnitRecord {
  id: number
  name: string
  short_name: string
  base_unit: number
  is_default: boolean
  business_profile_id: number
  user_id: number
  created_at: string
  updated_at: string
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

    // Seed minimal products if empty to enable immediate UI testing
    try {
      const count = db.prepare('SELECT COUNT(1) as c FROM products').get() as { c: number }
      if (count.c === 0) {
        const seedProducts: ProductRecord[] = [

        ]
        upsertProducts(seedProducts)
      }
    } catch (seedError: any) {
      console.warn('[DB] Failed to seed products:', seedError.message)
      // Continue with initialization even if seeding fails
    }

    registerDatabaseIpcHandlers()
  } catch (error: any) {
    console.error('[DB] Failed to initialize database:', error.message)
    if (error.message.includes('database is locked')) {
      console.error('[DB] Database is locked. Please close any other instances of the app.')
    }
    throw error
  }
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

    // Check if critical tables are missing and reset migrations if needed
    const criticalTables = ['products', 'users', 'settings', 'sales']
    const missingTables = criticalTables.filter(table => !tableExists(table))

    if (missingTables.length > 0) {
      console.log('[DB] Detected missing tables:', missingTables)
      console.log('[DB] Resetting migrations to recreate missing tables...')
      resetMigrations()
    }
  } catch (error: any) {
    console.error('[DB] Failed to create migrations table:', error.message)
    throw error
  }

  // Migration 1: Create products table
  if (!migrationExists('001_create_products_table') || !tableExists('products')) {
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
  if (!migrationExists('002_create_users_table') || !tableExists('users')) {
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
      const columns = db!.prepare('PRAGMA table_info(users)').all() as any[]
      const hasRawResponse = columns.some((col) => col.name === 'raw_response')

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
      const productColumns = db!.prepare('PRAGMA table_info(products)').all() as any[]
      const hasProductRawResponse = productColumns.some((col) => col.name === 'raw_response')

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

  // Migration 5: Add code column to products table
  if (!migrationExists('005_add_code_to_products')) {
    try {
      // Check if code column exists in products table
      const productColumns = db!.prepare('PRAGMA table_info(products)').all() as any[]
      const hasCode = productColumns.some((col) => col.name === 'code')

      if (!hasCode) {
        // Create new products table with code column
        db!.exec(`
          CREATE TABLE products_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            code TEXT,
            raw_response TEXT
          );
        `)

        // Copy data from old products table to new table
        db!.exec(`
          INSERT INTO products_new (id, name, price, category, raw_response)
          SELECT id, name, price, category, raw_response
          FROM products;
        `)

        // Drop old table and rename new table
        db!.exec('DROP TABLE products;')
        db!.exec('ALTER TABLE products_new RENAME TO products;')

        console.log('[DB] Migration 005: Added code column to products table')
      }
    } catch (error: any) {
      console.error('[DB] Migration 005 failed:', error.message)
      throw error
    }
    markMigrationComplete('005_add_code_to_products')
  }

  // Migration 6: Create sales table
  if (!migrationExists('006_create_sales_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          invoice_number TEXT UNIQUE NOT NULL,
          customer_name TEXT,
          customer_phone TEXT,
          subtotal REAL NOT NULL,
          tax_amount REAL NOT NULL,
          total_amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          payment_status TEXT NOT NULL,
          items TEXT NOT NULL,
          created_at TEXT NOT NULL,
          synced_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          sync_attempts INTEGER NOT NULL DEFAULT 0,
          last_sync_error TEXT
        );
      `)

      console.log('[DB] Migration 006: Created sales table')
    } catch (error: any) {
      console.error('[DB] Migration 006 failed:', error.message)
      throw error
    }
    markMigrationComplete('006_create_sales_table')
  }

  // Migration 7: Create settings table
  if (!migrationExists('007_create_settings_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          currency TEXT NOT NULL,
          email TEXT NOT NULL,
          company_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          default_language TEXT NOT NULL,
          default_customer TEXT NOT NULL,
          default_warehouse TEXT NOT NULL,
          address TEXT NOT NULL,
          logo TEXT,
          show_phone TEXT NOT NULL,
          show_address TEXT NOT NULL,
          show_customer TEXT NOT NULL,
          show_email TEXT NOT NULL,
          show_tax_discount_shipping TEXT NOT NULL,
          show_note TEXT,
          show_barcode_in_receipt TEXT NOT NULL,
          show_logo_in_receipt TEXT NOT NULL,
          protect_cart_product_delete TEXT NOT NULL,
          protect_cart_product_reduce TEXT NOT NULL,
          enable_shipping TEXT NOT NULL,
          enable_tax TEXT NOT NULL,
          enable_discount TEXT NOT NULL,
          warehouse_name TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          currency_symbol TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete('007_create_settings_table')
      console.log('[DB] Created settings table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create settings table:', error)
      throw error
    }
  }

  // Migration 8: Create countries table
  if (!migrationExists('008_create_countries_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS countries (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          short_code TEXT NOT NULL,
          phone_code INTEGER NOT NULL,
          active INTEGER NOT NULL DEFAULT 0,
          logo_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete('008_create_countries_table')
      console.log('[DB] Created countries table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create countries table:', error)
      throw error
    }
  }

  // Migration 9: Create config table
  if (!migrationExists('009_create_config_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS config (
          id TEXT PRIMARY KEY,
          permissions TEXT NOT NULL,
          is_currency_right TEXT NOT NULL,
          open_register INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete('009_create_config_table')
      console.log('[DB] Created config table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create config table:', error)
      throw error
    }
  }

  // Migration 10: Create warehouses table
  if (!migrationExists('010_create_warehouses_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS warehouses (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          country TEXT NOT NULL,
          city TEXT NOT NULL,
          email TEXT NOT NULL,
          zip_code TEXT,
          state TEXT NOT NULL,
          address TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete('010_create_warehouses_table')
      console.log('[DB] Created warehouses table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create warehouses table:', error)
      throw error
    }
  }

  // Migration 11: Create product_categories table
  if (!migrationExists('011_create_product_categories_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS product_categories (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          image TEXT,
          products_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete('011_create_product_categories_table')
      console.log('[DB] Created product_categories table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create product_categories table:', error)
      throw error
    }
  }

  // Migration 12: Create payment_methods table
  if (!migrationExists('012_create_payment_methods_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS payment_methods (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          business_profile_id INTEGER NOT NULL DEFAULT 0,
          user_id INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete('012_create_payment_methods_table')
      console.log('[DB] Created payment_methods table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create payment_methods table:', error)
      throw error
    }
  }

  // Migration 13: Create units table
  if (!migrationExists('013_create_units_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS units (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          short_name TEXT NOT NULL,
          base_unit INTEGER NOT NULL,
          is_default INTEGER NOT NULL DEFAULT 0,
          business_profile_id INTEGER NOT NULL DEFAULT 0,
          user_id INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete('013_create_units_table')
      console.log('[DB] Created units table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create units table:', error)
      throw error
    }
  }

  // Migration 14: Add new columns to sales table for API compatibility
  if (!migrationExists('014_update_sales_table_api_fields')) {
    try {
      db!.exec(`
        ALTER TABLE sales ADD COLUMN ref TEXT DEFAULT NULL;
        ALTER TABLE sales ADD COLUMN date TEXT DEFAULT NULL;
        ALTER TABLE sales ADD COLUMN customer_id INTEGER DEFAULT 1;
        ALTER TABLE sales ADD COLUMN warehouse_id INTEGER DEFAULT 1;
        ALTER TABLE sales ADD COLUMN sale_items TEXT DEFAULT NULL;
        ALTER TABLE sales ADD COLUMN grand_total TEXT DEFAULT NULL;
        ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0;
        ALTER TABLE sales ADD COLUMN shipping REAL DEFAULT 0;
        ALTER TABLE sales ADD COLUMN tax_rate REAL DEFAULT 0;
        ALTER TABLE sales ADD COLUMN note TEXT DEFAULT NULL;
        ALTER TABLE sales ADD COLUMN status INTEGER DEFAULT 1;
        ALTER TABLE sales ADD COLUMN hold_ref_no TEXT DEFAULT NULL;
      `)

      console.log('[DB] Migration 014: Added API compatibility fields to sales table')
    } catch (error: any) {
      console.error('[DB] Migration 014 failed:', error.message)
      throw error
    }
    markMigrationComplete('014_update_sales_table_api_fields')
  }

  // Migration 15: Fix existing columns with empty string defaults
  if (!migrationExists('015_fix_empty_string_defaults')) {
    try {
      // Check if columns exist and update them to use NULL instead of empty strings
      db!.exec(`
        -- Update existing columns to use NULL instead of empty strings
        UPDATE sales SET ref = NULL WHERE ref = '';
        UPDATE sales SET date = NULL WHERE date = '';
        UPDATE sales SET sale_items = NULL WHERE sale_items = '';
        UPDATE sales SET grand_total = NULL WHERE grand_total = '';
        UPDATE sales SET note = NULL WHERE note = '';
        UPDATE sales SET hold_ref_no = NULL WHERE hold_ref_no = '';
      `)

      console.log('[DB] Migration 015: Fixed empty string defaults in sales table')
    } catch (error: any) {
      console.error('[DB] Migration 015 failed:', error.message)
      // Don't throw error for this migration as it's just a cleanup
    }
    markMigrationComplete('015_fix_empty_string_defaults')
  }



  // Migration 16: Create front_settings table for front-settings data
  if (!migrationExists('016_create_front_settings_table')) {
    try {
      db!.exec(`
        CREATE TABLE IF NOT EXISTS front_settings (
          id TEXT PRIMARY KEY,
          currency TEXT NOT NULL,
          email TEXT NOT NULL,
          company_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          default_language TEXT NOT NULL,
          default_customer TEXT NOT NULL,
          default_warehouse TEXT NOT NULL,
          address TEXT NOT NULL,
          protect_cart_product_delete TEXT NOT NULL,
          protect_cart_product_reduce TEXT NOT NULL,
          enable_shipping TEXT NOT NULL,
          enable_tax TEXT NOT NULL,
          enable_discount TEXT NOT NULL,
          logo TEXT,
          warehouse_name TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          currency_symbol TEXT NOT NULL,
          roles TEXT,
          connected_accounts TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      console.log('[DB] Migration 016: Created front_settings table')
    } catch (error: any) {
      console.error('[DB] Migration 016 failed:', error.message)
      throw error
    }
    markMigrationComplete('016_create_front_settings_table')
  }

  console.log('[DB] All migrations completed')
}

function migrationExists(name: string): boolean {
  const result = db!.prepare('SELECT 1 FROM migrations WHERE name = ?').get(name)
  return !!result
}

function tableExists(tableName: string): boolean {
  try {
    const result = db!.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName)
    return !!result
  } catch (error) {
    return false
  }
}

export function resetMigrations(): void {
  try {
    if (db) {
      db.exec('DELETE FROM migrations')
      console.log('[DB] Migrations reset successfully')
    }
  } catch (error: any) {
    console.error('[DB] Failed to reset migrations:', error.message)
  }
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

export function searchProductByCode(code: string): ProductRecord | null {
  const database = requireDb()
  const result = database
    .prepare('SELECT id, name, price, category, code, raw_response FROM products WHERE code = ?')
    .get(code) as ProductRecord | undefined

  return result || null
}

export function searchProducts(query: string, limit: number = 50): ProductRecord[] {
  const database = requireDb()
  const searchTerm = `%${query}%`

  const result = database
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

  return result
}

export function listProducts(category?: string | number, limit: number = 50): ProductRecord[] {
  const database = requireDb()
  if (category && category !== 'all') {
    // If category is a number (ID), join with product_categories table
    if (typeof category === 'number') {
      return database
        .prepare(
          `SELECT p.id, p.name, p.price, p.category, p.code, p.raw_response
           FROM products p
           INNER JOIN product_categories pc ON p.category = pc.id
           WHERE pc.id = ?
           ORDER BY p.name LIMIT ?`
        )
        .all(category, limit) as ProductRecord[]
    } else {
      // If category is a string (name), use the old logic for backward compatibility
      return database
        .prepare(
          'SELECT id, name, price, category, code, raw_response FROM products WHERE category = ? ORDER BY name LIMIT ?'
        )
        .all(category, limit) as ProductRecord[]
    }
  }
  return database
    .prepare(
      'SELECT id, name, price, category, code, raw_response FROM products ORDER BY name LIMIT ?'
    )
    .all(limit) as ProductRecord[]
}

export function upsertProducts(products: ProductRecord[]): void {
  const database = requireDb()
  const stmt = database.prepare(
    `INSERT INTO products (id, name, price, category, code, raw_response)
     VALUES (@id, @name, @price, @category, @code, @raw_response)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       price = excluded.price,
       category = excluded.category,
       code = excluded.code,
       raw_response = excluded.raw_response`
  )
  const insertMany = database.transaction((rows: ProductRecord[]) => {
    for (const row of rows) stmt.run(row)
  })
  insertMany(products)
}

// Sales functions
export function createSale(
  sale: Omit<
    SaleRecord,
    'id' | 'created_at' | 'synced_at' | 'sync_status' | 'sync_attempts' | 'last_sync_error'
  >
): SaleRecord {
  const database = requireDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const currentUserId = requireCurrentUserId()

  const stmt = database.prepare(`
    INSERT INTO sales (
      id, invoice_number, customer_name, customer_phone, subtotal, tax_amount,
      total_amount, payment_method, payment_status, items, created_at,
      sync_status, sync_attempts, ref, date, customer_id, warehouse_id, sale_items,
      grand_total, discount, shipping, tax_rate, note, status, hold_ref_no, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    sale.invoice_number,
    sale.customer_name,
    sale.customer_phone,
    sale.subtotal,
    sale.tax_amount,
    sale.total_amount,
    sale.payment_method,
    sale.payment_status,
    sale.items,
    now,
    'pending', // sync_status
    0, // sync_attempts
    sale.ref || null,
    sale.date || now,
    sale.customer_id || 1,
    sale.warehouse_id || 1,
    sale.sale_items || sale.items, // Use items as fallback for sale_items
    sale.grand_total || sale.total_amount.toString(),
    sale.discount || 0,
    sale.shipping || 0,
    sale.tax_rate || 0,
    sale.note || null,
    sale.status || 1,
    sale.hold_ref_no || null,
    currentUserId
  )

  return {
    id,
    invoice_number: sale.invoice_number,
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
    subtotal: sale.subtotal,
    tax_amount: sale.tax_amount,
    total_amount: sale.total_amount,
    payment_method: sale.payment_method,
    payment_status: sale.payment_status,
    items: sale.items,
    created_at: now,
    synced_at: null,
    sync_status: 'pending',
    sync_attempts: 0,
    last_sync_error: null,
    ref: sale.ref || null,
    date: sale.date || now,
    customer_id: sale.customer_id || 1,
    warehouse_id: sale.warehouse_id || 1,
    sale_items: sale.sale_items || sale.items,
    grand_total: sale.grand_total || sale.total_amount.toString(),
    discount: sale.discount || 0,
    shipping: sale.shipping || 0,
    tax_rate: sale.tax_rate || 0,
    note: sale.note || null,
    status: sale.status || 1,
    hold_ref_no: sale.hold_ref_no || null,
    user_id: currentUserId
  }
}

export function getPendingSales(): SaleRecord[] {
  const database = requireDb()
  const currentUserId = requireCurrentUserId()
  return database
    .prepare('SELECT * FROM sales WHERE sync_status IN (?, ?) AND user_id = ? ORDER BY created_at ASC')
    .all('pending', 'failed', currentUserId) as SaleRecord[]
}

export function getUnsyncedSalesCount(): number {
  const database = requireDb()
  const currentUserId = requireCurrentUserId()
  const result = database
    .prepare('SELECT COUNT(*) as count FROM sales WHERE sync_status IN (?, ?) AND user_id = ?')
    .get('pending', 'failed', currentUserId) as { count: number }
  return result.count
}

export function updateSaleSyncStatus(
  saleId: string,
  status: 'syncing' | 'synced' | 'failed',
  error?: string
): void {
  const database = requireDb()
  const now = new Date().toISOString()

  if (status === 'synced') {
    database
      .prepare('UPDATE sales SET sync_status = ?, synced_at = ? WHERE id = ?')
      .run(status, now, saleId)
  } else if (status === 'failed') {
    database
      .prepare(
        `
        UPDATE sales
        SET sync_status = ?, sync_attempts = sync_attempts + 1, last_sync_error = ?
        WHERE id = ?
      `
      )
      .run(status, error || 'Unknown error', saleId)
  } else {
    database.prepare('UPDATE sales SET sync_status = ? WHERE id = ?').run(status, saleId)
  }
}

export function deleteSyncedSale(saleId: string): void {
  const database = requireDb()
  const currentUserId = requireCurrentUserId()
  database.prepare('DELETE FROM sales WHERE id = ? AND sync_status = ? AND user_id = ?').run(saleId, 'synced', currentUserId)
}

export function getSalesByDateRange(startDate: string, endDate: string): SaleRecord[] {
  const database = requireDb()
  const currentUserId = requireCurrentUserId()
  return database
    .prepare('SELECT * FROM sales WHERE created_at BETWEEN ? AND ? AND user_id = ? ORDER BY created_at DESC')
    .all(startDate, endDate, currentUserId) as SaleRecord[]
}

export async function syncSalesToRemote(): Promise<void> {
  console.log('[DB] Starting sales sync to remote...')

  const userToken = requireCurrentUserToken()
  console.log('[DB] Using token:', userToken.substring(0, 10) + '...')

  const pendingSales = getPendingSales()
  if (pendingSales.length === 0) {
    console.log('[DB] No pending sales to sync')
    return
  }

  console.log(`[DB] Found ${pendingSales.length} pending sales to sync`)

  for (const sale of pendingSales) {
    try {
      // Mark as syncing
      updateSaleSyncStatus(sale.id, 'syncing')

      // Parse cart items to create sale_items in API format
      const cartItems = JSON.parse(sale.items)
      const saleItems = cartItems.map((item: any) => ({
        name: item.name,
        code: item.code ,
        stock_alert: "5", // Default value
        product_id: parseInt(item.id) ,
        product_cost: item.price || 0, // Using price as cost for now
        product_price: item.price,
        net_unit_cost: item.price || 0,
        tax_type: 1, // Default tax type
        tax_amount: 0, // No tax applied in current implementation
        discount_type: 1, // Default discount type
        discount_value: 0, // No discount applied
        discount_amount: 0,
        product_unit: "18", // Default unit
        sale_unit: "28", // Default sale unit
        quantity: item.quantity || 1,
        sub_total: (item.price || 0) * (item.quantity || 1),
        id: parseInt(item.id) || 0,
        sale_id: 1, // Will be assigned by the API
        tax_value: 0,
        hold_item_id: "",
        wholesale_value: 0,
        wholesale_min: 0,
        wholesale_type: "fixed",
        current_price: item.price || 0,
        is_wholesale_applied: false
      }))

      // Prepare sale data for API in the expected format
      const saleData = {
        ref: sale.ref || sale.invoice_number || '',
        date: sale.date || sale.created_at,
        customer_id: sale.customer_id || 1,
        warehouse_id: sale.warehouse_id || 1,
        sale_items: saleItems,
        grand_total: sale.grand_total || sale.total_amount.toString(),
        payment_status: 1, // 1 = Paid (assuming all sales are paid)
        payment_type: 1, // 1 = Cash (default, will be mapped from payment_method)
        discount: sale.discount || 0,
        shipping: sale.shipping || 0,
        tax_rate: sale.tax_rate || 0,
        note: sale.note || '',
        status: sale.status || 1,
        hold_ref_no: sale.hold_ref_no || ''
      }

      // Try different possible endpoints
      const endpoints = ['/sales']
      let syncSuccess = false

      for (const endpoint of endpoints) {
        try {
          const url = getBaseUrl() + endpoint
          console.log(`[DB] Trying to sync sale ${sale.invoice_number} to: ${url}`)

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${userToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(saleData)
          })

          if (response.ok) {
            console.log(`[DB] Successfully synced sale ${sale.invoice_number}`)
            updateSaleSyncStatus(sale.id, 'synced')
            // Delete the synced sale from local DB
            deleteSyncedSale(sale.id)
            syncSuccess = true
            break
          } else {
            const errorText = await response.text().catch(() => 'No error details available')
            console.log(
              `[DB] Endpoint ${endpoint} failed for sale ${sale.invoice_number}:`,
              response.status,
              errorText
            )
          }
        } catch (error: any) {
          console.log(
            `[DB] Error with endpoint ${endpoint} for sale ${sale.invoice_number}:`,
            error.message
          )
        }
      }

      if (!syncSuccess) {
        console.log(`[DB] Failed to sync sale ${sale.invoice_number} with all endpoints`)
        updateSaleSyncStatus(sale.id, 'failed', 'All endpoints failed')
      }

      // Wait a bit between sales to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error: any) {
      console.error(`[DB] Error syncing sale ${sale.invoice_number}:`, error.message)
      updateSaleSyncStatus(sale.id, 'failed', error.message)
    }
  }

  console.log('[DB] Sales sync completed')
}

// Product sync functions
export function getProductSyncProgress(): ProductSyncProgress | null {
  const database = requireDb()
  const result = database
    .prepare('SELECT * FROM product_sync_progress WHERE id = ?')
    .get('default') as ProductSyncProgress | undefined

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

export async function syncProductsFromRemote(): Promise<void> {
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
  } else {
    // Reset sync progress for new sync
    resetProductSyncProgress()
    console.log('[DB] Starting fresh sync')
  }

  // First, test the connection with a simple endpoint
  try {
    console.log('[DB] Testing connection...')
    const testUrl = new URL('/api/user', baseUrl) // or any simple endpoint
    const testResponse = await fetch(testUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userToken}`,
        Accept: 'application/json',
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

  // Try different possible endpoints
  const endpoints = ['/products', '/api/products']

  for (const endpoint of endpoints) {
    try {
      console.log(`[DB] Trying endpoint: ${endpoint}`)

      // If we're resuming and need pagination info, or starting fresh
      if (currentPage === 1 && lastPage === 1) {
        console.log('[DB] Fetching first page to get pagination info...')
        const firstPageUrl = new URL(endpoint, baseUrl)
        firstPageUrl.searchParams.set('page', '1')

        const firstPageResponse = await fetch(firstPageUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
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

        // Update sync progress after first page
        updateProductSyncProgress({
          current_page: 1,
          last_page: lastPage,
          is_completed: false,
          total_products: totalProducts
        })

        // If there's only one page, we're done
        if (lastPage <= 1) {
          updateProductSyncProgress({
            current_page: 1,
            last_page: lastPage,
            is_completed: true,
            total_products: totalProducts
          })
          console.log('[DB] Only one page, sync completed')
          return
        }

        // Move to next page for the main loop
        currentPage = 2
      }

      // Skip pages that have already been processed when resuming
      if (existingProgress && existingProgress.current_page > 1) {
        currentPage = existingProgress.current_page
        console.log(`[DB] Skipping to page ${currentPage} (already processed)`)
      }

      while (currentPage <= lastPage) {
        console.log(`[DB] Fetching products page ${currentPage}...`)

        const url = new URL(endpoint, baseUrl)
        url.searchParams.set('page', currentPage.toString())

        console.log(`[DB] Making request to: ${url.toString()}`)
        console.log(`[DB] Headers:`, {
          Authorization: `Bearer ${userToken.substring(0, 10)}...`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        })

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
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
        console.log(`[DB] Full response structure:`, Object.keys(data))

        // Process and store products
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
          await new Promise((resolve) => setTimeout(resolve, 20000))
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

async function remoteLogin(
  baseUrl: string,
  credentials: { email: string; password: string }
): Promise<any> {
  // Try different possible endpoints
  const endpoints = ['/login', '/api/login']

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
        Accept: 'application/json'
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

// Settings functions
export function upsertSettings(
  settingsData: Omit<SettingsRecord, 'id' | 'created_at' | 'updated_at'>
): SettingsRecord {
  const database = requireDb()
  const now = new Date().toISOString()
  const id = 'settings' // Single settings record

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO settings (
      id, currency, email, company_name, phone, default_language, default_customer,
      default_warehouse, address, logo, show_phone, show_address, show_customer,
      show_email, show_tax_discount_shipping, show_note, show_barcode_in_receipt,
      show_logo_in_receipt, protect_cart_product_delete, protect_cart_product_reduce,
      enable_shipping, enable_tax, enable_discount, warehouse_name, customer_name,
      currency_symbol, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    settingsData.currency,
    settingsData.email,
    settingsData.company_name,
    settingsData.phone,
    settingsData.default_language,
    settingsData.default_customer,
    settingsData.default_warehouse,
    settingsData.address,
    settingsData.logo,
    settingsData.show_phone,
    settingsData.show_address,
    settingsData.show_customer,
    settingsData.show_email,
    settingsData.show_tax_discount_shipping,
    settingsData.show_note,
    settingsData.show_barcode_in_receipt,
    settingsData.show_logo_in_receipt,
    settingsData.protect_cart_product_delete,
    settingsData.protect_cart_product_reduce,
    settingsData.enable_shipping,
    settingsData.enable_tax,
    settingsData.enable_discount,
    settingsData.warehouse_name,
    settingsData.customer_name,
    settingsData.currency_symbol,
    now,
    now
  )

  return getSettings()!
}

export function getSettings(): SettingsRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM settings WHERE id = ?').get('settings') as
    | SettingsRecord
    | undefined
  return result || null
}

// Front Settings functions
export function upsertFrontSettings(
  frontSettingsData: Omit<FrontSettingsRecord, 'id' | 'created_at' | 'updated_at'>
): FrontSettingsRecord {
  const database = requireDb()
  const now = new Date().toISOString()
  const id = 'front_settings' // Single front settings record

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO front_settings (
      id, currency, email, company_name, phone, default_language, default_customer,
      default_warehouse, address, protect_cart_product_delete, protect_cart_product_reduce,
      enable_shipping, enable_tax, enable_discount, logo, warehouse_name, customer_name,
      currency_symbol, roles, connected_accounts, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    frontSettingsData.currency,
    frontSettingsData.email,
    frontSettingsData.company_name,
    frontSettingsData.phone,
    frontSettingsData.default_language,
    frontSettingsData.default_customer,
    frontSettingsData.default_warehouse,
    frontSettingsData.address,
    frontSettingsData.protect_cart_product_delete,
    frontSettingsData.protect_cart_product_reduce,
    frontSettingsData.enable_shipping,
    frontSettingsData.enable_tax,
    frontSettingsData.enable_discount,
    frontSettingsData.logo,
    frontSettingsData.warehouse_name,
    frontSettingsData.customer_name,
    frontSettingsData.currency_symbol,
    frontSettingsData.roles,
    frontSettingsData.connected_accounts,
    now,
    now
  )

  return getFrontSettings()!
}

export function getFrontSettings(): FrontSettingsRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM front_settings WHERE id = ?').get('front_settings') as
    | FrontSettingsRecord
    | undefined
  return result || null
}

// Countries functions
export function upsertCountries(
  countries: Omit<CountryRecord, 'created_at' | 'updated_at'>[]
): void {
  const database = requireDb()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO countries (
      id, name, short_code, phone_code, active, logo_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = database.transaction(
    (countries: Omit<CountryRecord, 'created_at' | 'updated_at'>[]) => {
      for (const country of countries) {
        stmt.run(
          country.id,
          country.name,
          country.short_code,
          country.phone_code,
          country.active,
          country.logo_url,
          now,
          now
        )
      }
    }
  )

  insertMany(countries)
}

export function getCountries(): CountryRecord[] {
  const database = requireDb()
  return database.prepare('SELECT * FROM countries ORDER BY name').all() as CountryRecord[]
}

export function getActiveCountries(): CountryRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM countries WHERE active = 1 ORDER BY name')
    .all() as CountryRecord[]
}

// Config functions
export function upsertConfig(
  configData: Omit<ConfigRecord, 'id' | 'created_at' | 'updated_at'>
): ConfigRecord {
  const database = requireDb()
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
  const database = requireDb()
  const result = database.prepare('SELECT * FROM config WHERE id = ?').get('config') as
    | ConfigRecord
    | undefined
  return result || null
}

export function getUserPermissions(): string[] {
  const config = getConfig()
  if (!config || !config.permissions) return []

  try {
    return JSON.parse(config.permissions)
  } catch (error) {
    console.error('[DB] Failed to parse permissions:', error)
    return []
  }
}

export function hasPermission(permission: string): boolean {
  const permissions = getUserPermissions()
  return permissions.includes(permission)
}

export function isCurrencyRight(): boolean {
  const config = getConfig()
  return config?.is_currency_right === '1'
}

export function isOpenRegister(): boolean {
  const config = getConfig()
  return config?.open_register === true
}

// Warehouse functions
export function upsertWarehouses(
  warehouses: Omit<WarehouseRecord, 'created_at' | 'updated_at'>[]
): void {
  const database = requireDb()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO warehouses (
      id, name, phone, country, city, email, zip_code, state, address, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = database.transaction(
    (warehouses: Omit<WarehouseRecord, 'created_at' | 'updated_at'>[]) => {
      for (const warehouse of warehouses) {
        stmt.run(
          warehouse.id,
          warehouse.name,
          warehouse.phone,
          warehouse.country,
          warehouse.city,
          warehouse.email,
          warehouse.zip_code,
          warehouse.state,
          warehouse.address,
          now,
          now
        )
      }
    }
  )

  insertMany(warehouses)
}

export function getWarehouses(): WarehouseRecord[] {
  const database = requireDb()
  return database.prepare('SELECT * FROM warehouses ORDER BY name').all() as WarehouseRecord[]
}

export function getWarehouseById(id: number): WarehouseRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM warehouses WHERE id = ?').get(id) as
    | WarehouseRecord
    | undefined
  return result || null
}

export function getWarehouseByName(name: string): WarehouseRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM warehouses WHERE name = ?').get(name) as
    | WarehouseRecord
    | undefined
  return result || null
}

export function getDefaultWarehouse(): WarehouseRecord | null {
  const database = requireDb()
  // Try to get the warehouse named 'main-branch' first, then fall back to the first one
  let result = database.prepare('SELECT * FROM warehouses WHERE name = ?').get('main-branch') as
    | WarehouseRecord
    | undefined
  if (!result) {
    result = database.prepare('SELECT * FROM warehouses ORDER BY id LIMIT 1').get() as
      | WarehouseRecord
      | undefined
  }
  return result || null
}

// Product Categories functions
export function upsertProductCategories(
  categories: Omit<ProductCategoryRecord, 'created_at' | 'updated_at'>[]
): void {
  const database = requireDb()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO product_categories (
      id, name, image, products_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertMany = database.transaction(
    (categories: Omit<ProductCategoryRecord, 'created_at' | 'updated_at'>[]) => {
      for (const category of categories) {
        stmt.run(category.id, category.name, category.image, category.products_count, now, now)
      }
    }
  )

  insertMany(categories)
}

export function getProductCategories(): ProductCategoryRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM product_categories ORDER BY name')
    .all() as ProductCategoryRecord[]
}

export function getProductCategoryById(id: number): ProductCategoryRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM product_categories WHERE id = ?').get(id) as
    | ProductCategoryRecord
    | undefined
  return result || null
}

export function getProductCategoryByName(name: string): ProductCategoryRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM product_categories WHERE name = ?').get(name) as
    | ProductCategoryRecord
    | undefined
  return result || null
}

export function getProductCategoriesWithProducts(): ProductCategoryRecord[] {
  const database = requireDb()
  return database
    .prepare(
      'SELECT * FROM product_categories WHERE products_count > 0 ORDER BY products_count DESC, name'
    )
    .all() as ProductCategoryRecord[]
}

export function searchProductCategories(searchTerm: string): ProductCategoryRecord[] {
  const database = requireDb()
  const searchPattern = `%${searchTerm}%`
  return database
    .prepare('SELECT * FROM product_categories WHERE name LIKE ? ORDER BY name')
    .all(searchPattern) as ProductCategoryRecord[]
}

// Payment Methods functions
export function upsertPaymentMethods(
  paymentMethods: Omit<PaymentMethodRecord, 'created_at' | 'updated_at'>[]
): void {
  const database = requireDb()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO payment_methods (
      id, name, display_name, active, business_profile_id, user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = database.transaction(
    (paymentMethods: Omit<PaymentMethodRecord, 'created_at' | 'updated_at'>[]) => {
      for (const method of paymentMethods) {
        stmt.run(
          method.id,
          method.name,
          method.display_name,
          method.active ? 1 : 0,
          method.business_profile_id,
          method.user_id,
          now,
          now
        )
      }
    }
  )

  insertMany(paymentMethods)
}

export function getPaymentMethods(): PaymentMethodRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM payment_methods WHERE active = 1 ORDER BY display_name')
    .all() as PaymentMethodRecord[]
}

export function getAllPaymentMethods(): PaymentMethodRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM payment_methods ORDER BY display_name')
    .all() as PaymentMethodRecord[]
}

export function getPaymentMethodById(id: number): PaymentMethodRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM payment_methods WHERE id = ?').get(id) as
    | PaymentMethodRecord
    | undefined
  return result || null
}

export function getPaymentMethodByName(name: string): PaymentMethodRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM payment_methods WHERE name = ?').get(name) as
    | PaymentMethodRecord
    | undefined
  return result || null
}

export function getActivePaymentMethods(): PaymentMethodRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM payment_methods WHERE active = 1 ORDER BY display_name')
    .all() as PaymentMethodRecord[]
}

export function getPaymentMethodsByBusinessProfile(
  businessProfileId: number
): PaymentMethodRecord[] {
  const database = requireDb()
  return database
    .prepare(
      'SELECT * FROM payment_methods WHERE business_profile_id = ? AND active = 1 ORDER BY display_name'
    )
    .all(businessProfileId) as PaymentMethodRecord[]
}

// Units functions
export function upsertUnits(units: Omit<UnitRecord, 'created_at' | 'updated_at'>[]): void {
  const database = requireDb()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO units (
      id, name, short_name, base_unit, is_default, business_profile_id, user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = database.transaction(
    (units: Omit<UnitRecord, 'created_at' | 'updated_at'>[]) => {
      for (const unit of units) {
        stmt.run(
          unit.id,
          unit.name,
          unit.short_name,
          unit.base_unit,
          unit.is_default ? 1 : 0,
          unit.business_profile_id,
          unit.user_id,
          now,
          now
        )
      }
    }
  )

  insertMany(units)
}

export function getUnits(): UnitRecord[] {
  const database = requireDb()
  return database.prepare('SELECT * FROM units ORDER BY name').all() as UnitRecord[]
}

export function getUnitById(id: number): UnitRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM units WHERE id = ?').get(id) as
    | UnitRecord
    | undefined
  return result || null
}

export function getUnitByName(name: string): UnitRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM units WHERE name = ?').get(name) as
    | UnitRecord
    | undefined
  return result || null
}

export function getUnitByShortName(shortName: string): UnitRecord | null {
  const database = requireDb()
  const result = database.prepare('SELECT * FROM units WHERE short_name = ?').get(shortName) as
    | UnitRecord
    | undefined
  return result || null
}

export function getDefaultUnits(): UnitRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM units WHERE is_default = 1 ORDER BY name')
    .all() as UnitRecord[]
}

export function getUnitsByBusinessProfile(businessProfileId: number): UnitRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM units WHERE business_profile_id = ? ORDER BY name')
    .all(businessProfileId) as UnitRecord[]
}

export function getBaseUnits(): UnitRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM units WHERE base_unit = id ORDER BY name')
    .all() as UnitRecord[]
}

export function getUnitsByBaseUnit(baseUnitId: number): UnitRecord[] {
  const database = requireDb()
  return database
    .prepare('SELECT * FROM units WHERE base_unit = ? ORDER BY name')
    .all(baseUnitId) as UnitRecord[]
}

// Settings, config, warehouses, product categories, payment methods, and units sync function
export async function fetchAndSaveSettings(): Promise<void> {
  console.log('[DB] Fetching settings from remote API...')

  const userToken = requireCurrentUserToken()
  const baseUrl = getBaseUrl()
  console.log('[DB] Using base URL:', baseUrl)

  try {
    // Fetch settings from remote API
    const settingsResponse = await fetch(`${baseUrl}/settings`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
        Accept: 'application/json'
      }
    })

    if (!settingsResponse.ok) {
      throw new Error(`Settings API failed: HTTP error! status: ${settingsResponse.status}`)
    }

    const settingsData = await settingsResponse.json()
    console.log('[DB] Settings API response:', settingsData)

    // Fetch front-settings from remote API
    const frontSettingsResponse = await fetch(`${baseUrl}/front-setting`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
        Accept: 'application/json'
      }
    })

    if (!frontSettingsResponse.ok) {
      console.warn(`Front-settings API failed: HTTP error! status: ${frontSettingsResponse.status}`)
      // Don't throw error for front-settings failure, just log warning
    }

    let frontSettingsData: any = null
    if (frontSettingsResponse.ok) {
      const frontSettingsResponseData = await frontSettingsResponse.json()
      // console.log('[DB] Front-settings API response:', frontSettingsResponseData)
      if (frontSettingsResponseData.success && frontSettingsResponseData.data) {
        frontSettingsData = frontSettingsResponseData.data.value
        console.log('[DB] [DB] Front-settings data:', frontSettingsData)
      }
    }

    if (settingsData.success && settingsData.data) {
      const settings: Omit<SettingsRecord, 'id' | 'created_at' | 'updated_at'> = {
        currency: settingsData.data.attributes.currency || 'NGN',
        email: settingsData.data.attributes.email || '',
        company_name: settingsData.data.attributes.company_name || '',
        phone: settingsData.data.attributes.phone || '',
        default_language: settingsData.data.attributes.default_language || 'en',
        default_customer: settingsData.data.attributes.default_customer || '',
        default_warehouse: settingsData.data.attributes.default_warehouse || '',
        address: settingsData.data.attributes.address || '',
        logo: settingsData.data.attributes.logo || null,
        show_phone: settingsData.data.attributes.show_phone || '1',
        show_address: settingsData.data.attributes.show_address || '1',
        show_customer: settingsData.data.attributes.show_customer || '1',
        show_email: settingsData.data.attributes.show_email || '1',
        show_tax_discount_shipping: settingsData.data.attributes.show_tax_discount_shipping || '1',
        show_note: settingsData.data.attributes.show_note || null,
        show_barcode_in_receipt: settingsData.data.attributes.show_barcode_in_receipt || '1',
        show_logo_in_receipt: settingsData.data.attributes.show_logo_in_receipt || '1',
        protect_cart_product_delete: settingsData.data.attributes.protect_cart_product_delete || '0',
        protect_cart_product_reduce: settingsData.data.attributes.protect_cart_product_reduce || '0',
        enable_shipping: settingsData.data.attributes.enable_shipping || '0',
        enable_tax: settingsData.data.attributes.enable_tax || '0',
        enable_discount: settingsData.data.attributes.enable_discount || '0',
        warehouse_name: settingsData.data.attributes.warehouse_name || '',
        customer_name: settingsData.data.attributes.customer_name || '',
        currency_symbol: settingsData.data.attributes.currency_symbol || '₦'
      }

      upsertSettings(settings)
      console.log('[DB] Settings saved successfully')

      // Save front-settings data to separate table if available
      if (frontSettingsData) {
        const frontSettings: Omit<FrontSettingsRecord, 'id' | 'created_at' | 'updated_at'> = {
          currency: frontSettingsData.currency || 'NGN',
          email: frontSettingsData.email || '',
          company_name: frontSettingsData.company_name || '',
          phone: frontSettingsData.phone || '',
          default_language: frontSettingsData.default_language || 'en',
          default_customer: frontSettingsData.default_customer || '',
          default_warehouse: frontSettingsData.default_warehouse || '',
          address: frontSettingsData.address || '',
          protect_cart_product_delete: frontSettingsData.protect_cart_product_delete || '0',
          protect_cart_product_reduce: frontSettingsData.protect_cart_product_reduce || '0',
          enable_shipping: frontSettingsData.enable_shipping || '0',
          enable_tax: frontSettingsData.enable_tax || '0',
          enable_discount: frontSettingsData.enable_discount || '0',
          logo: frontSettingsData.logo || null,
          warehouse_name: frontSettingsData.warehouse_name || '',
          customer_name: frontSettingsData.customer_name || '',
          currency_symbol: frontSettingsData.currency_symbol || '₦',
          roles: JSON.stringify(frontSettingsData.roles || []),
          connected_accounts: JSON.stringify(frontSettingsData.connected_account || [])
        }

        upsertFrontSettings(frontSettings)
        console.log('[DB] Front-settings saved successfully')
      }
    } else {
      throw new Error('Invalid response format from settings API')
    }
  } catch (error: any) {
    console.error('[DB] Failed to fetch front-settings:', error.message)
    throw error
  }
}

// Add product sync IPC handlers
function registerProductSyncIpcHandlers(): void {
  ipcMain.handle('products:sync:start', async () => {
    try {
      await syncProductsFromRemote()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Product sync failed:', error.message)
      return { success: false, error: error.message }
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

  ipcMain.handle('db:products:list', (_event, category?: string, limit?: number) => {
    return listProducts(category, limit)
  })

  ipcMain.handle('db:products:searchByCode', (_event, code: string) => {
    return searchProductByCode(code)
  })

  ipcMain.handle('db:products:search', (_event, query: string, limit?: number) => {
    return searchProducts(query, limit)
  })

  ipcMain.handle('db:products:upsertMany', (_event, products: ProductRecord[]) => {
    upsertProducts(products)
    return { success: true }
  })

  // Sales IPC handlers
  ipcMain.handle('db:sales:create', (_event, sale: any) => {
    return createSale(sale)
  })

  ipcMain.handle('db:sales:getPending', () => {
    return getPendingSales()
  })

  ipcMain.handle('db:sales:getUnsyncedCount', () => {
    return getUnsyncedSalesCount()
  })

  ipcMain.handle(
    'db:sales:updateSyncStatus',
    (_event, saleId: string, status: string, error?: string) => {
      updateSaleSyncStatus(saleId, status as any, error)
      return { success: true }
    }
  )

  ipcMain.handle('db:sales:deleteSynced', (_event, saleId: string) => {
    deleteSyncedSale(saleId)
    return { success: true }
  })

  ipcMain.handle('db:sales:getByDateRange', (_event, startDate: string, endDate: string) => {
    return getSalesByDateRange(startDate, endDate)
  })

  ipcMain.handle('db:sales:sync', async () => {
    try {
      await syncSalesToRemote()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Sales sync failed:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:path', () => {
    return getDatabaseFilePath()
  })

  ipcMain.handle('db:resetMigrations', () => {
    try {
      resetMigrations()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to reset migrations:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:login', async (_event, credentials: { email: string; password: string }) => {
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
      return { user: toUserPayload(stored), source: 'remote' as const }
    } catch (error: any) {
      console.log('[DB] Remote login failed:', error.message)
      // throw new Error(error.message || 'Login failed')
    }
  })

  // Dev helper: seed a user directly from a provided API response payload
  ipcMain.handle(
    'auth:seedFromResponse',
    (_event, payload: { response: any; password: string }) => {
      console.log('[DB] Seeding user from response...')
      const stored = upsertUserFromRemote(payload.response, payload.password)
      return { user: toUserPayload(stored) }
    }
  )

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

  // Settings IPC handlers
  ipcMain.handle('db:settings:get', () => {
    return getSettings()
  })

  ipcMain.handle('db:settings:fetch', async () => {
    return fetchAndSaveSettings()
  })

  // Front Settings IPC handlers
  ipcMain.handle('db:frontSettings:get', () => {
    return getFrontSettings()
  })

  ipcMain.handle('db:countries:get', () => {
    return getCountries()
  })

  ipcMain.handle('db:countries:getActive', () => {
    return getActiveCountries()
  })

  // Config IPC handlers
  ipcMain.handle('db:config:get', () => {
    return getConfig()
  })

  ipcMain.handle('db:config:getPermissions', () => {
    return getUserPermissions()
  })

  ipcMain.handle('db:config:hasPermission', (_event, permission: string) => {
    return hasPermission(permission)
  })

  ipcMain.handle('db:config:isCurrencyRight', () => {
    return isCurrencyRight()
  })

  ipcMain.handle('db:config:isOpenRegister', () => {
    return isOpenRegister()
  })

  // Warehouse IPC handlers
  ipcMain.handle('db:warehouses:get', () => {
    return getWarehouses()
  })

  ipcMain.handle('db:warehouses:getById', (_event, id: number) => {
    return getWarehouseById(id)
  })

  ipcMain.handle('db:warehouses:getByName', (_event, name: string) => {
    return getWarehouseByName(name)
  })

  ipcMain.handle('db:warehouses:getDefault', () => {
    return getDefaultWarehouse()
  })

  // Product Categories IPC handlers
  ipcMain.handle('db:productCategories:get', () => {
    return getProductCategories()
  })

  ipcMain.handle('db:productCategories:getById', (_event, id: number) => {
    return getProductCategoryById(id)
  })

  ipcMain.handle('db:productCategories:getByName', (_event, name: string) => {
    return getProductCategoryByName(name)
  })

  ipcMain.handle('db:productCategories:getWithProducts', () => {
    return getProductCategoriesWithProducts()
  })

  ipcMain.handle('db:productCategories:search', (_event, searchTerm: string) => {
    return searchProductCategories(searchTerm)
  })

  // Payment Methods IPC handlers
  ipcMain.handle('db:paymentMethods:get', () => {
    return getPaymentMethods()
  })

  ipcMain.handle('db:paymentMethods:getAll', () => {
    return getAllPaymentMethods()
  })

  ipcMain.handle('db:paymentMethods:getById', (_event, id: number) => {
    return getPaymentMethodById(id)
  })

  ipcMain.handle('db:paymentMethods:getByName', (_event, name: string) => {
    return getPaymentMethodByName(name)
  })

  ipcMain.handle('db:paymentMethods:getActive', () => {
    return getActivePaymentMethods()
  })

  ipcMain.handle('db:paymentMethods:getByBusinessProfile', (_event, businessProfileId: number) => {
    return getPaymentMethodsByBusinessProfile(businessProfileId)
  })

  // Units IPC handlers
  ipcMain.handle('db:units:get', () => {
    return getUnits()
  })

  ipcMain.handle('db:units:getById', (_event, id: number) => {
    return getUnitById(id)
  })

  ipcMain.handle('db:units:getByName', (_event, name: string) => {
    return getUnitByName(name)
  })

  ipcMain.handle('db:units:getByShortName', (_event, shortName: string) => {
    return getUnitByShortName(shortName)
  })

  ipcMain.handle('db:units:getDefault', () => {
    return getDefaultUnits()
  })

  ipcMain.handle('db:units:getByBusinessProfile', (_event, businessProfileId: number) => {
    return getUnitsByBusinessProfile(businessProfileId)
  })

  ipcMain.handle('db:units:getBaseUnits', () => {
    return getBaseUnits()
  })

  ipcMain.handle('db:units:getByBaseUnit', (_event, baseUnitId: number) => {
    return getUnitsByBaseUnit(baseUnitId)
  })

  // Register product sync handlers
  registerProductSyncIpcHandlers()
}

// Helper function to get current user token
function getCurrentUserToken(): string | null {
  const database = requireDb()
  // Get the first user with a token (assuming single user system)
  const result = database.prepare('SELECT token FROM users WHERE token IS NOT NULL AND LENGTH(token) > 0 LIMIT 1').get() as { token: string } | undefined
  console.log('[DB] Token lookup result:', { hasResult: !!result, tokenLength: result?.token?.length || 0 })
  return result?.token || null
}

// Helper function to get current user ID
function getCurrentUserId(): string | null {
  const database = requireDb()
  const result = database
    .prepare('SELECT id FROM users WHERE token IS NOT NULL AND LENGTH(token) > 0 LIMIT 1')
    .get() as { id: string } | undefined
  return result?.id || null
}

// Helper function to require current user ID
function requireCurrentUserId(): string {
  const userId = getCurrentUserId()
  if (!userId) {
    throw new Error('No user ID available. Please log in again.')
  }
  return userId
}

// Helper function to require current user token
function requireCurrentUserToken(): string {
  const token = getCurrentUserToken()
  if (!token) {
    throw new Error('No user token available. Please log in again.')
  }
  return token
}
