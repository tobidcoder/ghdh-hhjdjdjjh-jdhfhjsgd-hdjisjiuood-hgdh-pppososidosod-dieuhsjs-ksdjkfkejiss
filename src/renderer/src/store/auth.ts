import { create } from 'zustand'
import { getBaseUrl } from '@renderer/config/env'

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
      // Check and start product sync after successful login
      await get().checkAndStartProductSync()
    } catch (err: any) {
      set({ error: err?.message ?? 'Login failed', isSubmitting: false })
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
        await window.api.products.sync.start({ baseUrl, userToken: user.token })
      } else {
        console.log('[Auth] Product sync already completed')
      }
    } catch (error) {
      console.error('[Auth] Failed to start product sync:', error)
    }
  }
}))


