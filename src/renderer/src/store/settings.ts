import { create } from 'zustand'

export interface Settings {
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

export interface Country {
  id: number
  name: string
  short_code: string
  phone_code: number
  active: number
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Config {
  id: string
  permissions: string
  is_currency_right: string
  open_register: boolean
  created_at: string
  updated_at: string
}

export interface Warehouse {
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

export interface ProductCategory {
  id: number
  name: string
  image: string | null
  products_count: number
  created_at: string
  updated_at: string
}

export interface PaymentMethod {
  id: number
  name: string
  display_name: string
  active: boolean
  business_profile_id: number
  user_id: number
  created_at: string
  updated_at: string
}

export interface Unit {
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

interface SettingsState {
  settings: Settings | null
  countries: Country[]
  activeCountries: Country[]
  config: Config | null
  warehouses: Warehouse[]
  productCategories: ProductCategory[]
  paymentMethods: PaymentMethod[]
  units: Unit[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchSettings: () => Promise<void>
  fetchSettingsFromAPI: (baseUrl: string, userToken: string) => Promise<void>
  fetchCountries: () => Promise<void>
  fetchActiveCountries: () => Promise<void>
  fetchConfig: () => Promise<void>
  fetchWarehouses: () => Promise<void>
  fetchProductCategories: () => Promise<void>
  fetchPaymentMethods: () => Promise<void>
  fetchUnits: () => Promise<void>
  clearError: () => void
  
  // Helper getters
  getCurrencySymbol: () => string
  getCompanyInfo: () => {
    name: string
    email: string
    phone: string
    address: string
    logo: string | null
  }
  getTaxEnabled: () => boolean
  getShippingEnabled: () => boolean
  getDiscountEnabled: () => boolean
  
  // Config helper getters
  getPermissions: () => string[]
  hasPermission: (permission: string) => boolean
  isCurrencyRight: () => boolean
  isOpenRegister: () => boolean
  
  // Warehouse helper getters
  getWarehouseById: (id: number) => Warehouse | null
  getWarehouseByName: (name: string) => Warehouse | null
  getDefaultWarehouse: () => Warehouse | null
  
  // Product Categories helper getters
  getProductCategoryById: (id: number) => ProductCategory | null
  getProductCategoryByName: (name: string) => ProductCategory | null
  getProductCategoriesWithProducts: () => ProductCategory[]
  searchProductCategories: (searchTerm: string) => ProductCategory[]
  
  // Payment Methods helper getters
  getPaymentMethodById: (id: number) => PaymentMethod | null
  getPaymentMethodByName: (name: string) => PaymentMethod | null
  getActivePaymentMethods: () => PaymentMethod[]
  getPaymentMethodsByBusinessProfile: (businessProfileId: number) => PaymentMethod[]
  
  // Units helper getters
  getUnitById: (id: number) => Unit | null
  getUnitByName: (name: string) => Unit | null
  getUnitByShortName: (shortName: string) => Unit | null
  getDefaultUnits: () => Unit[]
  getUnitsByBusinessProfile: (businessProfileId: number) => Unit[]
  getBaseUnits: () => Unit[]
  getUnitsByBaseUnit: (baseUnitId: number) => Unit[]
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  countries: [],
  activeCountries: [],
  config: null,
  warehouses: [],
  productCategories: [],
  paymentMethods: [],
  units: [],
  isLoading: false,
  error: null,

  fetchSettings: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null })
      const settings = await window.api.db.getSettings()
      set({ settings, isLoading: false })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch settings'
      set({ error: errorMessage, isLoading: false })
    }
  },

  fetchSettingsFromAPI: async (baseUrl: string, userToken: string): Promise<void> => {
    try {
      set({ isLoading: true, error: null })
      const settings = await window.api.db.fetchSettings(baseUrl, userToken)
      set({ settings, isLoading: false })
      console.log('[Settings] Settings fetched and saved from API')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch settings from API'
      set({ error: errorMessage, isLoading: false })
      throw error // Re-throw so calling code can handle it
    }
  },

  fetchCountries: async (): Promise<void> => {
    try {
      const countries = await window.api.db.getCountries()
      set({ countries })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch countries'
      set({ error: errorMessage })
    }
  },

  fetchActiveCountries: async (): Promise<void> => {
    try {
      const activeCountries = await window.api.db.getActiveCountries()
      set({ activeCountries })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch active countries'
      set({ error: errorMessage })
    }
  },

  fetchConfig: async (): Promise<void> => {
    try {
      const config = await window.api.db.getConfig()
      set({ config })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch config'
      set({ error: errorMessage })
    }
  },

  fetchWarehouses: async (): Promise<void> => {
    try {
      const warehouses = await window.api.db.getWarehouses()
      set({ warehouses })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch warehouses'
      set({ error: errorMessage })
    }
  },

  fetchProductCategories: async (): Promise<void> => {
    try {
      const productCategories = await window.api.db.getProductCategories()
      set({ productCategories })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch product categories'
      set({ error: errorMessage })
    }
  },

