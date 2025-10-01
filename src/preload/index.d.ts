import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      db: {
        listProducts: (
          category?: string | number,
          limit?: number
        ) => Promise<
          Array<{
            id: string
            name: string
            price: number
            category: string
            code: string | null
            raw_response: string | null
          }>
        >
        searchProductByCode: (code: string) => Promise<{
          id: string
          name: string
          price: number
          category: string
          code: string | null
          raw_response: string | null
        } | null>
        searchProducts: (
          query: string,
          limit?: number
        ) => Promise<
          Array<{
            id: string
            name: string
            price: number
            category: string
            code: string | null
            raw_response: string | null
          }>
        >
        upsertManyProducts: (
          products: Array<{
            id: string
            name: string
            price: number
            category: string
            code: string | null
            raw_response: string | null
          }>
        ) => Promise<{ success: boolean }>
        getPath: () => Promise<string>
        // Sales API
        createSale: (sale: any) => Promise<any>
        getPendingSales: () => Promise<Array<any>>
        getUnsyncedSalesCount: () => Promise<number>
        updateSaleSyncStatus: (
          saleId: string,
          status: string,
          error?: string
        ) => Promise<{ success: boolean }>
        deleteSyncedSale: (saleId: string) => Promise<{ success: boolean }>
        getSalesByDateRange: (startDate: string, endDate: string) => Promise<Array<any>>
        syncSales: () => Promise<{ success: boolean; error?: string }>
        // Settings API
        getSettings: () => Promise<{
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
        } | null>
        getFrontSettings: () => Promise<{
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
          roles: string | null
          connected_accounts: string | null
          created_at: string
          updated_at: string
        } | null>
        fetchSettings: () => Promise<void>
        getCountries: () => Promise<
          Array<{
            id: number
            name: string
            short_code: string
            phone_code: number
            active: number
            logo_url: string | null
            created_at: string
            updated_at: string
          }>
        >
        getActiveCountries: () => Promise<
          Array<{
            id: number
            name: string
            short_code: string
            phone_code: number
            active: number
            logo_url: string | null
            created_at: string
            updated_at: string
          }>
        >
        // Config API
        getConfig: () => Promise<{
          id: string
          permissions: string
          is_currency_right: string
          open_register: boolean
          created_at: string
          updated_at: string
        } | null>
        getPermissions: () => Promise<Array<string>>
        hasPermission: (permission: string) => Promise<boolean>
        isCurrencyRight: () => Promise<boolean>
        isOpenRegister: () => Promise<boolean>
        // Warehouse API
        getWarehouses: () => Promise<
          Array<{
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
          }>
        >
        getWarehouseById: (id: number) => Promise<{
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
        } | null>
        getWarehouseByName: (name: string) => Promise<{
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
        } | null>
        getDefaultWarehouse: () => Promise<{
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
        } | null>
        // Product Categories API
        getProductCategories: () => Promise<
          Array<{
            id: number
            name: string
            image: string | null
            products_count: number
            created_at: string
            updated_at: string
          }>
        >
        getProductCategoryById: (id: number) => Promise<{
          id: number
          name: string
          image: string | null
          products_count: number
          created_at: string
          updated_at: string
        } | null>
        getProductCategoryByName: (name: string) => Promise<{
          id: number
          name: string
          image: string | null
          products_count: number
          created_at: string
          updated_at: string
        } | null>
        getProductCategoriesWithProducts: () => Promise<
          Array<{
            id: number
            name: string
            image: string | null
            products_count: number
            created_at: string
            updated_at: string
          }>
        >
        searchProductCategories: (searchTerm: string) => Promise<
          Array<{
            id: number
            name: string
            image: string | null
            products_count: number
            created_at: string
            updated_at: string
          }>
        >
        // Payment Methods API
        getPaymentMethods: () => Promise<
          Array<{
            id: number
            name: string
            display_name: string
            is_active: string
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        getAllPaymentMethods: () => Promise<
          Array<{
            id: number
            name: string
            display_name: string
            is_active: boolean
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        getPaymentMethodById: (id: number) => Promise<{
          id: number
          name: string
          display_name: string
          is_active: boolean
          business_profile_id: number
          user_id: number
          created_at: string
          updated_at: string
        } | null>
        getPaymentMethodByName: (name: string) => Promise<{
          id: number
          name: string
          display_name: string
          is_active: boolean
          business_profile_id: number
          user_id: number
          created_at: string
          updated_at: string
        } | null>
        getActivePaymentMethods: () => Promise<
          Array<{
            id: number
            name: string
            display_name: string
            is_active: boolean
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        getPaymentMethodsByBusinessProfile: (businessProfileId: number) => Promise<
          Array<{
            id: number
            name: string
            display_name: string
            is_active: boolean
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        // Units API
        getUnits: () => Promise<
          Array<{
            id: number
            name: string
            short_name: string
            base_unit: number
            is_default: boolean
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        getUnitById: (id: number) => Promise<{
          id: number
          name: string
          short_name: string
          base_unit: number
          is_default: boolean
          business_profile_id: number
          user_id: number
          created_at: string
          updated_at: string
        } | null>
        getUnitByName: (name: string) => Promise<{
          id: number
          name: string
          short_name: string
          base_unit: number
          is_default: boolean
          business_profile_id: number
          user_id: number
          created_at: string
          updated_at: string
        } | null>
        getUnitByShortName: (shortName: string) => Promise<{
          id: number
          name: string
          short_name: string
          base_unit: number
          is_default: boolean
          business_profile_id: number
          user_id: number
          created_at: string
          updated_at: string
        } | null>
        getDefaultUnits: () => Promise<
          Array<{
            id: number
            name: string
            short_name: string
            base_unit: number
            is_default: boolean
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        getUnitsByBusinessProfile: (businessProfileId: number) => Promise<
          Array<{
            id: number
            name: string
            short_name: string
            base_unit: number
            is_default: boolean
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        getBaseUnits: () => Promise<
          Array<{
            id: number
            name: string
            short_name: string
            base_unit: number
            is_default: boolean
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        getUnitsByBaseUnit: (baseUnitId: number) => Promise<
          Array<{
            id: number
            name: string
            short_name: string
            base_unit: number
            is_default: boolean
            business_profile_id: number
            user_id: number
            created_at: string
            updated_at: string
          }>
        >
        // Hold API
        saveHold: (hold: any) => Promise<{ success: boolean; id?: string }>
        getHolds: () => Promise<Array<any>>
        getHoldById: (id: string) => Promise<any>
        deleteHold: (id: string) => Promise<{ success: boolean }>
      }
      auth: {
        login: (payload: { email: string; password: string }) => Promise<{
          user: {
            id: string
            username: string
            email: string | null
            name: string | null
            token: string | null
            raw_response: any
          }
          source: 'local' | 'remote'
        }>
        seedFromResponse: (payload: { response: any; password: string }) => Promise<{
          user: {
            id: string
            username: string
            email: string | null
            name: string | null
            token: string | null
            raw_response: any
          }
        }>
        getRawResponse: (emailOrUsername: string) => Promise<any>
      }
      products: {
        sync: {
          start: () => Promise<{ success: boolean; error?: string }>
          progress: () => Promise<{
            id: string
            current_page: number
            last_page: number
            is_completed: boolean
            last_sync_at: string
            total_products: number
          } | null>
          reset: () => Promise<{ success: boolean }>
        }
      }
      loginSync: {
        perform: () => Promise<{
          success: boolean
          steps: Array<{
            step: string
            completed: boolean
            error?: string
          }>
          totalSteps: number
          completedSteps: number
        }>
        performQuick: () => Promise<{
          success: boolean
          steps: Array<{
            step: string
            completed: boolean
            error?: string
          }>
          totalSteps: number
          completedSteps: number
        }>
        isEssentialDataAvailable: () => Promise<boolean>
      }
      env: {
        get: (key: string) => Promise<string>
        list: () => Promise<Record<string, string | undefined>>
      }
      print: {
        receipt: (
          htmlContent: string,
          options?: { silent?: boolean; deviceName?: string }
        ) => Promise<{ success: boolean; data?: any; error?: string }>
        openPreview: (htmlContent: string) => Promise<{ success: boolean }>
        current: (
          options?: { silent?: boolean; deviceName?: string }
        ) => Promise<{ success: boolean; data?: any; error?: string }>
      }
    }
  }
}
