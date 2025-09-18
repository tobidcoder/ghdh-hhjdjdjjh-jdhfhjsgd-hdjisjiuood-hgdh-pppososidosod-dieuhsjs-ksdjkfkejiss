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
  is_active: number
  business_profile_id: number
  created_at: string
  updated_at: string
}

export interface UnitRecord {
  id: number
  name: string
  short_name: string
  base_unit_id: number | null
  operator: string | null
  operation_value: number | null
  business_profile_id: number
  created_at: string
  updated_at: string
}
