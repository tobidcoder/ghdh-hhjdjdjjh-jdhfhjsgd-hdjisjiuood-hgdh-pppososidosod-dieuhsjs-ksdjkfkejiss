import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  db: {
    listProducts: (category?: string, limit?: number) =>
      ipcRenderer.invoke('db:products:list', category, limit),
    searchProductByCode: (code: string) => ipcRenderer.invoke('db:products:searchByCode', code),
    searchProducts: (query: string, limit?: number) =>
      ipcRenderer.invoke('db:products:search', query, limit),
    upsertManyProducts: (
      products: Array<{
        id: string
        name: string
        price: number
        category: string
        code: string | null
        raw_response: string | null
      }>
    ) => ipcRenderer.invoke('db:products:upsertMany', products),
    getPath: () => ipcRenderer.invoke('db:path'),
    // Sales API
    createSale: (sale: any) => ipcRenderer.invoke('db:sales:create', sale),
    getPendingSales: () => ipcRenderer.invoke('db:sales:getPending'),
    getUnsyncedSalesCount: () => ipcRenderer.invoke('db:sales:getUnsyncedCount'),
    updateSaleSyncStatus: (saleId: string, status: string, error?: string) =>
      ipcRenderer.invoke('db:sales:updateSyncStatus', saleId, status, error),
    deleteSyncedSale: (saleId: string) => ipcRenderer.invoke('db:sales:deleteSynced', saleId),
    getSalesByDateRange: (startDate: string, endDate: string) =>
      ipcRenderer.invoke('db:sales:getByDateRange', startDate, endDate),
    syncSales: () => ipcRenderer.invoke('db:sales:sync'),
    // Settings API
    getSettings: () => ipcRenderer.invoke('db:settings:get'),
    getFrontSettings: () => ipcRenderer.invoke('db:frontSettings:get'),
    fetchSettings: () => ipcRenderer.invoke('db:settings:fetch'),
    getCountries: () => ipcRenderer.invoke('db:countries:get'),
    getActiveCountries: () => ipcRenderer.invoke('db:countries:getActive'),
    // Config API
    getConfig: () => ipcRenderer.invoke('db:config:get'),
    getPermissions: () => ipcRenderer.invoke('db:config:getPermissions'),
    hasPermission: (permission: string) =>
      ipcRenderer.invoke('db:config:hasPermission', permission),
    isCurrencyRight: () => ipcRenderer.invoke('db:config:isCurrencyRight'),
    isOpenRegister: () => ipcRenderer.invoke('db:config:isOpenRegister'),
    // Warehouse API
    getWarehouses: () => ipcRenderer.invoke('db:warehouses:get'),
    getWarehouseById: (id: number) => ipcRenderer.invoke('db:warehouses:getById', id),
    getWarehouseByName: (name: string) => ipcRenderer.invoke('db:warehouses:getByName', name),
    getDefaultWarehouse: () => ipcRenderer.invoke('db:warehouses:getDefault'),
    // Product Categories API
    getProductCategories: () => ipcRenderer.invoke('db:productCategories:get'),
    getProductCategoryById: (id: number) => ipcRenderer.invoke('db:productCategories:getById', id),
    getProductCategoryByName: (name: string) =>
      ipcRenderer.invoke('db:productCategories:getByName', name),
    getProductCategoriesWithProducts: () =>
      ipcRenderer.invoke('db:productCategories:getWithProducts'),
    searchProductCategories: (searchTerm: string) =>
      ipcRenderer.invoke('db:productCategories:search', searchTerm),
    // Payment Methods API
    getPaymentMethods: () => ipcRenderer.invoke('db:paymentMethods:get'),
    getAllPaymentMethods: () => ipcRenderer.invoke('db:paymentMethods:getAll'),
    getPaymentMethodById: (id: number) => ipcRenderer.invoke('db:paymentMethods:getById', id),
    getPaymentMethodByName: (name: string) =>
      ipcRenderer.invoke('db:paymentMethods:getByName', name),
    getActivePaymentMethods: () => ipcRenderer.invoke('db:paymentMethods:getActive'),
    getPaymentMethodsByBusinessProfile: (businessProfileId: number) =>
      ipcRenderer.invoke('db:paymentMethods:getByBusinessProfile', businessProfileId),
    // Units API
    getUnits: () => ipcRenderer.invoke('db:units:get'),
    getUnitById: (id: number) => ipcRenderer.invoke('db:units:getById', id),
    getUnitByName: (name: string) => ipcRenderer.invoke('db:units:getByName', name),
    getUnitByShortName: (shortName: string) =>
      ipcRenderer.invoke('db:units:getByShortName', shortName),
    getDefaultUnits: () => ipcRenderer.invoke('db:units:getDefault'),
    getUnitsByBusinessProfile: (businessProfileId: number) =>
      ipcRenderer.invoke('db:units:getByBusinessProfile', businessProfileId),
    getBaseUnits: () => ipcRenderer.invoke('db:units:getBaseUnits'),
    getUnitsByBaseUnit: (baseUnitId: number) =>
      ipcRenderer.invoke('db:units:getByBaseUnit', baseUnitId),
    // Hold API
    saveHold: (hold: any) => ipcRenderer.invoke('db:holds:save', hold),
    getHolds: () => ipcRenderer.invoke('db:holds:getAll'),
    getHoldById: (id: string) => ipcRenderer.invoke('db:holds:getById', id),
    deleteHold: (id: string) => ipcRenderer.invoke('db:holds:delete', id)
  },
  auth: {
    login: (payload: { email: string; password: string }) =>
      ipcRenderer.invoke('auth:login', payload),
    seedFromResponse: (payload: { response: any; password: string }) =>
      ipcRenderer.invoke('auth:seedFromResponse', payload),
    getRawResponse: (emailOrUsername: string) =>
      ipcRenderer.invoke('auth:getRawResponse', emailOrUsername),
    clearCurrentUserData: () => ipcRenderer.invoke('auth:clearCurrentUserData')
  },
  products: {
    sync: {
      start: () => ipcRenderer.invoke('products:sync:start'),
      progress: () => ipcRenderer.invoke('products:sync:progress'),
      reset: () => ipcRenderer.invoke('products:sync:reset')
    }
  },
  loginSync: {
    perform: () => ipcRenderer.invoke('db:loginSync:perform'),
    performQuick: () => ipcRenderer.invoke('db:loginSync:performQuick'),
    isEssentialDataAvailable: () => ipcRenderer.invoke('db:loginSync:isEssentialDataAvailable')
  },
  env: {
    get: (key: string) => ipcRenderer.invoke('env:get', key),
    list: () => ipcRenderer.invoke('env:list')
  },
  print: {
    receipt: (
      htmlContent: string,
      options?: { silent?: boolean; deviceName?: string }
    ) => ipcRenderer.invoke('print:receipt', htmlContent, options)
    ,
    openPreview: (htmlContent: string) => ipcRenderer.invoke('print:receipt:openPreview', htmlContent)
    ,
    current: (options?: { silent?: boolean; deviceName?: string }) =>
      ipcRenderer.invoke('print:receipt:current', options)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    console.log('[Preload] APIs exposed via contextBridge:', Object.keys(api))
    console.log('[Preload] Auth API available:', !!api.auth)
    console.log('[Preload] Auth methods:', Object.keys(api.auth))
  } catch (error) {
    console.error('[Preload] Error exposing APIs:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  console.log('[Preload] APIs exposed directly to window:', Object.keys(api))
}
