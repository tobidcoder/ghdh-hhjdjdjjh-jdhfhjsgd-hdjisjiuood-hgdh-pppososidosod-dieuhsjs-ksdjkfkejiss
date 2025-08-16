// Environment configuration for the renderer process
export const config = {
  // API Configuration
  BASE_URL: 'http://localhost:8000/api', // Default, will be overridden by getBaseUrl()
  
  // App Configuration
  APP_NAME: 'Cheetah Front Desk',
  APP_VERSION: '1.0.0',
  
  // Feature Flags
  ENABLE_OFFLINE_MODE: true,
  ENABLE_REMOTE_SYNC: true,
}

// Helper function to get environment variable from main process
export const getEnvVar = async (key: string, defaultValue?: string): Promise<string> => {
  try {
    const value = await window.api.env.get(key)
    return value || defaultValue || ''
  } catch {
    return defaultValue || ''
  }
}

// Helper function to get BASE_URL from environment
export const getBaseUrl = async (): Promise<string> => {
  const baseUrl = await getEnvVar('BASE_URL')
  return baseUrl || 'http://localhost:8000/api'
}

// Helper function to check if we're in development
export const isDevelopment = import.meta.env?.DEV === true

// Helper function to check if we're in production
export const isProduction = import.meta.env?.PROD === true
