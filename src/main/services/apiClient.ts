import { getBaseUrl } from '../database/connection'
import { requireCurrentUserToken } from './auth'

export interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  message?: string
  error?: string
  // Support for different response structures
  attributes?: T
  user?: T
  token?: string
  [key: string]: any
}

export interface ApiError {
  message: string
  status?: number
  code?: string
}

/**
 * Flexible API client that can handle different response structures
 * and gracefully fallback when data doesn't match expected format
 */
export class FlexibleApiClient {
  private baseUrl: string
  private userToken: string | null = null

  constructor() {
    this.baseUrl = getBaseUrl()
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.userToken) {
      try {
        this.userToken = requireCurrentUserToken()
      } catch (error) {
        console.warn('[API] No user token available, making unauthenticated request')
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    if (this.userToken) {
      headers['Authorization'] = `Bearer ${this.userToken}`
    }

    return headers
  }

  /**
   * Make a GET request to the API
   */
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    const headers = await this.getAuthHeaders()

    console.log(`[API] GET ${url}`)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[API] Response from ${endpoint}:`, data)

      return this.normalizeResponse(data)
    } catch (error: any) {
      console.error(`[API] GET ${endpoint} failed:`, error.message)
      throw error
    }
  }

  /**
   * Make a POST request to the API
   */
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    const headers = await this.getAuthHeaders()

    console.log(`[API] POST ${url}`, body)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[API] Response from ${endpoint}:`, data)

      return this.normalizeResponse(data)
    } catch (error: any) {
      console.error(`[API] POST ${endpoint} failed:`, error.message)
      throw error
    }
  }

  /**
   * Normalize different API response structures into a consistent format
   */
  private normalizeResponse<T = any>(response: any): ApiResponse<T> {
    // Handle different response structures
    if (response.success !== undefined) {
      return {
        success: response.success,
        data: response.data,
        message: response.message,
        error: response.error,
        ...response
      }
    }

    // Handle Laravel-style responses
    if (response.data) {
      return {
        success: true,
        data: response.data,
        message: response.message,
        ...response
      }
    }

    // Handle direct data responses
    if (response.attributes || response.user || response.token) {
      return {
        success: true,
        data: response,
        ...response
      }
    }

    // Handle array responses
    if (Array.isArray(response)) {
      return {
        success: true,
        data: response as unknown as T,
        ...response
      }
    }

    // Handle object responses
    if (typeof response === 'object' && response !== null) {
      return {
        success: true,
        data: response,
        ...response
      }
    }

    // Fallback for any other response type
    return {
      success: true,
      data: response,
      ...response
    }
  }

  /**
   * Extract data from normalized response, trying multiple possible paths
   */
  extractData<T = any>(response: ApiResponse, ...paths: string[]): T | null {
    if (!response) return null

    // Try direct data first
    if (response.data) {
      return response.data as T
    }

    // Try different paths
    for (const path of paths) {
      const value = this.getNestedValue(response, path)
      if (value !== undefined && value !== null) {
        return value as T
      }
    }

    // Try common attribute paths
    const commonPaths = [
      'data.attributes',
      'data.data',
      'attributes',
      'user',
      'data.user',
      'data.data.attributes'
    ]

    for (const path of commonPaths) {
      const value = this.getNestedValue(response, path)
      if (value !== undefined && value !== null) {
        return value as T
      }
    }

    return null
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  /**
   * Extract array data from response, trying multiple possible paths
   */
  extractArrayData<T = any>(response: ApiResponse, ...paths: string[]): T[] {
    const data = this.extractData(response, ...paths)

    if (Array.isArray(data)) {
      return data
    }

    if (data && typeof data === 'object') {
      // Try to find array properties
      const arrayProps = Object.values(data).filter(Array.isArray)
      if (arrayProps.length > 0) {
        return arrayProps[0] as T[]
      }
    }

    return []
  }

  /**
   * Extract single item from response, trying multiple possible paths
   */
  extractSingleData<T = any>(response: ApiResponse, ...paths: string[]): T | null {
    const data = this.extractData(response, ...paths)

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as T
    }

    return null
  }

  /**
   * Safe property extraction with fallback values
   */
  safeExtract(
    response: ApiResponse,
    propertyPath: string,
    fallback: any = null,
    transform?: (value: any) => any
  ): any {
    const value = this.getNestedValue(response, propertyPath)

    if (value === undefined || value === null) {
      return fallback
    }

    if (transform) {
      try {
        return transform(value)
      } catch (error) {
        console.warn(`[API] Transform failed for ${propertyPath}:`, error)
        return fallback
      }
    }

    return value
  }

  /**
   * Extract multiple properties with fallbacks
   */
  extractProperties(
    response: ApiResponse,
    propertyMap: Record<string, { path: string; fallback: any; transform?: (value: any) => any }>
  ): Record<string, any> {
    const result: Record<string, any> = {}

    for (const [key, config] of Object.entries(propertyMap)) {
      result[key] = this.safeExtract(response, config.path, config.fallback, config.transform)
    }

    return result
  }
}

// Export singleton instance
export const apiClient = new FlexibleApiClient()

// Export helper functions for backward compatibility
export async function fetchApiData<T = any>(endpoint: string): Promise<ApiResponse<T>> {
  return await apiClient.get<T>(endpoint)
}

export async function postApiData<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
  return await apiClient.post<T>(endpoint, body)
}

