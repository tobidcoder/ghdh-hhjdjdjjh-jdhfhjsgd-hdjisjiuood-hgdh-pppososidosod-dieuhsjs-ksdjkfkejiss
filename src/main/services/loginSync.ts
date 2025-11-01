import * as settingsService from './settings'
// import * as countriesService from './countries'
import * as warehousesService from './warehouses'
import * as productCategoriesService from './productCategories'
import * as paymentMethodsService from './paymentMethods'
import * as unitsService from './units'
import * as configService from './config'
import * as productsService from './products-new'

export interface LoginSyncProgress {
  step: string
  completed: boolean
  error?: string
}

export interface LoginSyncResult {
  success: boolean
  steps: LoginSyncProgress[]
  totalSteps: number
  completedSteps: number
}

/**
 * Comprehensive login sync that fetches all necessary data for the application
 * This should be called after successful user authentication
 */
export async function performLoginSync(): Promise<LoginSyncResult> {
  const steps: LoginSyncProgress[] = []
  let completedSteps = 0
  const totalSteps = 8

  console.log('[DB] Starting comprehensive login sync...')

  try {
    // Step 1: Fetch business settings
    try {
      steps.push({ step: 'Business Settings', completed: false })
      await settingsService.fetchAndSaveSettings()
      steps[steps.length - 1].completed = true
      completedSteps++
      console.log('[DB] ✓ Business settings synced')
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
      console.error('[DB] ✗ Business settings sync failed:', error.message)
    }

    // Step 2: Fetch business configuration
    try {
      steps.push({ step: 'Business Config', completed: false })
      await configService.fetchAndSaveConfig()
      steps[steps.length - 1].completed = true
      completedSteps++
      console.log('[DB] ✓ Business config synced')
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
      console.error('[DB] ✗ Business config sync failed:', error.message)
    }

    // // Step 3: Fetch countries
    // try {
    //   steps.push({ step: 'Countries', completed: false })
    //   await countriesService.fetchAndSaveCountries()
    //   steps[steps.length - 1].completed = true
    //   completedSteps++
    //   console.log('[DB] ✓ Countries synced')
    // } catch (error: any) {
    //   steps[steps.length - 1].error = error.message
    //   console.error('[DB] ✗ Countries sync failed:', error.message)
    // }

    // Step 4: Fetch warehouses
    try {
      steps.push({ step: 'Warehouses', completed: false })
      await warehousesService.fetchAndSaveWarehouses()
      steps[steps.length - 1].completed = true
      completedSteps++
      console.log('[DB] ✓ Warehouses synced')
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
      console.error('[DB] ✗ Warehouses sync failed:', error.message)
    }

    // Step 5: Fetch product categories
    try {
      steps.push({ step: 'Product Categories', completed: false })
      await productCategoriesService.fetchAndSaveProductCategories()
      steps[steps.length - 1].completed = true
      completedSteps++
      console.log('[DB] ✓ Product categories synced')
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
      console.error('[DB] ✗ Product categories sync failed:', error.message)
    }

    // Step 6: Fetch payment methods
    try {
      steps.push({ step: 'Payment Methods', completed: false })
      await paymentMethodsService.fetchAndSavePaymentMethods()
      steps[steps.length - 1].completed = true
      completedSteps++
      console.log('[DB] ✓ Payment methods synced')
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
      console.error('[DB] ✗ Payment methods sync failed:', error.message)
    }

    // Step 7: Fetch units
    try {
      steps.push({ step: 'Units', completed: false })
      await unitsService.fetchAndSaveUnits()
      steps[steps.length - 1].completed = true
      completedSteps++
      console.log('[DB] ✓ Units synced')
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
      console.error('[DB] ✗ Units sync failed:', error.message)
    }

    // Step 8: Fetch products (this might take longer)
    try {
      steps.push({ step: 'Products', completed: false })
      // Check if product sync is already completed
      const existingProgress = productsService.getProductSyncProgress()
      if (existingProgress && existingProgress.is_completed) {
        // Use get-products-updated endpoint if sync is already completed
        console.log('[DB] Product sync already completed, fetching updated products...')
        await productsService.fetchUpdatedProducts()
        console.log('[DB] ✓ Updated products fetched')
      } else {
        // Perform full sync if not completed
        await productsService.syncProductsFromRemote()
        console.log('[DB] ✓ Products synced')
      }
      steps[steps.length - 1].completed = true
      completedSteps++
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
      console.error('[DB] ✗ Products sync failed:', error.message)
    }

    const success = completedSteps === totalSteps
    console.log(`[DB] Login sync completed: ${completedSteps}/${totalSteps} steps successful`)

    return {
      success,
      steps,
      totalSteps,
      completedSteps
    }
  } catch (error: any) {
    console.error('[DB] Login sync failed with unexpected error:', error.message)
    return {
      success: false,
      steps,
      totalSteps,
      completedSteps
    }
  }
}

/**
 * Quick sync for essential data only (faster than full sync)
 * Use this when you need just the basics to get the app running
 */
export async function performQuickLoginSync(): Promise<LoginSyncResult> {
  const steps: LoginSyncProgress[] = []
  let completedSteps = 0
  const totalSteps = 4

  console.log('[DB] Starting quick login sync...')

  try {
    // Essential: Business settings
    try {
      steps.push({ step: 'Business Settings', completed: false })
      await settingsService.fetchAndSaveSettings()
      steps[steps.length - 1].completed = true
      completedSteps++
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
    }

    // Essential: Business config
    try {
      steps.push({ step: 'Business Config', completed: false })
      await configService.fetchAndSaveConfig()
      steps[steps.length - 1].completed = true
      completedSteps++
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
    }

    // // Essential: Countries
    // try {
    //   steps.push({ step: 'Countries', completed: false })
    //   await countriesService.fetchAndSaveCountries()
    //   steps[steps.length - 1].completed = true
    //   completedSteps++
    // } catch (error: any) {
    //   steps[steps.length - 1].error = error.message
    // }

    // Essential: Warehouses
    try {
      steps.push({ step: 'Warehouses', completed: false })
      await warehousesService.fetchAndSaveWarehouses()
      steps[steps.length - 1].completed = true
      completedSteps++
    } catch (error: any) {
      steps[steps.length - 1].error = error.message
    }

    const success = completedSteps === totalSteps
    console.log(`[DB] Quick login sync completed: ${completedSteps}/${totalSteps} steps successful`)

    return {
      success,
      steps,
      totalSteps,
      completedSteps
    }
  } catch (error: any) {
    console.error('[DB] Quick login sync failed:', error.message)
    return {
      success: false,
      steps,
      totalSteps,
      completedSteps
    }
  }
}

/**
 * Check if all essential data is available locally
 * Returns true if the app can function without network calls
 */
export function isEssentialDataAvailable(): boolean {
  try {
    const settings = settingsService.getSettings()
    const config = configService.getConfig()
    // const countries = countriesService.getCountries()
    const warehouses = warehousesService.getWarehouses()

    return !!(settings && config && warehouses.length > 0)
  } catch {
    return false
  }
}
