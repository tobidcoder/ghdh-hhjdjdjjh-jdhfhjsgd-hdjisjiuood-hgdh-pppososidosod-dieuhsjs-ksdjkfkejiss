import { useState, useCallback } from 'react'
import { getBaseUrl } from '@renderer/config/env'
import { useAuthStore } from '@renderer/store/auth'

interface ApiResponse<T = any> {
  data: T
  message?: string
  success?: boolean
}

interface ApiError {
  message: string
  status?: number
}

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: ApiError) => void
}

export const useApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const { user } = useAuthStore()

  const request = useCallback(
    async <T = any>(
      endpoint: string,
      options: RequestInit = {},
      apiOptions: UseApiOptions = {}
    ): Promise<ApiResponse<T>> => {
      setLoading(true)
      setError(null)

      try {
        // Get base URL from environment or use a default
        const baseUrl = await getBaseUrl()
        const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>)
        }

        // Add authorization header if user is logged in and has a token
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`
        }

        const response = await fetch(url, {
          headers,
          ...options
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          const apiError: ApiError = {
            message: errorText,
            status: response.status
          }
          setError(apiError)
          apiOptions.onError?.(apiError)
          throw apiError
        }

        const data = await response.json()
        const result: ApiResponse<T> = data

        apiOptions.onSuccess?.(data)
        return result
      } catch (err: any) {
        const apiError: ApiError = {
          message: err.message || 'Network error',
          status: err.status
        }
        setError(apiError)
        apiOptions.onError?.(apiError)
        throw apiError
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const get = useCallback(
    <T = any>(endpoint: string, options?: UseApiOptions) => {
      return request<T>(endpoint, { method: 'GET' }, options)
    },
    [request]
  )

  const post = useCallback(
    <T = any>(endpoint: string, body?: any, options?: UseApiOptions) => {
      return request<T>(
        endpoint,
        {
          method: 'POST',
          body: body ? JSON.stringify(body) : undefined
        },
        options
      )
    },
    [request]
  )

  const put = useCallback(
    <T = any>(endpoint: string, body?: any, options?: UseApiOptions) => {
      return request<T>(
        endpoint,
        {
          method: 'PUT',
          body: body ? JSON.stringify(body) : undefined
        },
        options
      )
    },
    [request]
  )

  const del = useCallback(
    <T = any>(endpoint: string, options?: UseApiOptions) => {
      return request<T>(endpoint, { method: 'DELETE' }, options)
    },
    [request]
  )

  return {
    request,
    get,
    post,
    put,
    delete: del,
    loading,
    error,
    clearError: () => setError(null)
  }
}
