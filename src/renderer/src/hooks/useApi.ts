import { useState, useCallback } from 'react'
import { api as axiosApi, ApiResponse, ApiError } from '@renderer/lib/axios'
import { getBaseUrl } from '@renderer/config/env'
import { useAuthStore } from '@renderer/store/auth'

/**
 * @deprecated This hook is deprecated. Use useUnifiedApi or useAxiosApi instead.
 * This hook will be removed in a future version.
 */
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
        // Use axios instead of fetch for better error handling and interceptors
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

        // Use axios for the request
        const response = await axiosApi.request({
          url,
          method: options.method as any || 'GET',
          headers,
          data: options.body ? JSON.parse(options.body as string) : undefined,
          ...options
        })

        const result: ApiResponse<T> = response

        apiOptions.onSuccess?.(result.data)
        return result
      } catch (err: any) {
        const apiError: ApiError = {
          message: err.message || 'Network error',
          status: err.status,
          code: err.code
        }
        setError(apiError)
        apiOptions.onError?.(apiError)
        throw apiError
      } finally {
        setLoading(false)
      }
    },
    [user?.token]
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
