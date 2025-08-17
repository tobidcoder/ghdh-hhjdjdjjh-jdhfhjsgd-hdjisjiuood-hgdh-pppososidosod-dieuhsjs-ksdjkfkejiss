import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      db: {
        listProducts: (category?: string, limit?: number) => Promise<Array<{ id: string; name: string; price: number; category: string; code: string | null; raw_response: string | null }>>
        searchProductByCode: (code: string) => Promise<{ id: string; name: string; price: number; category: string; code: string | null; raw_response: string | null } | null>
        upsertManyProducts: (
          products: Array<{ id: string; name: string; price: number; category: string; code: string | null; raw_response: string | null }>
        ) => Promise<{ success: boolean }>
        getPath: () => Promise<string>
      }
      ,
      auth: {
        login: (payload: { email: string; password: string }) => Promise<{ user: { id: string; username: string; email: string | null; name: string | null; token: string | null; raw_response: any }; source: 'local' | 'remote' }>
        seedFromResponse: (payload: { response: any; password: string }) => Promise<{ user: { id: string; username: string; email: string | null; name: string | null; token: string | null; raw_response: any } }>
        getRawResponse: (emailOrUsername: string) => Promise<any>
      },
      products: {
        sync: {
          start: (payload: { baseUrl: string; userToken: string }) => Promise<{ success: boolean }>
          progress: () => Promise<{
            id: string
            current_page: number
            last_page: number
            is_completed: boolean
            last_sync_at: string
            total_products: number
          } | null>
          reset: () => Promise<{ success: boolean }>
        }
      }
      ,
      env: {
        get: (key: string) => Promise<string>
        list: () => Promise<Record<string, string | undefined>>
      }
    }
  }
}
