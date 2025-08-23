import { useApi } from '@renderer/hooks/useApi'

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  data: {
    token: string
    new_token: {
      access_token: string
      token_type: string
      expires_at: string
    }
    user: {
      id: number
      email: string
      first_name: string
      last_name: string
      username: string | null
      [key: string]: any
    }
  }
  message: string
}

export const useAuthService = () => {
  const api = useApi()

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse['data']>('/login', credentials)
    return response as LoginResponse
  }

  return {
    login,
    loading: api.loading,
    error: api.error,
    clearError: api.clearError
  }
}
