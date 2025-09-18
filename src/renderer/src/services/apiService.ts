import { api as axiosApi, ApiResponse, ApiError } from '@renderer/lib/axios'

// Unified API service that can handle both IPC and HTTP calls
export class ApiService {
  private static instance: ApiService
  private useHttp: boolean = false

  private constructor() {
    // Check if we should use HTTP API based on environment or configuration
    this.useHttp = this.shouldUseHttp()
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  private shouldUseHttp(): boolean {
    // You can modify this logic based on your requirements
    // For now, we'll use IPC by default but allow HTTP when needed
    return false
  }

  setUseHttp(useHttp: boolean): void {
    this.useHttp = useHttp
  }

  // Auth methods
  async login(credentials: { email: string; password: string }): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.post('/auth/login', credentials)
    }
    return await window.api.auth.login(credentials)
  }

  async logout(): Promise<void> {
    if (this.useHttp) {
      // HTTP logout logic if needed
      return
    }
    // IPC logout logic if needed
  }

  // Database methods
  async getSettings(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/settings')
    }
    return await window.api.db.getSettings()
  }

  async getFrontSettings(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/settings/front')
    }
    return await window.api.db.getFrontSettings()
  }

  async fetchSettings(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.post('/settings/sync')
    }
    return await window.api.db.fetchSettings()
  }

  async getCountries(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/countries')
    }
    return await window.api.db.getCountries()
  }

  async getActiveCountries(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/countries/active')
    }
    return await window.api.db.getActiveCountries()
  }

  // Products methods
  async listProducts(category?: string, limit?: number): Promise<any> {
    if (this.useHttp) {
      const params = new URLSearchParams()
      if (category) params.append('category', category)
      if (limit) params.append('limit', limit.toString())
      return await axiosApi.get(`/products?${params.toString()}`)
    }
    return await window.api.db.listProducts(category, limit)
  }

  async searchProductByCode(code: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/products/search/code/${code}`)
    }
    return await window.api.db.searchProductByCode(code)
  }

  async searchProducts(query: string, limit?: number): Promise<any> {
    if (this.useHttp) {
      const params = new URLSearchParams({ q: query })
      if (limit) params.append('limit', limit.toString())
      return await axiosApi.get(`/products/search?${params.toString()}`)
    }
    return await window.api.db.searchProducts(query, limit)
  }

  async upsertManyProducts(products: any[]): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.post('/products/bulk', { products })
    }
    return await window.api.db.upsertManyProducts(products)
  }

  // Sales methods
  async createSale(sale: any): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.post('/sales', sale)
    }
    return await window.api.db.createSale(sale)
  }

  async getPendingSales(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/sales/pending')
    }
    return await window.api.db.getPendingSales()
  }

  async getUnsyncedSalesCount(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/sales/unsynced/count')
    }
    return await window.api.db.getUnsyncedSalesCount()
  }

  async updateSaleSyncStatus(saleId: string, status: string, error?: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.put(`/sales/${saleId}/sync-status`, { status, error })
    }
    return await window.api.db.updateSaleSyncStatus(saleId, status, error)
  }

  async deleteSyncedSale(saleId: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.delete(`/sales/${saleId}`)
    }
    return await window.api.db.deleteSyncedSale(saleId)
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/sales/date-range?start=${startDate}&end=${endDate}`)
    }
    return await window.api.db.getSalesByDateRange(startDate, endDate)
  }

  async syncSales(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.post('/sales/sync')
    }
    return await window.api.db.syncSales()
  }

  // Config methods
  async getConfig(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/config')
    }
    return await window.api.db.getConfig()
  }

  async getPermissions(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/config/permissions')
    }
    return await window.api.db.getPermissions()
  }

  // Warehouses methods
  async getWarehouses(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/warehouses')
    }
    return await window.api.db.getWarehouses()
  }

  async getWarehouseById(id: number): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/warehouses/${id}`)
    }
    return await window.api.db.getWarehouseById(id)
  }

  async getWarehouseByName(name: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/warehouses/search?name=${name}`)
    }
    return await window.api.db.getWarehouseByName(name)
  }

  async getDefaultWarehouse(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/warehouses/default')
    }
    return await window.api.db.getDefaultWarehouse()
  }

  // Product Categories methods
  async getProductCategories(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/product-categories')
    }
    return await window.api.db.getProductCategories()
  }

  async getProductCategoryById(id: number): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/product-categories/${id}`)
    }
    return await window.api.db.getProductCategoryById(id)
  }

  async getProductCategoryByName(name: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/product-categories/search?name=${name}`)
    }
    return await window.api.db.getProductCategoryByName(name)
  }

  // Payment Methods methods
  async getPaymentMethods(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/payment-methods')
    }
    return await window.api.db.getPaymentMethods()
  }

  async getPaymentMethodById(id: number): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/payment-methods/${id}`)
    }
    return await window.api.db.getPaymentMethodById(id)
  }

  async getPaymentMethodByName(name: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/payment-methods/search?name=${name}`)
    }
    return await window.api.db.getPaymentMethodByName(name)
  }

  // Units methods
  async getUnits(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/units')
    }
    return await window.api.db.getUnits()
  }

  async getUnitById(id: number): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/units/${id}`)
    }
    return await window.api.db.getUnitById(id)
  }

  async getUnitByName(name: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/units/search?name=${name}`)
    }
    return await window.api.db.getUnitByName(name)
  }

  async getUnitByShortName(shortName: string): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/units/search?shortName=${shortName}`)
    }
    return await window.api.db.getUnitByShortName(shortName)
  }

  async getDefaultUnits(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/units/default')
    }
    return await window.api.db.getDefaultUnits()
  }

  async getUnitsByBusinessProfile(businessProfileId: number): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/units/business-profile/${businessProfileId}`)
    }
    return await window.api.db.getUnitsByBusinessProfile(businessProfileId)
  }

  async getBaseUnits(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get('/units/base')
    }
    return await window.api.db.getBaseUnits()
  }

  async getUnitsByBaseUnit(baseUnitId: number): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.get(`/units/base/${baseUnitId}`)
    }
    return await window.api.db.getUnitsByBaseUnit(baseUnitId)
  }

  // Products sync methods
  async startProductSync(): Promise<any> {
    if (this.useHttp) {
      return await axiosApi.post('/products/sync/start')
    }
    return await window.api.products.sync.start()
  }

  async resetProductSync(): Promise<any> {
    if (this.useHttp) {
      // HTTP reset product sync logic
      return await axiosApi.post('/products/sync/reset')
    }
    return await window.api.products.sync.reset()
  }

  // Hold methods
  async saveHold(holdData: { name: string; items: any[]; totalAmount: number }): Promise<any> {
    // if (this.useHttp) {
    //   return await axiosApi.post('/holds', holdData)
    // }
    return await window.api.db.saveHold(holdData)
  }

  async getHolds(): Promise<any> {
    // if (this.useHttp) {
    //   return await axiosApi.get('/holds')
    // }
    return await window.api.db.getHolds()
  }

  async getHoldById(id: string): Promise<any> {
    // if (this.useHttp) {
    //   return await axiosApi.get(`/holds/${id}`)
    // }
    return await window.api.db.getHoldById(id)
  }

  async deleteHold(id: string): Promise<any> {
    // if (this.useHttp) {
    //   return await axiosApi.delete(`/holds/${id}`)
    // }
    return await window.api.db.deleteHold(id)
  }

  async getProductSyncProgress(): Promise<any> {
    // if (this.useHttp) {
    //   return await axiosApi.get('/products/sync/progress')
    // }
    return await window.api.products.sync.progress()
  }

  // Environment methods
  async getEnvVar(key: string): Promise<string> {
    // if (this.useHttp) {
    //   // HTTP doesn't have direct env access, return empty
    //   return ''
    // }
    return await window.api.env.get(key)
  }

  async listEnvVars(): Promise<any> {
    if (this.useHttp) {
      // HTTP doesn't have direct env access, return empty
      return []
    }
    return await window.api.env.list()
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance()

// Export individual methods for convenience
export const {
  login,
  logout,
  getSettings,
  getFrontSettings,
  fetchSettings,
  getCountries,
  getActiveCountries,
  listProducts,
  searchProductByCode,
  searchProducts,
  upsertManyProducts,
  createSale,
  getPendingSales,
  getUnsyncedSalesCount,
  updateSaleSyncStatus,
  deleteSyncedSale,
  getSalesByDateRange,
  syncSales,
  getConfig,
  getPermissions,
  getWarehouses,
  getWarehouseById,
  getWarehouseByName,
  getDefaultWarehouse,
  getProductCategories,
  getProductCategoryById,
  getProductCategoryByName,
  getPaymentMethods,
  getPaymentMethodById,
  getPaymentMethodByName,
  getUnits,
  getUnitById,
  getUnitByName,
  getUnitByShortName,
  getDefaultUnits,
  getUnitsByBusinessProfile,
  getBaseUnits,
  getUnitsByBaseUnit,
  startProductSync,
  resetProductSync,
  getProductSyncProgress,
  saveHold,
  getHolds,
  getHoldById,
  deleteHold,
  getEnvVar,
  listEnvVars
} = apiService

