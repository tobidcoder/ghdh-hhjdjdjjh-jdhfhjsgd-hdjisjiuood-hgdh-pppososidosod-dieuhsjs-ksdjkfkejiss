import { getDatabase } from '../database/connection'
import { randomUUID } from 'crypto'

export interface HoldRecord {
  id: string
  name: string
  items: any[]
  total_amount: number
  created_at: string
  updated_at: string
}

// Hold functions
export function saveHold(holdData: { name: string; items: any[]; totalAmount: number }): { success: boolean; id: string } {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }

  const id = randomUUID()
  const now = new Date().toISOString()
  
  const stmt = database.prepare(`
    INSERT INTO holds (id, name, items, total_amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  
  stmt.run(id, holdData.name, JSON.stringify(holdData.items), holdData.totalAmount, now, now)
  
  return { success: true, id }
}

export function getHolds(): HoldRecord[] {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }
  
  const stmt = database.prepare('SELECT * FROM holds ORDER BY created_at DESC')
  const holds = stmt.all() as any[]
  
  return holds.map(hold => ({
    ...hold,
    items: JSON.parse(hold.items)
  }))
}

export function getHoldById(id: string): HoldRecord | null {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }
  
  const stmt = database.prepare('SELECT * FROM holds WHERE id = ?')
  const hold = stmt.get(id) as any
  
  if (hold) {
    return {
      ...hold,
      items: JSON.parse(hold.items)
    }
  }
  
  return null
}

export function deleteHold(id: string): { success: boolean } {
  const database = getDatabase()
  if (!database) {
    throw new Error('Database not initialized')
  }
  
  const stmt = database.prepare('DELETE FROM holds WHERE id = ?')
  const result = stmt.run(id)
  
  return { success: result.changes > 0 }
}