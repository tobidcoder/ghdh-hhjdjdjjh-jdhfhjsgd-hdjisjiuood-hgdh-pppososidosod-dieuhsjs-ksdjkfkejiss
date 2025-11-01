import { ipcMain, BrowserWindow } from 'electron'
import { getDatabaseFilePath } from '../database/connection'
import { resetMigrations } from '../database/migrations'
import * as productService from '../services/products-new'
import * as settingsService from '../services/settings'
import * as countriesService from '../services/countries'
import * as warehousesService from '../services/warehouses'
import * as productCategoriesService from '../services/productCategories'
import * as paymentMethodsService from '../services/paymentMethods'
import * as unitsService from '../services/units'
import * as configService from '../services/config'
import * as loginSyncService from '../services/loginSync'
import * as authService from '../services/auth'
import * as salesService from '../services/sales'
import * as holdsService from '../services/holds'

// Track registration state to prevent duplicates
let databaseHandlersRegistered = false
let productSyncHandlersRegistered = false

// Product sync IPC handlers
export function registerProductSyncIpcHandlers(): void {
  // Check if handlers are already registered to prevent duplicates
  if (productSyncHandlersRegistered) {
    console.log('[DB] Product sync IPC handlers already registered, skipping...')
    return
  }

  ipcMain.handle('products:sync:start', async () => {
    try {
      await productService.syncProductsFromRemote()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Product sync failed:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('products:sync:progress', () => {
    return productService.getProductSyncProgress()
  })

  ipcMain.handle('products:sync:reset', () => {
    productService.resetProductSyncProgress()
    return { success: true }
  })

  ipcMain.handle('products:sync:getUpdated', async () => {
    try {
      await productService.fetchUpdatedProducts()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Get updated products failed:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Mark as registered
  productSyncHandlersRegistered = true
  console.log('[DB] Product sync IPC handlers registered successfully')
}

// Utility functions for handler management
export function areHandlersRegistered(): boolean {
  return databaseHandlersRegistered && productSyncHandlersRegistered
}

export function resetHandlerRegistration(): void {
  databaseHandlersRegistered = false
  productSyncHandlersRegistered = false
  console.log('[DB] Handler registration state reset')
}

// Database IPC handlers
export function registerDatabaseIpcHandlers(): void {
  console.log('[DB] Registering IPC handlers...')

  // Check if handlers are already registered to prevent duplicates
  if (databaseHandlersRegistered) {
    console.log('[DB] Database IPC handlers already registered, skipping...')
    return
  }

  ipcMain.handle('db:products:list', (_event, category?: string, limit?: number) => {
    return productService.listProducts(category, limit)
  })

  ipcMain.handle('db:products:searchByCode', (_event, code: string) => {
    return productService.searchProductByCode(code)
  })

  ipcMain.handle('db:products:search', (_event, query: string, limit?: number) => {
    return productService.searchProducts(query, limit)
  })

  ipcMain.handle('db:products:upsertMany', (_event, products: any[]) => {
    productService.upsertProducts(products)
    return { success: true }
  })

  ipcMain.handle('db:path', () => {
    return getDatabaseFilePath()
  })

  ipcMain.handle('db:resetMigrations', () => {
    try {
      resetMigrations()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to reset migrations:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Settings IPC handlers
  ipcMain.handle('db:settings:fetch', async () => {
    try {
      await settingsService.fetchAndSaveSettings()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to fetch settings:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:settings:get', () => {
    return settingsService.getSettings()
  })

  ipcMain.handle('db:frontSettings:get', () => {
    return settingsService.getFrontSettings()
  })

  // Countries IPC handlers
  ipcMain.handle('db:countries:fetch', async () => {
    try {
      await countriesService.fetchAndSaveCountries()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to fetch countries:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:countries:get', () => {
    return countriesService.getCountries()
  })

  ipcMain.handle('db:countries:getActive', () => {
    return countriesService.getActiveCountries()
  })

  // Warehouses IPC handlers
  ipcMain.handle('db:warehouses:fetch', async () => {
    try {
      await warehousesService.fetchAndSaveWarehouses()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to fetch warehouses:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:warehouses:get', () => {
    return warehousesService.getWarehouses()
  })

  ipcMain.handle('db:warehouses:getDefault', () => {
    return warehousesService.getDefaultWarehouse()
  })

  ipcMain.handle('db:warehouses:getById', (_event, id: number) => {
    try {
      return warehousesService.getWarehouseById(id)
    } catch (error: any) {
      console.error('[DB] Failed to get warehouse by ID:', error.message)
      return null
    }
  })

  ipcMain.handle('db:warehouses:getByName', (_event, name: string) => {
    try {
      const warehouses = warehousesService.getWarehouses()
      return warehouses.find(w => w.name.toLowerCase().includes(name.toLowerCase())) || null
    } catch (error: any) {
      console.error('[DB] Failed to get warehouse by name:', error.message)
      return null
    }
  })

  // Product Categories IPC handlers
  ipcMain.handle('db:productCategories:fetch', async () => {
    try {
      await productCategoriesService.fetchAndSaveProductCategories()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to fetch product categories:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:productCategories:get', () => {
    return productCategoriesService.getProductCategories()
  })

  ipcMain.handle('db:productCategories:getById', (_event, id: number) => {
    try {
      return productCategoriesService.getProductCategoryById(id)
    } catch (error: any) {
      console.error('[DB] Failed to get product category by ID:', error.message)
      return null
    }
  })

  ipcMain.handle('db:productCategories:getByName', (_event, name: string) => {
    try {
      return productCategoriesService.getProductCategoryByName(name)
    } catch (error: any) {
      console.error('[DB] Failed to get product category by name:', error.message)
      return null
    }
  })

  ipcMain.handle('db:productCategories:getWithProducts', () => {
    try {
      const categories = productCategoriesService.getProductCategories()
      // This would need to be enhanced to include product counts
      return categories
    } catch (error: any) {
      console.error('[DB] Failed to get product categories with products:', error.message)
      return []
    }
  })

  ipcMain.handle('db:productCategories:search', (_event, searchTerm: string) => {
    try {
      const categories = productCategoriesService.getProductCategories()
      return categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    } catch (error: any) {
      console.error('[DB] Failed to search product categories:', error.message)
      return []
    }
  })

  // Payment Methods IPC handlers
  ipcMain.handle('db:paymentMethods:fetch', async () => {
    try {
      await paymentMethodsService.fetchAndSavePaymentMethods()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to fetch payment methods:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:paymentMethods:get', () => {
    return paymentMethodsService.getPaymentMethods()
  })

  ipcMain.handle('db:paymentMethods:getActive', () => {
    return paymentMethodsService.getActivePaymentMethods()
  })

  ipcMain.handle('db:paymentMethods:getAll', () => {
    try {
      return paymentMethodsService.getPaymentMethods()
    } catch (error: any) {
      console.error('[DB] Failed to get all payment methods:', error.message)
      return []
    }
  })

  ipcMain.handle('db:paymentMethods:getById', (_event, id: number) => {
    try {
      return paymentMethodsService.getPaymentMethodById(id)
    } catch (error: any) {
      console.error('[DB] Failed to get payment method by ID:', error.message)
      return null
    }
  })

  ipcMain.handle('db:paymentMethods:getByName', (_event, name: string) => {
    try {
      const methods = paymentMethodsService.getPaymentMethods()
      return methods.find(m => m.name.toLowerCase().includes(name.toLowerCase())) || null
    } catch (error: any) {
      console.error('[DB] Failed to get payment method by name:', error.message)
      return null
    }
  })

  ipcMain.handle('db:paymentMethods:getByBusinessProfile', (_event, businessProfileId: number) => {
    try {
      const methods = paymentMethodsService.getPaymentMethods()
      return methods.filter(m => m.business_profile_id === businessProfileId)
    } catch (error: any) {
      console.error('[DB] Failed to get payment methods by business profile:', error.message)
      return []
    }
  })

  // Holds IPC handlers
  ipcMain.handle('db:holds:save', (_event, hold: { name: string; items: any[]; totalAmount: number }) => {
    try {
      return holdsService.saveHold(hold)
    } catch (error: any) {
      console.error('[DB] Failed to save hold:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:holds:getAll', () => {
    try {
      return holdsService.getHolds()
    } catch (error: any) {
      console.error('[DB] Failed to get holds:', error.message)
      return []
    }
  })

  ipcMain.handle('db:holds:getById', (_event, id: string) => {
    try {
      return holdsService.getHoldById(id)
    } catch (error: any) {
      console.error('[DB] Failed to get hold by id:', error.message)
      return null
    }
  })

  ipcMain.handle('db:holds:delete', (_event, id: string) => {
    try {
      return holdsService.deleteHold(id)
    } catch (error: any) {
      console.error('[DB] Failed to delete hold:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Units IPC handlers
  ipcMain.handle('db:units:fetch', async () => {
    try {
      await unitsService.fetchAndSaveUnits()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to fetch units:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:units:get', () => {
    return unitsService.getUnits()
  })

  ipcMain.handle('db:units:getBase', () => {
    return unitsService.getBaseUnits()
  })

  ipcMain.handle('db:units:getById', (_event, id: number) => {
    try {
      return unitsService.getUnitById(id)
    } catch (error: any) {
      console.error('[DB] Failed to get unit by ID:', error.message)
      return null
    }
  })

  ipcMain.handle('db:units:getByName', (_event, name: string) => {
    try {
      const units = unitsService.getUnits()
      return units.find(u => u.name.toLowerCase().includes(name.toLowerCase())) || null
    } catch (error: any) {
      console.error('[DB] Failed to get unit by name:', error.message)
      return null
    }
  })

  ipcMain.handle('db:units:getByShortName', (_event, shortName: string) => {
    try {
      const units = unitsService.getUnits()
      return units.find(u => u.short_name?.toLowerCase().includes(shortName.toLowerCase())) || null
    } catch (error: any) {
      console.error('[DB] Failed to get unit by short name:', error.message)
      return null
    }
  })

  ipcMain.handle('db:units:getDefault', () => {
    try {
      const units = unitsService.getUnits()
      return units[0] || null // Return first unit as default
    } catch (error: any) {
      console.error('[DB] Failed to get default units:', error.message)
      return null
    }
  })

  ipcMain.handle('db:units:getByBusinessProfile', (_event, businessProfileId: number) => {
    try {
      const units = unitsService.getUnits()
      return units.filter(u => u.business_profile_id === businessProfileId)
    } catch (error: any) {
      console.error('[DB] Failed to get units by business profile:', error.message)
      return []
    }
  })

  ipcMain.handle('db:units:getByBaseUnit', (_event, baseUnitId: number) => {
    try {
      const units = unitsService.getUnits()
      return units.filter(u => u.base_unit_id === baseUnitId)
    } catch (error: any) {
      console.error('[DB] Failed to get units by base unit:', error.message)
      return []
    }
  })

  // Config IPC handlers
  ipcMain.handle('db:config:fetch', async () => {
    try {
      await configService.fetchAndSaveConfig()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to fetch config:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:config:get', () => {
    return configService.getConfig()
  })

  ipcMain.handle('db:config:isRegisterOpen', () => {
    return configService.isRegisterOpen()
  })

  ipcMain.handle('db:config:getPermissions', () => {
    return configService.getPermissions()
  })

  ipcMain.handle('db:config:hasPermission', (_event, permission: string) => {
    return configService.hasPermission(permission)
  })

  ipcMain.handle('db:config:isCurrencyRight', () => {
    try {
      const config = configService.getConfig()
      return config?.is_currency_right === '1'
    } catch (error: any) {
      console.error('[DB] Failed to check currency right:', error.message)
      return false
    }
  })

  ipcMain.handle('db:config:isOpenRegister', () => {
    try {
      return configService.isRegisterOpen()
    } catch (error: any) {
      console.error('[DB] Failed to check register status:', error.message)
      return false
    }
  })

  // Sales IPC handlers
  ipcMain.handle('db:sales:create', (_event, sale: any) => {
    try {
      const result = salesService.createSale(sale)
      // Opportunistic cleanup after creating a sale (non-blocking)
      try { salesService.cleanupOldSyncedSales() } catch {}
      return result
    } catch (error: any) {
      console.error('[DB] Failed to create sale:', error.message)
      throw new Error(error.message || 'Failed to create sale')
    }
  })

  ipcMain.handle('db:sales:getPending', () => {
    try {
      return salesService.getPendingSales()
    } catch (error: any) {
      console.error('[DB] Failed to get pending sales:', error.message)
      return []
    }
  })

  ipcMain.handle('db:sales:getUnsyncedCount', () => {
    try {
      return salesService.getUnsyncedSalesCount()
    } catch (error: any) {
      console.error('[DB] Failed to get unsynced sales count:', error.message)
      return 0
    }
  })

  ipcMain.handle('db:sales:updateSyncStatus', (_event, saleId: string, status: string, error?: string) => {
    try {
      salesService.updateSaleSyncStatus(saleId, status as any, error)
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to update sale sync status:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:sales:deleteSynced', (_event, saleId: string) => {
    try {
      salesService.deleteSyncedSale(saleId)
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to delete synced sale:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:sales:getByDateRange', (_event, startDate: string, endDate: string) => {
    try {
      return salesService.getSalesByDateRange(startDate, endDate)
    } catch (error: any) {
      console.error('[DB] Failed to get sales by date range:', error.message)
      return []
    }
  })

  ipcMain.handle('db:sales:sync', async () => {
    try {
      await salesService.syncSalesToRemote()
      // Cleanup after sync completes
      try { salesService.cleanupOldSyncedSales() } catch {}
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Sales sync failed:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:sales:cleanupOldSynced', () => {
    try {
      const removed = salesService.cleanupOldSyncedSales()
      return { success: true, removed }
    } catch (error: any) {
      console.error('[DB] Failed to cleanup old synced sales:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Login Sync IPC handlers
  ipcMain.handle('db:loginSync:perform', async () => {
    try {
      return await loginSyncService.performLoginSync()
    } catch (error: any) {
      console.error('[DB] Login sync failed:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:loginSync:performQuick', async () => {
    try {
      return await loginSyncService.performQuickLoginSync()
    } catch (error: any) {
      console.error('[DB] Quick login sync failed:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:loginSync:isEssentialDataAvailable', () => {
    return loginSyncService.isEssentialDataAvailable()
  })

  // Authentication IPC handlers
  ipcMain.handle('auth:login', async (_event, credentials: { email: string; password: string }) => {
    try {
      return await authService.performLogin(credentials)
    } catch (error: any) {
      console.error('[DB] Login failed:', error.message)
      throw new Error(error.message || 'Login failed')
    }
  })

  ipcMain.handle('auth:seedFromResponse', (_event, payload: { response: any; password: string }) => {
    try {
      return authService.seedUserFromResponse(payload)
    } catch (error: any) {
      console.error('[DB] Failed to seed user from response:', error.message)
      throw new Error(error.message || 'Failed to seed user')
    }
  })

  ipcMain.handle('auth:getRawResponse', (_event, emailOrUsername: string) => {
    try {
      return authService.getRawResponse(emailOrUsername)
    } catch (error: any) {
      console.error('[DB] Failed to get raw response:', error.message)
      return null
    }
  })

  ipcMain.handle('auth:clearCurrentUserData', () => {
    try {
      authService.clearCurrentUserData()
      return { success: true }
    } catch (error: any) {
      console.error('[DB] Failed to clear current user data:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Printing handlers
  ipcMain.handle(
    'print:receipt',
    async (
      _event,
      htmlContent: string,
      options?: { silent?: boolean; deviceName?: string }
    ) => {
      try {
        const win = new BrowserWindow({
          width: 800,
          height: 900,
          show: false,
          webPreferences: { sandbox: false }
        })

        // Check for available printers before attempting to print
        const printers = await win.webContents.getPrintersAsync()
        if (!printers || printers.length === 0) {
          win.close()
          return {
            success: false,
            error: 'NO_PRINTER_CONNECTED',
            message: 'No printer is connected. Please connect a printer and try again.'
          }
        }

        await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent))

        await new Promise<void>((resolve) => {
          // Give the content a tick to render before printing
          setTimeout(() => resolve(), 50)
        })

        await new Promise<void>((resolve, reject) => {
          win.webContents.print(
            {
              silent: options?.silent ?? true,
              deviceName: options?.deviceName
            },
            (success, failureReason) => {
              if (!success) {
                // Check if the failure is due to no printer
                const errorMessage = failureReason || 'Print failed'
                const isNoPrinterError =
                  errorMessage.toLowerCase().includes('printer') ||
                  errorMessage.toLowerCase().includes('no printer') ||
                  errorMessage.toLowerCase().includes('device') ||
                  errorMessage.toLowerCase().includes('not found')

                if (isNoPrinterError) {
                  reject(
                    new Error(
                      'NO_PRINTER_CONNECTED: No printer is connected. Please connect a printer and try again.'
                    )
                  )
                } else {
                  reject(new Error(errorMessage))
                }
              } else {
                resolve()
              }
            }
          )
        })

        win.close()
        return { success: true }
      } catch (error: any) {
        console.error('[PRINT] Failed to print receipt:', error.message)
        // Check if it's a no printer error
        if (error.message.includes('NO_PRINTER_CONNECTED')) {
          return {
            success: false,
            error: 'NO_PRINTER_CONNECTED',
            message: 'No printer is connected. Please connect a printer and try again.'
          }
        }
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('print:receipt:openPreview', async (_event, htmlContent: string) => {
    try {
      const preview = new BrowserWindow({
        width: 900,
        height: 1000,
        show: true,
        title: 'Receipt Preview',
        webPreferences: { sandbox: false }
      })

      await preview.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent))
      return { success: true }
    } catch (error: any) {
      console.error('[PRINT] Failed to open preview:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(
    'print:receipt:current',
    async (_event, options?: { silent?: boolean; deviceName?: string }) => {
      try {
        const focused = BrowserWindow.getFocusedWindow()
        if (!focused) {
          throw new Error('No focused window to print')
        }
        await new Promise<void>((resolve, reject) => {
          focused.webContents.print(
            {
              silent: options?.silent ?? true,
              deviceName: options?.deviceName
            },
            (success, failureReason) => {
              if (!success) {
                reject(new Error(failureReason || 'Print failed'))
              } else {
                resolve()
              }
            }
          )
        })
        return { success: true }
      } catch (error: any) {
        console.error('[PRINT] Failed to print current window:', error.message)
        return { success: false, error: error.message }
      }
    }
  )

  // Environment variable handlers
  ipcMain.handle('env:get', (_event, key: string) => {
    const value = process.env[key] || ''
    console.log(`[ENV] Requested ${key}:`, value)
    console.log(
      `[ENV] All env vars:`,
      Object.keys(process.env).filter((k) => k.includes('BASE') || k.includes('URL'))
    )
    return value
  })

  ipcMain.handle('env:list', () => {
    const envVars = Object.keys(process.env).filter(
      (key) => key.includes('BASE') || key.includes('URL') || key.includes('API')
    )
    console.log('[ENV] Available env vars:', envVars)
    return envVars.reduce(
      (acc, key) => {
        acc[key] = process.env[key]
        return acc
      },
      {} as Record<string, string | undefined>
    )
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Mark as registered
  databaseHandlersRegistered = true
  console.log('[DB] Database IPC handlers registered successfully')
}
