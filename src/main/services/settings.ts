import { getDatabase } from '../database/connection'
import { SettingsRecord, FrontSettingsRecord } from '../database/types'
// import { getBaseUrl } from '../database/connection'
// import { requireCurrentUserToken } from './auth'
import { apiClient } from './apiClient'

// Settings functions
export function upsertSettings(
  settingsData: Omit<SettingsRecord, 'id' | 'created_at' | 'updated_at'>
): SettingsRecord {
  const database = getDatabase()
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

// export function getSettings(): SettingsRecord {
//   const database = getDatabase()
//   const result = database
//     .prepare('SELECT * FROM payment_methods ORDER BY email')
//     .all() as SettingsRecord[]
//   return result[0]
// }

export function getSettings(): SettingsRecord | null {
  const database = getDatabase()
  const result = database.prepare('SELECT * FROM settings WHERE id = ?').get('settings') as
    | SettingsRecord
    | undefined
  return result || null
}

// Front Settings functions
export function upsertFrontSettings(
  frontSettingsData: Omit<FrontSettingsRecord, 'id' | 'created_at' | 'updated_at'>
): FrontSettingsRecord {
  const database = getDatabase()
  const now = new Date().toISOString()
  const id = 'front_settings' // Single front settings record

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO front_settings (
      id, currency, email, company_name, phone, default_language, default_customer,
      default_warehouse, address, protect_cart_product_delete, protect_cart_product_reduce,
      enable_shipping, enable_tax, enable_discount, logo, warehouse_name, customer_name,
      currency_symbol, roles, connected_accounts, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  const database = getDatabase()
  const result = database
    .prepare('SELECT * FROM front_settings WHERE id = ?')
    .get('front_settings') as FrontSettingsRecord | undefined
  return result || null
}

export async function fetchAndSaveSettings(): Promise<void> {
  console.log('[DB] Fetching settings from remote API...')

  try {
    // Fetch settings from remote API using flexible client
    const response = await apiClient.get('/settings')
    console.log('[DB] Settings API response:', response)

    // Extract data using flexible property mapping
    const settingsData = apiClient.extractProperties(response, {
      currency: { path: 'data.attributes.currency', fallback: 'NGN' },
      email: { path: 'data.attributes.email', fallback: '' },
      company_name: { path: 'data.attributes.company_name', fallback: '' },
      phone: { path: 'data.attributes.phone', fallback: '' },
      default_language: { path: 'data.attributes.default_language', fallback: 'en' },
      default_customer: { path: 'data.attributes.default_customer', fallback: '' },
      default_warehouse: { path: 'data.attributes.default_warehouse', fallback: '' },
      address: { path: 'data.attributes.address', fallback: '' },
      logo: { path: 'data.attributes.logo', fallback: null },
      show_phone: { path: 'data.attributes.show_phone', fallback: '1' },
      show_address: { path: 'data.attributes.show_address', fallback: '1' },
      show_customer: { path: 'data.attributes.show_customer', fallback: '1' },
      show_email: { path: 'data.attributes.show_email', fallback: '1' },
      show_tax_discount_shipping: {
        path: 'data.attributes.show_tax_discount_shipping',
        fallback: '1'
      },
      show_note: { path: 'data.attributes.show_note', fallback: null },
      show_barcode_in_receipt: { path: 'data.attributes.show_barcode_in_receipt', fallback: '1' },
      show_logo_in_receipt: { path: 'data.attributes.show_logo_in_receipt', fallback: '1' },
      protect_cart_product_delete: {
        path: 'data.attributes.protect_cart_product_delete',
        fallback: '0'
      },
      protect_cart_product_reduce: {
        path: 'data.attributes.protect_cart_product_reduce',
        fallback: '0'
      },
      enable_shipping: { path: 'data.attributes.enable_shipping', fallback: '0' },
      enable_tax: { path: 'data.attributes.enable_tax', fallback: '0' },
      enable_discount: { path: 'data.attributes.enable_discount', fallback: '0' },
      warehouse_name: { path: 'data.attributes.warehouse_name', fallback: '' },
      customer_name: { path: 'data.attributes.customer_name', fallback: '' },
      currency_symbol: { path: 'data.attributes.currency_symbol', fallback: '₦' }
    })

    // If we couldn't extract data using the expected structure, try alternative paths
    if (!settingsData.currency || settingsData.currency === 'NGN') {
      console.log('[DB] Trying alternative data extraction paths...')

      // Try direct data access
      const directData = apiClient.extractData(response, 'data', 'attributes')
      if (directData) {
        Object.assign(settingsData, {
          currency: directData.currency || settingsData.currency,
          email: directData.email || settingsData.email,
          company_name: directData.company_name || settingsData.company_name,
          phone: directData.phone || settingsData.phone,
          default_language: directData.default_language || settingsData.default_language,
          default_customer: directData.default_customer || settingsData.default_customer,
          default_warehouse: directData.default_warehouse || settingsData.default_warehouse,
          address: directData.address || settingsData.address,
          logo: directData.logo || settingsData.logo
        })
      }
    }

    // Create settings object with extracted data
    const settings: Omit<SettingsRecord, 'id' | 'created_at' | 'updated_at'> = {
      currency: settingsData.currency,
      email: settingsData.email,
      company_name: settingsData.company_name,
      phone: settingsData.phone,
      default_language: settingsData.default_language,
      default_customer: settingsData.default_customer,
      default_warehouse: settingsData.default_warehouse,
      address: settingsData.address,
      logo: settingsData.logo,
      show_phone: settingsData.show_phone,
      show_address: settingsData.show_address,
      show_customer: settingsData.show_customer,
      show_email: settingsData.show_email,
      show_tax_discount_shipping: settingsData.show_tax_discount_shipping,
      show_note: settingsData.show_note,
      show_barcode_in_receipt: settingsData.show_barcode_in_receipt,
      show_logo_in_receipt: settingsData.show_logo_in_receipt,
      protect_cart_product_delete: settingsData.protect_cart_product_delete,
      protect_cart_product_reduce: settingsData.protect_cart_product_reduce,
      enable_shipping: settingsData.enable_shipping,
      enable_tax: settingsData.enable_tax,
      enable_discount: settingsData.enable_discount,
      warehouse_name: settingsData.warehouse_name,
      customer_name: settingsData.customer_name,
      currency_symbol: settingsData.currency_symbol
    }

    upsertSettings(settings)
    console.log('[DB] Settings saved successfully with flexible extraction')
  } catch (error: any) {
    console.error('[DB] Failed to fetch settings:', error.message)

    // Create default settings if API fails
    // console.log('[DB] Creating default settings due to API failure...')
    // const defaultSettings: Omit<SettingsRecord, 'id' | 'created_at' | 'updated_at'> = {
    //   currency: 'NGN',
    //   email: '',
    //   company_name: 'Cheetah POS',
    //   phone: '',
    //   default_language: 'en',
    //   default_customer: '',
    //   default_warehouse: '',
    //   address: '',
    //   logo: null,
    //   show_phone: '1',
    //   show_address: '1',
    //   show_customer: '1',
    //   show_email: '1',
    //   show_tax_discount_shipping: '1',
    //   show_note: null,
    //   show_barcode_in_receipt: '1',
    //   show_logo_in_receipt: '1',
    //   protect_cart_product_delete: '0',
    //   protect_cart_product_reduce: '0',
    //   enable_shipping: '0',
    //   enable_tax: '0',
    //   enable_discount: '0',
    //   warehouse_name: '',
    //   customer_name: '',
    //   currency_symbol: '₦'
    // }

    try {
      // upsertSettings(defaultSettings)
      console.log(' settings not created ')
    } catch (dbError: any) {
      console.error('[DB] Failed to create default settings:', dbError.message)
      throw error // Throw original API error
    }
  }
}
