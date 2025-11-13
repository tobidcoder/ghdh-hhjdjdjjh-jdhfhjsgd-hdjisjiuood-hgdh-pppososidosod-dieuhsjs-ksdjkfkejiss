import { app } from 'electron'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

let db: Database.Database | null = null

// Centralized base URL function with validation
export function getBaseUrl(): string {
  // const baseUrl = process.env.BASE_URL || 'https://app.usecheetah.com/api'
  const baseUrl = process.env.BASE_URL || 'http://localhost:8000/api'
  if (!baseUrl) {
    throw new Error('BASE_URL environment variable is not set')
  }
  console.log('[DB] Using base URL:', baseUrl)
  return baseUrl // Remove trailing slash if present
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

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  console.log('[DB] Database instance retrieved, file:', db.name)
  return db
}

export function setDatabase(database: Database.Database): void {
  db = database
}

export function isDatabaseInitialized(): boolean {
  return db !== null
}
