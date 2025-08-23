import { useSettingsStore, PaymentMethod, Unit } from '@renderer/store/settings'
import { getBaseUrl } from '@renderer/config/env'

class SettingsService {
  // Initialize settings on app start
  async initialize(): Promise<void> {
    console.log('[SettingsService] Initializing settings...')
    try {
      await useSettingsStore.getState().fetchSettings()
      await useSettingsStore.getState().fetchActiveCountries()
      await useSettingsStore.getState().fetchConfig()
      await useSettingsStore.getState().fetchWarehouses()
      await useSettingsStore.getState().fetchProductCategories()
      await useSettingsStore.getState().fetchPaymentMethods()
      await useSettingsStore.getState().fetchUnits()
      console.log('[SettingsService] Settings, config, warehouses, product categories, payment methods, and units initialized from local database')
    } catch (error) {
      console.error('[SettingsService] Failed to initialize settings:', error)
    }
  }

  // Sync settings from remote API
  async syncFromRemote(userToken: string): Promise<void> {
    console.log('[SettingsService] Syncing settings from remote...')
    try {
      const baseUrl = await getBaseUrl()
      if (!baseUrl) {
        throw new Error('No base URL configured')
      }

      await useSettingsStore.getState().fetchSettingsFromAPI(baseUrl, userToken)
      await useSettingsStore.getState().fetchActiveCountries()
      console.log('[SettingsService] Settings synced successfully from remote')
    } catch (error) {
      console.error('[SettingsService] Failed to sync settings from remote:', error)
      throw error
    }
  }

  // Get current settings
  getSettings() {
    return useSettingsStore.getState().settings
  }

  // Get currency symbol
  getCurrencySymbol(): string {
    return useSettingsStore.getState().getCurrencySymbol()
  }

  // Get company information
  getCompanyInfo() {
    return useSettingsStore.getState().getCompanyInfo()
  }

  // Check if features are enabled
  isTaxEnabled(): boolean {
    return useSettingsStore.getState().getTaxEnabled()
  }

  isShippingEnabled(): boolean {
    return useSettingsStore.getState().getShippingEnabled()
  }

  isDiscountEnabled(): boolean {
    return useSettingsStore.getState().getDiscountEnabled()
  }

  // Get countries
  getCountries() {
    return useSettingsStore.getState().countries
  }

  getActiveCountries() {
    return useSettingsStore.getState().activeCountries
  }

  // Check if certain UI elements should be shown
  shouldShowPhone(): boolean {
    const settings = this.getSettings()
    return settings?.show_phone === '1'
  }

  shouldShowAddress(): boolean {
    const settings = this.getSettings()
    return settings?.show_address === '1'
  }

  shouldShowCustomer(): boolean {
    const settings = this.getSettings()
    return settings?.show_customer === '1'
  }

  shouldShowEmail(): boolean {
    const settings = this.getSettings()
    return settings?.show_email === '1'
  }

  shouldShowTaxDiscountShipping(): boolean {
    const settings = this.getSettings()
    return settings?.show_tax_discount_shipping === '1'
  }

  shouldShowBarcodeInReceipt(): boolean {
    const settings = this.getSettings()
    return settings?.show_barcode_in_receipt === '1'
  }

  shouldShowLogoInReceipt(): boolean {
    const settings = this.getSettings()
    return settings?.show_logo_in_receipt === '1'
  }

  // Cart protection settings
  isCartProductDeleteProtected(): boolean {
    const settings = this.getSettings()
    return settings?.protect_cart_product_delete === '1'
  }

  isCartProductReduceProtected(): boolean {
    const settings = this.getSettings()
    return settings?.protect_cart_product_reduce === '1'
  }

  // Get receipt note
  getReceiptNote(): string {
    const settings = this.getSettings()
    return settings?.show_note || 'Thank you for your order'
  }

  // Get default values
  getDefaultCustomer(): string {
    const settings = this.getSettings()
    return settings?.customer_name || 'walk-in-customer'
  }



  // Config methods
  getConfig() {
    return useSettingsStore.getState().config
  }

  getPermissions(): string[] {
    return useSettingsStore.getState().getPermissions()
  }

  hasPermission(permission: string): boolean {
    return useSettingsStore.getState().hasPermission(permission)
  }

