import { useAxiosApi } from '@renderer/hooks/useAxiosApi'
import { setAuthToken } from '@renderer/lib/axios'

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
  const api = useAxiosApi()

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse['data']>('/login', credentials)
    
    // Store the token for future requests
    if (response.data?.token) {
      setAuthToken(response.data.token)
    }
    
    return response as LoginResponse
  }

  const logout = () => {
    setAuthToken(null)
  }

  return {
    login,
    logout,
    loading: api.loading,
    error: api.error,
    clearError: api.clearError
  }
}
