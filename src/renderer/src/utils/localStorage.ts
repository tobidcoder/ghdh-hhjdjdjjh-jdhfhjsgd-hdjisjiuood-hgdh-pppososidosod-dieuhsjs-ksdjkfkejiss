import { AuthUser } from '@renderer/store/auth'
import { Settings } from '@renderer/store/settings'

const USER_STORAGE_KEY = 'cheetah_auth_user'
const SETTINGS_STORAGE_KEY = 'cheetah_settings'

/**
 * Save user data to local storage
 */
export const saveUserToStorage = (user: AuthUser): void => {
  try {
    const userData = JSON.stringify(user)
    localStorage.setItem(USER_STORAGE_KEY, userData)
    console.log('[LocalStorage] User data saved to local storage')
  } catch (error) {
    console.error('[LocalStorage] Failed to save user data to local storage:', error)
  }
}

/**
 * Get user data from local storage
 */
export const getUserFromStorage = (): AuthUser | null => {
  try {
    const userData = localStorage.getItem(USER_STORAGE_KEY)
    if (!userData) {
      return null
    }

    const user = JSON.parse(userData) as AuthUser
    console.log('[LocalStorage] User data loaded from local storage')
    return user
  } catch (error) {
    console.error('[LocalStorage] Failed to load user data from local storage:', error)
    return null
  }
}

/**
 * Remove user data from local storage
 */
export const removeUserFromStorage = (): void => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY)
    console.log('[LocalStorage] User data removed from local storage')
  } catch (error) {
    console.error('[LocalStorage] Failed to remove user data from local storage:', error)
  }
}

/**
 * Check if user data exists in local storage
 */
export const hasUserInStorage = (): boolean => {
  try {
    return localStorage.getItem(USER_STORAGE_KEY) !== null
  } catch (error) {
    console.error('[LocalStorage] Failed to check user data in local storage:', error)
    return false
  }
}

/**
 * Save settings data to local storage
 */
export const saveSettingsToStorage = (settings: Settings): void => {
  try {
    console.log('hjhdgiugisdu677', settings)
    const settingsData = JSON.stringify(settings)
    localStorage.setItem(SETTINGS_STORAGE_KEY, settingsData)
    console.log('[LocalStorage] Settings data saved to local storage')
  } catch (error) {
    console.error('[LocalStorage] Failed to save settings data to local storage:', error)
  }
}

/**
 * Get settings data from local storage
 */
export const getSettingsFromStorage = (): Settings | null => {
  try {
    const settingsData = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!settingsData) {
      return null
    }

    const settings = JSON.parse(settingsData) as Settings
    console.log('[LocalStorage] Settings data loaded from local storage')
    return settings
  } catch (error) {
    console.error('[LocalStorage] Failed to load settings data from local storage:', error)
    return null
  }
}

/**
 * Remove settings data from local storage
 */
export const removeSettingsFromStorage = (): void => {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
    console.log('[LocalStorage] Settings data removed from local storage')
  } catch (error) {
    console.error('[LocalStorage] Failed to remove settings data from local storage:', error)
  }
}

/**
 * Check if settings data exists in local storage
 */
export const hasSettingsInStorage = (): boolean => {
  try {
    return localStorage.getItem(SETTINGS_STORAGE_KEY) !== null
  } catch (error) {
    console.error('[LocalStorage] Failed to check settings data in local storage:', error)
    return false
  }
}