  isCurrencyRight(): boolean {
    return useSettingsStore.getState().isCurrencyRight()
  }

  isOpenRegister(): boolean {
    return useSettingsStore.getState().isOpenRegister()
  }

  // Permission check helpers
  canManageProducts(): boolean {
    return this.hasPermission('manage_products')
  }

  canManageSales(): boolean {
    return this.hasPermission('manage_sale')
  }

  canManagePurchases(): boolean {
    return this.hasPermission('manage_purchase')
  }

  canManageUsers(): boolean {
    return this.hasPermission('manage_users')
  }

  canManageSettings(): boolean {
    return this.hasPermission('manage_setting')
  }

  canManageReports(): boolean {
    return this.hasPermission('manage_reports')
  }

  // Warehouse methods
  getWarehouses() {
    return useSettingsStore.getState().warehouses
  }

  getWarehouseById(id: number) {
    return useSettingsStore.getState().getWarehouseById(id)
  }

  getWarehouseByName(name: string) {
    return useSettingsStore.getState().getWarehouseByName(name)
  }

  getDefaultWarehouse() {
    return useSettingsStore.getState().getDefaultWarehouse()
  }

  // Warehouse helper methods
  getWarehouseAddress(warehouseId: number): string {
    const warehouse = this.getWarehouseById(warehouseId)
    if (!warehouse) return ''
    
    const parts = [warehouse.address, warehouse.city, warehouse.state, warehouse.country]
    return parts.filter(Boolean).join(', ')
  }

  getWarehouseContactInfo(warehouseId: number): { phone: string; email: string } {
    const warehouse = this.getWarehouseById(warehouseId)
    return {
      phone: warehouse?.phone || '',
      email: warehouse?.email || ''
    }
  }

  // Product Categories methods
  getProductCategories() {
    return useSettingsStore.getState().productCategories
  }

  getProductCategoryById(id: number) {
    return useSettingsStore.getState().getProductCategoryById(id)
  }

  getProductCategoryByName(name: string) {
    return useSettingsStore.getState().getProductCategoryByName(name)
  }

  getProductCategoriesWithProducts() {
    return useSettingsStore.getState().getProductCategoriesWithProducts()
  }

  searchProductCategories(searchTerm: string) {
    return useSettingsStore.getState().searchProductCategories(searchTerm)
  }

  // Product Categories helper methods
  getCategoryImage(categoryId: number): string[] {
    const category = this.getProductCategoryById(categoryId)
    if (!category?.image) return []
    
    try {
      return JSON.parse(category.image) as string[]
    } catch (error) {
      console.error('[SettingsService] Failed to parse category image:', error)
      return []
    }
  }

  getCategoriesByProductCount(minCount: number = 0): Array<{ id: number; name: string; count: number }> {
    const categories = this.getProductCategories()
    return categories
      .filter(category => category.products_count >= minCount)
      .map(category => ({
        id: category.id,
        name: category.name,
        count: category.products_count
      }))
      .sort((a, b) => b.count - a.count)
  }

  getPopularCategories(limit: number = 10): Array<{ id: number; name: string; count: number }> {
    return this.getCategoriesByProductCount(1).slice(0, limit)
  }

  // Payment Methods methods
  getPaymentMethods() {
    return useSettingsStore.getState().paymentMethods
  }

  getPaymentMethodById(id: number) {
    return useSettingsStore.getState().getPaymentMethodById(id)
  }

  getPaymentMethodByName(name: string) {
    return useSettingsStore.getState().getPaymentMethodByName(name)
  }

  getActivePaymentMethods() {
    return useSettingsStore.getState().getActivePaymentMethods()
  }

  getAllPaymentMethods() {
    return useSettingsStore.getState().paymentMethods
  }

  getPaymentMethodsByBusinessProfile(businessProfileId: number) {
    return useSettingsStore.getState().getPaymentMethodsByBusinessProfile(businessProfileId)
  }

  // Payment Methods helper methods
  getCashPaymentMethod(): PaymentMethod | null {
    return this.getPaymentMethodByName('Cash')
  }

