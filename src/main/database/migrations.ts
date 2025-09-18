import Database from 'better-sqlite3'
import { getDatabase } from './connection'

function migrationExists(db: Database.Database, name: string): boolean {
  const result = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(name)
  return !!result
}

function markMigrationComplete(db: Database.Database, name: string): void {
  const now = new Date().toISOString()
  db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(name, now)
}

function tableExists(db: Database.Database, tableName: string): boolean {
  try {
    const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName)
    return !!result
  } catch (error) {
    return false
  }
}

export function resetMigrations(): void {
  try {
    const db = getDatabase()
    db.exec('DELETE FROM migrations')
    console.log('[DB] Migrations reset successfully')
  } catch (error: any) {
    console.error('[DB] Failed to reset migrations:', error.message)
  }
}

export function runMigrations(): void {
  const db = getDatabase()
  console.log('[DB] Running migrations...')

  try {
    // Create migrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at TEXT NOT NULL
      );
    `)

    // Check if critical tables are missing and reset migrations if needed
    const criticalTables = ['products', 'users', 'settings', 'sales']
    const missingTables = criticalTables.filter(table => !tableExists(db, table))

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
  if (!migrationExists(db, '001_create_products_table')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          category TEXT NOT NULL
        );
      `)
      markMigrationComplete(db, '001_create_products_table')
      console.log('[DB] Migration 001: Created products table')
    } catch (error: any) {
      console.error('[DB] Migration 001 failed:', error.message)
      throw error
    }
  }

  // Migration 2: Create users table
  if (!migrationExists(db, '002_create_users_table')) {
    try {
      db.exec(`
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
      markMigrationComplete(db, '002_create_users_table')
      console.log('[DB] Migration 002: Created users table')
    } catch (error: any) {
      console.error('[DB] Migration 002 failed:', error.message)
      throw error
    }
  }

  // Migration 3: Add raw_response column to users table
  if (!migrationExists(db, '003_add_raw_response_to_users')) {
    try {
      // Check if column exists
      const columns = db.prepare('PRAGMA table_info(users)').all() as any[]
      const hasRawResponse = columns.some((col) => col.name === 'raw_response')

      if (!hasRawResponse) {
        // Create new table with the column
        db.exec(`
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
        db.exec(`
          INSERT INTO users_new (id, username, email, name, token, password_salt, password_hash, created_at, updated_at)
          SELECT id, username, email, name, token, password_salt, password_hash, created_at, updated_at
          FROM users;
        `)

        // Drop old table and rename new table
        db.exec('DROP TABLE users;')
        db.exec('ALTER TABLE users_new RENAME TO users;')

        console.log('[DB] Migration 003: Added raw_response column to users table')
      }
    } catch (error: any) {
      console.log('[DB] Migration 003 error:', error.message)
    }
    markMigrationComplete(db, '003_add_raw_response_to_users')
  }

  // Migration 4: Add raw_response column to products table and create product_sync_progress table
  if (!migrationExists(db, '004_add_raw_response_to_products_and_sync_progress')) {
    try {
      // Check if raw_response column exists in products table
      const productColumns = db.prepare('PRAGMA table_info(products)').all() as any[]
      const hasRawResponse = productColumns.some((col) => col.name === 'raw_response')

      if (!hasRawResponse) {
        // Create new products table with raw_response column
        db.exec(`
          CREATE TABLE products_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            raw_response TEXT
          );
        `)

        // Copy data from old table to new table
        db.exec(`
          INSERT INTO products_new (id, name, price, category)
          SELECT id, name, price, category
          FROM products;
        `)

        // Drop old table and rename new table
        db.exec('DROP TABLE products;')
        db.exec('ALTER TABLE products_new RENAME TO products;')

        console.log('[DB] Migration 004: Added raw_response column to products table')
      }

      // Create product_sync_progress table
      db.exec(`
        CREATE TABLE IF NOT EXISTS product_sync_progress (
          id TEXT PRIMARY KEY,
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
    markMigrationComplete(db, '004_add_raw_response_to_products_and_sync_progress')
  }

  // Migration 5: Add code column to products table
  if (!migrationExists(db, '005_add_code_to_products')) {
    try {
      // Check if code column exists
      const columns = db.prepare('PRAGMA table_info(products)').all() as any[]
      const hasCode = columns.some((col) => col.name === 'code')

      if (!hasCode) {
        // Create new table with the column
        db.exec(`
          CREATE TABLE products_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            code TEXT,
            raw_response TEXT
          );
        `)

        // Copy data from old table to new table
        db.exec(`
          INSERT INTO products_new (id, name, price, category, raw_response)
          SELECT id, name, price, category, raw_response
          FROM products;
        `)

        // Drop old table and rename new table
        db.exec('DROP TABLE products;')
        db.exec('ALTER TABLE products_new RENAME TO products;')

        console.log('[DB] Migration 005: Added code column to products table')
      }
    } catch (error: any) {
      console.error('[DB] Migration 005 failed:', error.message)
      throw error
    }
    markMigrationComplete(db, '005_add_code_to_products')
  }

  // Migration 6: Create sales table
  if (!migrationExists(db, '006_create_sales_table')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          invoice_number TEXT NOT NULL,
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
          last_sync_error TEXT,
          ref TEXT,
          date TEXT,
          customer_id INTEGER,
          warehouse_id INTEGER,
          sale_items TEXT,
          grand_total TEXT,
          discount REAL DEFAULT 0,
          shipping REAL DEFAULT 0,
          tax_rate REAL DEFAULT 0,
          note TEXT,
          status INTEGER DEFAULT 1,
          hold_ref_no TEXT
        );
      `)
      markMigrationComplete(db, '006_create_sales_table')
      console.log('[DB] Migration 006: Created sales table')
    } catch (error: any) {
      console.error('[DB] Migration 006 failed:', error.message)
      throw error
    }
  }

  // Migration 7: Create settings table
  if (!migrationExists(db, '007_create_settings_table')) {
    try {
      db.exec(`
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
      markMigrationComplete(db, '007_create_settings_table')
      console.log('[DB] Created settings table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create settings table:', error)
      throw error
    }
  }

  // Migration 8: Create countries table
  if (!migrationExists(db, '008_create_countries_table')) {
    try {
      db.exec(`
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
      markMigrationComplete(db, '008_create_countries_table')
      console.log('[DB] Migration 008: Created countries table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create countries table:', error)
      throw error
    }
  }

  // Migration 9: Create config table
  if (!migrationExists(db, '009_create_config_table')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS config (
          id TEXT PRIMARY KEY,
          permissions TEXT NOT NULL,
          is_currency_right TEXT NOT NULL,
          open_register INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete(db, '009_create_config_table')
      console.log('[DB] Migration 009: Created config table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create config table:', error)
      throw error
    }
  }

  // Migration 10: Create warehouses table
  if (!migrationExists(db, '010_create_warehouses_table')) {
    try {
      db.exec(`
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
      markMigrationComplete(db, '010_create_warehouses_table')
      console.log('[DB] Migration 010: Created warehouses table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create warehouses table:', error)
      throw error
    }
  }

  // Migration 11: Create product_categories table
  if (!migrationExists(db, '011_create_product_categories_table')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS product_categories (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          image TEXT,
          products_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete(db, '011_create_product_categories_table')
      console.log('[DB] Migration 011: Created product_categories table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create product_categories table:', error)
      throw error
    }
  }

  // Migration 12: Create payment_methods table
  if (!migrationExists(db, '012_create_payment_methods_table')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS payment_methods (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          business_profile_id INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete(db, '012_create_payment_methods_table')
      console.log('[DB] Migration 012: Created payment_methods table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create payment_methods table:', error)
      throw error
    }
  }

  // Migration 13: Create units table
  if (!migrationExists(db, '013_create_units_table')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS units (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          short_name TEXT NOT NULL,
          base_unit_id INTEGER,
          operator TEXT,
          operation_value REAL,
          business_profile_id INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      markMigrationComplete(db, '013_create_units_table')
      console.log('[DB] Migration 013: Created units table')
    } catch (error: unknown) {
      console.error('[DB] Failed to create units table:', error)
      throw error
    }
  }

  // Migration 14: Update sales table for API compatibility (columns now included in initial creation)
  if (!migrationExists(db, '014_update_sales_table_api_fields')) {
    try {
      // This migration is now a no-op since all columns are created in the initial table creation
      // Keeping it for backward compatibility with existing databases
      markMigrationComplete(db, '014_update_sales_table_api_fields')
      console.log('[DB] Migration 014: Sales table API compatibility (no-op - columns already exist)')
    } catch (error: any) {
      console.error('[DB] Migration 014 failed:', error.message)
      throw error
    }
  }

  // Migration 15: Fix existing columns with empty string defaults
  if (!migrationExists(db, '015_fix_empty_string_defaults')) {
    try {
      db.exec(`
        UPDATE sales SET ref = NULL WHERE ref = '';
        UPDATE sales SET note = NULL WHERE note = '';
        UPDATE sales SET hold_ref_no = NULL WHERE hold_ref_no = '';
      `)
      markMigrationComplete(db, '015_fix_empty_string_defaults')
      console.log('[DB] Migration 015: Fixed empty string defaults in sales table')
    } catch (error: any) {
      console.error('[DB] Migration 015 failed:', error.message)
      // Don't throw error for this migration as it's just a cleanup
    }
  }

  // Migration 16: Create front_settings table for front-settings data
  if (!migrationExists(db, '016_create_front_settings_table')) {
    try {
      db.exec(`
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
    markMigrationComplete(db, '016_create_front_settings_table')
  }

  // Migration 17: Create holds table for cart hold functionality
  if (!migrationExists(db, '017_create_holds_table')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS holds (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          items TEXT NOT NULL,
          total_amount REAL NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      console.log('[DB] Migration 017: Created holds table')
    } catch (error: any) {
      console.error('[DB] Migration 017 failed:', error.message)
      throw error
    }
    markMigrationComplete(db, '017_create_holds_table')
  }

  console.log('[DB] All migrations completed')
}
