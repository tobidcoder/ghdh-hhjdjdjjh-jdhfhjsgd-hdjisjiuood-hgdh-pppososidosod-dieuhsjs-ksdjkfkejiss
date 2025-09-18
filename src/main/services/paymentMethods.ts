import { getDatabase } from '../database/connection'
import { PaymentMethodRecord } from '../database/types'
import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken } from './auth'

export function upsertPaymentMethods(paymentMethods: PaymentMethodRecord[]): void {
  const database = getDatabase()
  const stmt = database.prepare(
    `INSERT INTO payment_methods (id, name, display_name, is_active, business_profile_id, created_at, updated_at)
     VALUES (@id, @name, @display_name, @is_active, @business_profile_id, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
        display_name = excluded.display_name,
       is_active = excluded.is_active,
       business_profile_id = excluded.business_profile_id,
       updated_at = excluded.updated_at`
  )
  const insertMany = database.transaction((rows: PaymentMethodRecord[]) => {
    for (const row of rows) stmt.run(row)
  })
  insertMany(paymentMethods)
}

export function getPaymentMethods(): PaymentMethodRecord[] {
  const database = getDatabase()
  return database
    .prepare('SELECT * FROM payment_methods ORDER BY name')
    .all() as PaymentMethodRecord[]
}

export function getActivePaymentMethods(): PaymentMethodRecord[] {
  const database = getDatabase()
  return database
    .prepare('SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY name')
    .all() as PaymentMethodRecord[]
}

export function getPaymentMethodById(id: number): PaymentMethodRecord | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM payment_methods WHERE id = ?').get(id) as
    | PaymentMethodRecord
    | undefined
  return result || null
}

export async function fetchAndSavePaymentMethods(): Promise<void> {
  console.log('[DB] Fetching payment methods from remote API...')

  const userToken = requireCurrentUserToken()
  const baseUrl = getBaseUrl()

  if (!baseUrl) {
    throw new Error('Base URL is not configured')
  }

  let retries = 3
  let lastError = ''

  while (retries > 0) {
    try {
      const response = await fetch(`${baseUrl}/get-business-payment-methods`, {
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

      // console.log('[DB] Payment Methods API response:', data)

      if ( data?.data && Array.isArray(data?.data)) {
        const paymentMethods = data?.data?.map((method: any) => ({
          id: method?.id,
          name: method?.name,
          display_name: method?.display_name,
          is_active: method?.active?1:0 ,
          business_profile_id:
             method?.business_profile_id ,
          created_at:
            method?.created_at ,
          updated_at: method?.updated_at
        }))

        upsertPaymentMethods(paymentMethods)
        console.log(`[DB] ${paymentMethods.length} payment methods saved successfully`)
        break // Success, exit retry loop
      } else {
        throw new Error('Invalid response format from payment methods API')
      }
    } catch (error: any) {
      lastError = error.message
      console.error('[DB] Failed to fetch payment methods:', lastError)
      retries--

      if (retries > 0) {
        // Wait before retrying, with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, (4 - retries) * 1000))
        console.log(`[DB] Retrying payment methods fetch, ${retries} attempts remaining`)
        continue
      }
      throw new Error(`Failed to fetch payment methods after all retries: ${lastError}`)
    }
  }
}