  getPOSPaymentMethods(): PaymentMethod[] {
    const posMethods = this.getActivePaymentMethods()
    return posMethods.filter(method => 
      method.name.toLowerCase().includes('pos') || 
      method.display_name.toLowerCase().includes('pos')
    )
  }

  getDefaultPaymentMethods(): PaymentMethod[] {
    const cash = this.getCashPaymentMethod()
    const posMethods = this.getPOSPaymentMethods()
    
    const methods: PaymentMethod[] = []
    if (cash) methods.push(cash)
    methods.push(...posMethods)
    
    return methods
  }

  isPaymentMethodActive(methodId: number): boolean {
    const method = this.getPaymentMethodById(methodId)
    return method?.active || false
  }

  getPaymentMethodDisplayName(methodId: number): string {
    const method = this.getPaymentMethodById(methodId)
    return method?.display_name || 'Unknown Payment Method'
  }

  // Units methods
  getUnits() {
    return useSettingsStore.getState().units
  }

  getUnitById(id: number) {
    return useSettingsStore.getState().getUnitById(id)
  }

  getUnitByName(name: string) {
    return useSettingsStore.getState().getUnitByName(name)
  }

  getUnitByShortName(shortName: string) {
    return useSettingsStore.getState().getUnitByShortName(shortName)
  }

  getDefaultUnits() {
    return useSettingsStore.getState().getDefaultUnits()
  }

  getUnitsByBusinessProfile(businessProfileId: number) {
    return useSettingsStore.getState().getUnitsByBusinessProfile(businessProfileId)
  }

  getBaseUnits() {
    return useSettingsStore.getState().getBaseUnits()
  }

  getUnitsByBaseUnit(baseUnitId: number) {
    return useSettingsStore.getState().getUnitsByBaseUnit(baseUnitId)
  }

  // Units helper methods
  getCommonUnits(): Unit[] {
    const commonUnitNames = ['piece', 'kilogram', 'meter', 'liter', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year']
    return this.getUnits().filter(unit => 
      commonUnitNames.some(name => unit.name.toLowerCase().includes(name))
    )
  }

  getMetricUnits(): Unit[] {
    const metricUnitNames = ['meter', 'kilogram', 'second', 'ampere', 'kelvin', 'mole', 'candela', 'liter', 'gram']
    return this.getUnits().filter(unit => 
      metricUnitNames.some(name => unit.name.toLowerCase().includes(name))
    )
  }

  getTimeUnits(): Unit[] {
    const timeUnitNames = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year']
    return this.getUnits().filter(unit => 
      timeUnitNames.some(name => unit.name.toLowerCase().includes(name))
    )
  }

  getWeightUnits(): Unit[] {
    const weightUnitNames = ['kilogram', 'gram', 'pound', 'ounce', 'ton']
    return this.getUnits().filter(unit => 
      weightUnitNames.some(name => unit.name.toLowerCase().includes(name))
    )
  }

  getLengthUnits(): Unit[] {
    const lengthUnitNames = ['meter', 'centimeter', 'kilometer', 'mile', 'inch', 'foot', 'yard']
    return this.getUnits().filter(unit => 
      lengthUnitNames.some(name => unit.name.toLowerCase().includes(name))
    )
  }

  getVolumeUnits(): Unit[] {
    const volumeUnitNames = ['liter', 'milliliter', 'cubic meter', 'gallon', 'pint', 'quart']
    return this.getUnits().filter(unit => 
      volumeUnitNames.some(name => unit.name.toLowerCase().includes(name))
    )
  }

  getUnitDisplayName(unitId: number): string {
    const unit = this.getUnitById(unitId)
    if (!unit) return 'Unknown Unit'
    
    // Return short name if available, otherwise full name
    return unit.short_name || unit.name
  }

  getUnitFullName(unitId: number): string {
    const unit = this.getUnitById(unitId)
    return unit?.name || 'Unknown Unit'
  }

  isBaseUnit(unitId: number): boolean {
    const unit = this.getUnitById(unitId)
    return unit ? unit.base_unit === unit.id : false
  }

  getRelatedUnits(unitId: number): Unit[] {
    const unit = this.getUnitById(unitId)
    if (!unit) return []
    
    return this.getUnitsByBaseUnit(unit.base_unit)
  }
}

// Export a singleton instance
const settingsService = new SettingsService()
export default settingsService
