import { useAxiosApi } from '@renderer/hooks/useAxiosApi'

export interface Settings {
  id: number
  key: string
  value: string
  description?: string
  created_at: string
  updated_at: string
}

export interface SettingsResponse {
  data: Settings[]
  message?: string
}

export const useSettingsService = () => {
  const api = useAxiosApi()

  const getSettings = async (): Promise<SettingsResponse> => {
    return await api.get<SettingsResponse['data']>('/settings')
  }

  const getSetting = async (key: string): Promise<Settings | null> => {
    try {
      const response = await api.get<Settings>(`/settings/${key}`)
      return response.data
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error)
      return null
    }
  }

  const updateSetting = async (key: string, value: string): Promise<Settings> => {
    const response = await api.put<Settings>(`/settings/${key}`, { value })
    return response.data
  }

  const createSetting = async (key: string, value: string, description?: string): Promise<Settings> => {
    const response = await api.post<Settings>('/settings', { key, value, description })
    return response.data
  }

  const deleteSetting = async (key: string): Promise<void> => {
    await api.delete(`/settings/${key}`)
  }

  return {
    getSettings,
    getSetting,
    updateSetting,
    createSetting,
    deleteSetting,
    loading: api.loading,
    error: api.error,
    clearError: api.clearError
  }
}