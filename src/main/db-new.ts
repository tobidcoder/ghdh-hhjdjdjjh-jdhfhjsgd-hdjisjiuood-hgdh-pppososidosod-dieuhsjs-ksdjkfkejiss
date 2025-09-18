import Database from 'better-sqlite3'

// Import our separated modules
import { getDatabaseFilePath, closeDatabase, setDatabase } from './database/connection'
import { runMigrations } from './database/migrations'
import { registerDatabaseIpcHandlers, registerProductSyncIpcHandlers } from './handlers/ipcHandlers'

export function initDatabase(): void {
  try {
    const filePath = getDatabaseFilePath()
    const db = new Database(filePath)
    console.log('[DB] Using file:', filePath)

    // Store the database instance in our connection module
    setDatabase(db)

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
        console.log('[DB] No products found, skipping seeding')
      }
    } catch (seedError: any) {
      console.warn('[DB] Failed to seed products:', seedError.message)
      // Continue with initialization even if seeding fails
    }

    // Register all IPC handlers
    registerDatabaseIpcHandlers()
    registerProductSyncIpcHandlers()

  } catch (error: any) {
    console.error('[DB] Failed to initialize database:', error.message)
    if (error.message.includes('database is locked')) {
      console.error('[DB] Database is locked. Please close any other instances of the app.')
    }
    throw error
  }
}

// Export the close function for app shutdown
export { closeDatabase }

// Export the getDatabase function for other modules
export { getDatabase } from './database/connection'

// Export the resetMigrations function for manual use
export { resetMigrations } from './database/migrations'
