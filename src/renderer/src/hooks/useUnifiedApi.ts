import { useState, useCallback } from 'react'
import { apiService, ApiService } from '@renderer/services/apiService'

interface UseUnifiedApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

export const useUnifiedApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const execute = useCallback(
    async <T = any>(
      apiCall: () => Promise<T>,
      options?: UseUnifiedApiOptions
    ): Promise<T> => {
      setLoading(true)
      setError(null)

      try {
        const result = await apiCall()
        options?.onSuccess?.(result)
        return result
      } catch (err: any) {
        setError(err)
        options?.onError?.(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Auth methods
  const login = useCallback(
    (credentials: { email: string; password: string }, options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.login(credentials), options)
    },
    [execute]
  )

  const logout = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.logout(), options)
    },
    [execute]
  )

  // Settings methods
  const getSettings = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getSettings(), options)
    },
    [execute]
  )

  const getFrontSettings = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getFrontSettings(), options)
    },
    [execute]
  )

  const fetchSettings = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.fetchSettings(), options)
    },
    [execute]
  )

  // Products methods
  const listProducts = useCallback(
    (category?: string, limit?: number, options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.listProducts(category, limit), options)
    },
    [execute]
  )

  const searchProducts = useCallback(
    (query: string, limit?: number, options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.searchProducts(query, limit), options)
    },
    [execute]
  )

  const searchProductByCode = useCallback(
    (code: string, options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.searchProductByCode(code), options)
    },
    [execute]
  )

  // Sales methods
  const createSale = useCallback(
    (sale: any, options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.createSale(sale), options)
    },
    [execute]
  )

  const getPendingSales = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getPendingSales(), options)
    },
    [execute]
  )

  const getUnsyncedSalesCount = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getUnsyncedSalesCount(), options)
    },
    [execute]
  )

  const syncSales = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.syncSales(), options)
    },
    [execute]
  )

  // Countries methods
  const getCountries = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getCountries(), options)
    },
    [execute]
  )

  const getActiveCountries = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getActiveCountries(), options)
    },
    [execute]
  )

  // Warehouses methods
  const getWarehouses = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getWarehouses(), options)
    },
    [execute]
  )

  const getDefaultWarehouse = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getDefaultWarehouse(), options)
    },
    [execute]
  )

  // Product Categories methods
  const getProductCategories = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getProductCategories(), options)
    },
    [execute]
  )

  // Payment Methods methods
  const getPaymentMethods = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getPaymentMethods(), options)
    },
    [execute]
  )

  // Units methods
  const getUnits = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getUnits(), options)
    },
    [execute]
  )

  const getDefaultUnits = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getDefaultUnits(), options)
    },
    [execute]
  )

  // Product sync methods
  const startProductSync = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.startProductSync(), options)
    },
    [execute]
  )

  const getProductSyncProgress = useCallback(
    (options?: UseUnifiedApiOptions) => {
      return execute(() => apiService.getProductSyncProgress(), options)
    },
    [execute]
  )

  // Utility methods
  const setUseHttp = useCallback((useHttp: boolean) => {
    apiService.setUseHttp(useHttp)
  }, [])

  return {
    // Core methods
    execute,
    loading,
    error,
    clearError: () => setError(null),
    setUseHttp,

    // Auth
    login,
    logout,

    // Settings
    getSettings,
    getFrontSettings,
    fetchSettings,

    // Products
    listProducts,
    searchProducts,
    searchProductByCode,

    // Sales
    createSale,
    getPendingSales,
    getUnsyncedSalesCount,
    syncSales,

    // Countries
    getCountries,
    getActiveCountries,

    // Warehouses
    getWarehouses,
    getDefaultWarehouse,

    // Product Categories
    getProductCategories,

    // Payment Methods
    getPaymentMethods,

    // Units
    getUnits,
    getDefaultUnits,

    // Product Sync
    startProductSync,
    getProductSyncProgress
  }
}

