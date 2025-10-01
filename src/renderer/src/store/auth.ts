import { create } from 'zustand'
import { getBaseUrl } from '@renderer/config/env'
import {
  saveUserToStorage,
  getUserFromStorage,
  removeUserFromStorage,
  saveSettingsToStorage,
  removeSettingsFromStorage
} from '@renderer/utils/localStorage'

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
  syncProgress: {
    isSyncing: boolean
    currentStep: string
    completedSteps: number
    totalSteps: number
  } | null
  login: (payload: { email: string; password: string }) => Promise<void>
  logout: () => void
  clearError: () => void
  checkAndStartProductSync: () => Promise<void>
  fetchSettingsOnLogin: () => Promise<void>
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loginSource: null,
  isSubmitting: false,
  error: null,
  syncProgress: null,
  login: async (payload) => {
    set({ isSubmitting: true, error: null })
    try {
      const result = await window.api.auth.login(payload)
      set({ user: result.user, loginSource: result.source, isSubmitting: false })

      // Save user data to local storage
      saveUserToStorage(result.user)
      try {
        const settings = await window.api.db.getSettings()
        if (settings) {
          saveSettingsToStorage(settings)
          console.log('[Auth] Settings cached to localStorage')
        }
      } catch (error) {
        console.error('[Auth] Failed to cache settings to localStorage:', error)
      }
      // Fetch settings and start product sync after successful login
      console.log('[Auth] Login successful, starting post-login tasks...')
      try {
        if (navigator.onLine) {
          await Promise.all([get().fetchSettingsOnLogin(), get().checkAndStartProductSync()])
          console.log('[Auth] All post-login tasks completed successfully')
        } else {
          console.log('[Auth] Skipping post-login sync tasks - no internet connection')
        }
      } catch (error) {
        console.error('[Auth] Error in post-login tasks:', error)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      set({ error: errorMessage, isSubmitting: false })
    }
  },

  logout: () => {
    // Clear user data from state and local storage
    set({ user: null, loginSource: null, error: null, syncProgress: null })
    removeUserFromStorage()
    removeSettingsFromStorage() // Clear cached settings on logout
    console.log('[Auth] User logged out and data cleared')
    // Navigate to login page after logout
    window.location.href = '/'
  },
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
        await window.api.products.sync.start()
      } else {
        console.log('[Auth] Product sync already completed')
      }
    } catch (error) {
      console.error('[Auth] Failed to start product sync:', error)
    }
  },

  // Fetch all essential data on login using comprehensive sync
  fetchSettingsOnLogin: async () => {
    try {
      console.log('[Auth] Starting comprehensive login sync...')

      // Set initial sync progress
      set({
        syncProgress: {
          isSyncing: true,
          currentStep: 'Starting sync...',
          completedSteps: 0,
          totalSteps: 8
        }
      })

      // Use the comprehensive login sync that fetches all GET endpoints
      const result = await window.api.loginSync.perform()

      if (result.success) {
        console.log(
          '[Auth] All data synced successfully:',
          result.completedSteps,
          '/',
          result.totalSteps,
          'steps completed'
        )

        // Cache settings to localStorage after successful sync
        try {
          const settings = await window.api.db.getSettings()
          if (settings) {
            saveSettingsToStorage(settings)
            console.log('[Auth] Settings cached to localStorage')
          }
        } catch (error) {
          console.error('[Auth] Failed to cache settings to localStorage:', error)
        }

        set({
          syncProgress: {
            isSyncing: false,
            currentStep: 'Sync completed',
            completedSteps: result.completedSteps,
            totalSteps: result.totalSteps
          }
        })
      } else {
        console.warn(
          '[Auth] Login sync completed with some failures:',
          result.steps.filter((s) => s.error)
        )
        set({
          syncProgress: {
            isSyncing: false,
            currentStep: 'Sync completed with errors',
            completedSteps: result.completedSteps,
            totalSteps: result.totalSteps
          }
        })
      }

      console.log('[Auth] Initial data sync completed')
    } catch (error) {
      console.error('[Auth] Initial data sync failed:', error)
      set({
        syncProgress: {
          isSyncing: false,
          currentStep: 'Sync failed',
          completedSteps: 0,
          totalSteps: 8
        }
      })
    }
  },

  initializeAuth: () => {
    // Load user data from local storage on app initialization
    const storedUser = getUserFromStorage()
    if (storedUser) {
      set({ user: storedUser, loginSource: 'local' })
      console.log('[Auth] User data loaded from local storage')
    }
  }
}))
