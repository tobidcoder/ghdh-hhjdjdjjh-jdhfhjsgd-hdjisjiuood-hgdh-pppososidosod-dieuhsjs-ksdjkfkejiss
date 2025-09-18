import { apiClient } from './apiClient'

/**
 * Generic service updater that can update any service to use the flexible API client
 * This provides a consistent pattern for all services
 */

export interface ServiceUpdateConfig {
  endpoint: string
  dataExtractionPaths: string[]
  fallbackData: any[]
  recordMapper: (item: any) => any
  upsertFunction: (records: any[]) => void
  serviceName: string
}

export async function updateServiceWithFlexibleClient(config: ServiceUpdateConfig): Promise<void> {
  const { endpoint, dataExtractionPaths, fallbackData, recordMapper, upsertFunction, serviceName } = config

  console.log(`[DB] Fetching ${serviceName} from remote API...`)

  try {
    const response = await apiClient.get(endpoint)
    console.log(`[DB] ${serviceName} API response:`, response)

    // Extract data using flexible extraction
    let extractedData: any[] = []
    
    for (const path of dataExtractionPaths) {
      const data = apiClient.extractArrayData(response, path)
      if (data.length > 0) {
        extractedData = data
        break
      }
    }

    // Try alternative extraction if no data found
    if (extractedData.length === 0) {
      const altData = apiClient.extractData(response, 'data', 'attributes')
      if (Array.isArray(altData)) {
        extractedData = altData
      }
    }

    if (extractedData.length > 0) {
      const records = extractedData.map(recordMapper)
      upsertFunction(records)
      console.log(`[DB] ${records.length} ${serviceName} saved successfully with flexible extraction`)
    } else {
      console.warn(`[DB] No ${serviceName} data found in API response, creating default records...`)
      upsertFunction(fallbackData)
      console.log(`[DB] ${fallbackData.length} default ${serviceName} created`)
    }
  } catch (error: any) {
    console.error(`[DB] Failed to fetch ${serviceName}:`, error.message)
    
    // Create fallback data on error
    console.log(`[DB] Creating default ${serviceName} due to API failure...`)
    try {
      upsertFunction(fallbackData)
      console.log(`[DB] Default ${serviceName} created successfully`)
    } catch (dbError: any) {
      console.error(`[DB] Failed to create default ${serviceName}:`, dbError.message)
      throw error // Throw original API error
    }
  }
}

/**
 * Helper function to create a flexible fetch function for any service
 */
export function createFlexibleFetchFunction<T = any>(
  endpoint: string,
  dataExtractionPaths: string[],
  fallbackData: T[],
  recordMapper: (item: any) => T,
  upsertFunction: (records: T[]) => void,
  serviceName: string
): () => Promise<void> {
  return async () => {
    await updateServiceWithFlexibleClient({
      endpoint,
      dataExtractionPaths,
      fallbackData,
      recordMapper,
      upsertFunction,
      serviceName
    })
  }
}