  fetchPaymentMethods: async (): Promise<void> => {
    try {
      const paymentMethods = await window.api.db.getPaymentMethods()
      set({ paymentMethods })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch payment methods'
      set({ error: errorMessage })
    }
  },

  fetchUnits: async (): Promise<void> => {
    try {
      const units = await window.api.db.getUnits()
      set({ units })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch units'
      set({ error: errorMessage })
    }
  },

  clearError: (): void => {
    set({ error: null })
  },

  // Helper getters
  getCurrencySymbol: (): string => {
    const { settings } = get()
    return settings?.currency_symbol || '$'
  },

  getCompanyInfo: () => {
    const { settings } = get()
    return {
      name: settings?.company_name || '',
      email: settings?.email || '',
      phone: settings?.phone || '',
      address: settings?.address || '',
      logo: settings?.logo || null
    }
  },

  getTaxEnabled: (): boolean => {
    const { settings } = get()
    return settings?.enable_tax === '1'
  },

  getShippingEnabled: (): boolean => {
    const { settings } = get()
    return settings?.enable_shipping === '1'
  },

  getDiscountEnabled: (): boolean => {
    const { settings } = get()
    return settings?.enable_discount === '1'
  },

  // Config helper getters
  getPermissions: (): string[] => {
    const { config } = get()
    if (!config?.permissions) return []
    
    try {
      return JSON.parse(config.permissions)
    } catch (error) {
      console.error('[Settings] Failed to parse permissions:', error)
      return []
    }
  },

  hasPermission: (permission: string): boolean => {
    const permissions = get().getPermissions()
    return permissions.includes(permission)
  },

  isCurrencyRight: (): boolean => {
    const { config } = get()
    return config?.is_currency_right === '1'
  },

  isOpenRegister: (): boolean => {
    const { config } = get()
    return config?.open_register === true
  },

  // Warehouse helper getters
  getWarehouseById: (id: number): Warehouse | null => {
    const { warehouses } = get()
    return warehouses.find(warehouse => warehouse.id === id) || null
  },

  getWarehouseByName: (name: string): Warehouse | null => {
    const { warehouses } = get()
    return warehouses.find(warehouse => warehouse.name === name) || null
  },

  getDefaultWarehouse: (): Warehouse | null => {
    const { warehouses } = get()
    // Try to get 'main-branch' first, then fall back to the first one
    let warehouse = warehouses.find(w => w.name === 'main-branch')
    if (!warehouse && warehouses.length > 0) {
      warehouse = warehouses[0]
    }
    return warehouse || null
  },

  // Product Categories helper getters
  getProductCategoryById: (id: number): ProductCategory | null => {
    const { productCategories } = get()
    return productCategories.find(category => category.id === id) || null
  },

  getProductCategoryByName: (name: string): ProductCategory | null => {
    const { productCategories } = get()
    return productCategories.find(category => category.name === name) || null
  },

  getProductCategoriesWithProducts: (): ProductCategory[] => {
    const { productCategories } = get()
    return productCategories.filter(category => category.products_count > 0)
  },

  searchProductCategories: (searchTerm: string): ProductCategory[] => {
    const { productCategories } = get()
    if (!searchTerm.trim()) return productCategories
    const term = searchTerm.toLowerCase()
    return productCategories.filter(category => 
      category.name.toLowerCase().includes(term)
    )
  },

  // Payment Methods helper getters
  getPaymentMethodById: (id: number): PaymentMethod | null => {
    const { paymentMethods } = get()
    return paymentMethods.find(method => method.id === id) || null
  },

  getPaymentMethodByName: (name: string): PaymentMethod | null => {
    const { paymentMethods } = get()
    return paymentMethods.find(method => method.name === name) || null
  },

  getActivePaymentMethods: (): PaymentMethod[] => {
    const { paymentMethods } = get()
    return paymentMethods.filter(method => method.active)
  },

  getPaymentMethodsByBusinessProfile: (businessProfileId: number): PaymentMethod[] => {
    const { paymentMethods } = get()
    return paymentMethods.filter(method => 
      method.business_profile_id === businessProfileId && method.active
    )
  },

  // Units helper getters
  getUnitById: (id: number): Unit | null => {
    const { units } = get()
    return units.find(unit => unit.id === id) || null
  },

  getUnitByName: (name: string): Unit | null => {
    const { units } = get()
    return units.find(unit => unit.name === name) || null
  },

  getUnitByShortName: (shortName: string): Unit | null => {
    const { units } = get()
    return units.find(unit => unit.short_name === shortName) || null
  },

  getDefaultUnits: (): Unit[] => {
    const { units } = get()
    return units.filter(unit => unit.is_default)
  },

  getUnitsByBusinessProfile: (businessProfileId: number): Unit[] => {
    const { units } = get()
    return units.filter(unit => unit.business_profile_id === businessProfileId)
  },

  getBaseUnits: (): Unit[] => {
    const { units } = get()
    return units.filter(unit => unit.base_unit === unit.id)
  },

  getUnitsByBaseUnit: (baseUnitId: number): Unit[] => {
    const { units } = get()
    return units.filter(unit => unit.base_unit === baseUnitId)
  }
}))
