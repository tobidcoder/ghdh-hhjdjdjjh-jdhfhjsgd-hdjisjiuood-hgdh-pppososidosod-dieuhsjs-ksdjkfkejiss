import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { getBaseUrl } from '@renderer/config/env'

// API Response interface
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success?: boolean
}

// API Error interface
export interface ApiError {
  message: string
  status?: number
  code?: string
}

// Create axios instance
let axiosInstance: AxiosInstance | null = null

// Initialize axios instance
export const initializeAxios = async (): Promise<AxiosInstance> => {
  if (axiosInstance) {
    return axiosInstance
  }

  const baseURL = await getBaseUrl()
  
  axiosInstance = axios.create({
    baseURL,
    timeout: 30000, // 30 seconds timeout
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor
  axiosInstance.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = getAuthToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      console.log(`[Axios] ${config.method?.toUpperCase()} ${config.url}`)
      return config
    },
    (error) => {
      console.error('[Axios] Request error:', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log(`[Axios] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`)
      return response
    },
    (error: AxiosError) => {
      console.error('[Axios] Response error:', error)
      
      // Transform axios error to our ApiError format
      const apiError: ApiError = {
        message: error.response?.data?.message || error.message || 'Network error',
        status: error.response?.status,
        code: error.code
      }
      
      return Promise.reject(apiError)
    }
  )

  return axiosInstance
}

// Helper function to get auth token from localStorage or store
const getAuthToken = (): string | null => {
  try {
    // Try to get from localStorage first
    const token = localStorage.getItem('auth_token')
    if (token) return token

    // Fallback to checking if we can access the auth store
    // This is a bit of a hack but necessary for the interceptor
    if (typeof window !== 'undefined' && (window as any).__authStore) {
      const authStore = (window as any).__authStore
      return authStore.getState()?.user?.token || null
    }

    return null
  } catch {
    return null
  }
}

// Set auth token
export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

// Get the axios instance
export const getAxiosInstance = async (): Promise<AxiosInstance> => {
  return await initializeAxios()
}

// API methods using axios
export const api = {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const instance = await getAxiosInstance()
    const response = await instance.get<ApiResponse<T>>(url, config)
    return response.data
  },

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const instance = await getAxiosInstance()
    const response = await instance.post<ApiResponse<T>>(url, data, config)
    return response.data
  },

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const instance = await getAxiosInstance()
    const response = await instance.put<ApiResponse<T>>(url, data, config)
    return response.data
  },

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const instance = await getAxiosInstance()
    const response = await instance.delete<ApiResponse<T>>(url, config)
    return response.data
  },

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const instance = await getAxiosInstance()
    const response = await instance.patch<ApiResponse<T>>(url, data, config)
    return response.data
  }
}

export default api

