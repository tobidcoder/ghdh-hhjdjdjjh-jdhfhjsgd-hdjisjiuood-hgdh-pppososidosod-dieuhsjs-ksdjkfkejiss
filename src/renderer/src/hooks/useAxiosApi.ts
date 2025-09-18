import { useState, useCallback } from 'react'
import { api, ApiResponse, ApiError } from '@renderer/lib/axios'

interface UseAxiosApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: ApiError) => void
}

export const useAxiosApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const request = useCallback(
    async <T = any>(
      method: 'get' | 'post' | 'put' | 'delete' | 'patch',
      endpoint: string,
      data?: any,
      options?: UseAxiosApiOptions
    ): Promise<ApiResponse<T>> => {
      setLoading(true)
      setError(null)

      try {
        const response = await api[method]<T>(endpoint, data)
        options?.onSuccess?.(response.data)
        return response
      } catch (err: any) {
        const apiError: ApiError = {
          message: err.message || 'Network error',
          status: err.status,
          code: err.code
        }
        setError(apiError)
        options?.onError?.(apiError)
        throw apiError
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const get = useCallback(
    <T = any>(endpoint: string, options?: UseAxiosApiOptions) => {
      return request<T>('get', endpoint, undefined, options)
    },
    [request]
  )

  const post = useCallback(
    <T = any>(endpoint: string, body?: any, options?: UseAxiosApiOptions) => {
      return request<T>('post', endpoint, body, options)
    },
    [request]
  )

  const put = useCallback(
    <T = any>(endpoint: string, body?: any, options?: UseAxiosApiOptions) => {
      return request<T>('put', endpoint, body, options)
    },
    [request]
  )

  const del = useCallback(
    <T = any>(endpoint: string, options?: UseAxiosApiOptions) => {
      return request<T>('delete', endpoint, undefined, options)
    },
    [request]
  )

  const patch = useCallback(
    <T = any>(endpoint: string, body?: any, options?: UseAxiosApiOptions) => {
      return request<T>('patch', endpoint, body, options)
    },
    [request]
  )

  return {
    request,
    get,
    post,
    put,
    delete: del,
    patch,
    loading,
    error,
    clearError: () => setError(null)
  }
}

