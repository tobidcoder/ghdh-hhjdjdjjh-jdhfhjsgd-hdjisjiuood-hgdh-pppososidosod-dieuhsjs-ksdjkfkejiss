import { create } from 'zustand'
import { getBaseUrl } from '@renderer/config/env'
import { useSettingsStore } from './settings'

export interface AuthUser {
  id: string
  username: string
  email: string | null
  name: string | null
  token: string | null
  raw_response: any
}

interface AuthState {
  user: AuthUser | null
  loginSource: 'local' | 'remote' | null
  isSubmitting: boolean
  error: string | null
  login: (payload: { email: string; password: string }) => Promise<void>
  logout: () => void
  clearError: () => void
  checkAndStartProductSync: () => Promise<void>
  fetchSettingsOnLogin: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loginSource: null,
  isSubmitting: false,
  error: null,
  login: async (payload) => {
    set({ isSubmitting: true, error: null })
    try {
      const result = await window.api.auth.login(payload)
      set({ user: result.user, loginSource: result.source, isSubmitting: false })
      
      // Fetch settings and start product sync after successful login
      console.log('[Auth] Login successful, starting post-login tasks...')
      try {
        await Promise.all([
          get().fetchSettingsOnLogin(),
          get().checkAndStartProductSync()
        ])
        console.log('[Auth] All post-login tasks completed successfully')
      } catch (error) {
        console.error('[Auth] Error in post-login tasks:', error)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      set({ error: errorMessage, isSubmitting: false })
    }
  },
  logout: () => set({ user: null, loginSource: null }),
  clearError: () => set({ error: null }),
  checkAndStartProductSync: async () => {
    const { user } = get()
    if (!user?.token) return

    try {
      const baseUrl = await getBaseUrl()
      if (!baseUrl) return

      // Check if product sync is needed
      const progress = await window.api.products.sync.progress()

      // If no progress exists or sync is not completed, start sync
      if (!progress || !progress.is_completed) {
        console.log('[Auth] Starting product sync after login...')
        await window.api.products.sync.start({ userToken: user.token })
      } else {
        console.log('[Auth] Product sync already completed')
      }
    } catch (error) {
      console.error('[Auth] Failed to start product sync:', error)
    }
  },

  fetchSettingsOnLogin: async () => {
    console.log('[Auth] fetchSettingsOnLogin called')
    const { user, loginSource } = get()
    console.log('[Auth] User:', user?.username, 'Login source:', loginSource, 'Has token:', !!user?.token)
    if (!user?.token) {
      console.log('[Auth] No user token, returning early')
      return
    }

    try {
      const baseUrl = await getBaseUrl()
      console.log('[Auth] Base URL:', baseUrl)
      
      // Always try to fetch fresh settings from API if we have a base URL and token
      if (baseUrl && user.token) {
        console.log('[Auth] Attempting to fetch fresh settings from API...')
        try {
          await useSettingsStore.getState().fetchSettingsFromAPI(baseUrl, user.token)
          console.log('[Auth] Settings and config fetched successfully from API')
        } catch (apiError) {
          console.log('[Auth] API fetch failed, falling back to local settings:', apiError)
                  // Fall back to local settings if API fetch fails
        await useSettingsStore.getState().fetchSettings()
        await useSettingsStore.getState().fetchConfig()
        await useSettingsStore.getState().fetchWarehouses()
        await useSettingsStore.getState().fetchProductCategories()
        await useSettingsStore.getState().fetchPaymentMethods()
        await useSettingsStore.getState().fetchUnits()
        }
      } else {
        // No base URL or token, just load local settings
        console.log('[Auth] Loading local settings (no API access)...')
        await useSettingsStore.getState().fetchSettings()
        await useSettingsStore.getState().fetchConfig()
        await useSettingsStore.getState().fetchWarehouses()
        await useSettingsStore.getState().fetchProductCategories()
        await useSettingsStore.getState().fetchPaymentMethods()
        await useSettingsStore.getState().fetchUnits()
      }

      // Also fetch countries, warehouses, product categories, payment methods, and units data
      await useSettingsStore.getState().fetchActiveCountries()
      await useSettingsStore.getState().fetchWarehouses()
      await useSettingsStore.getState().fetchProductCategories()
      await useSettingsStore.getState().fetchPaymentMethods()
      await useSettingsStore.getState().fetchUnits()
      
    } catch (error) {
      console.error('[Auth] Failed to fetch settings on login:', error)
      // Don't throw error - settings fetch failure shouldn't prevent login
      // Just load local settings as fallback
      try {
        await useSettingsStore.getState().fetchSettings()
        await useSettingsStore.getState().fetchConfig()
        await useSettingsStore.getState().fetchWarehouses()
        await useSettingsStore.getState().fetchProductCategories()
        await useSettingsStore.getState().fetchPaymentMethods()
        await useSettingsStore.getState().fetchUnits()
      } catch (fallbackError) {
        console.error('[Auth] Failed to load local settings as fallback:', fallbackError)
      }
    }
  }
}))
