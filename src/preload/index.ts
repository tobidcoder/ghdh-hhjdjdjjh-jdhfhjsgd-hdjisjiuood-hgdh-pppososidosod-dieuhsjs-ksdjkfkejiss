import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  db: {
    listProducts: (category?: string) => ipcRenderer.invoke('db:products:list', category),
    upsertManyProducts: (products: Array<{ id: string; name: string; price: number; category: string }>) =>
      ipcRenderer.invoke('db:products:upsertMany', products)
    ,
    getPath: () => ipcRenderer.invoke('db:path')
  }
  ,
  auth: {
    login: (payload: { email: string; password: string }) =>
      ipcRenderer.invoke('auth:login', payload)
    ,
    seedFromResponse: (payload: { response: any; password: string }) =>
      ipcRenderer.invoke('auth:seedFromResponse', payload)
    ,
    getRawResponse: (emailOrUsername: string) =>
      ipcRenderer.invoke('auth:getRawResponse', emailOrUsername)
  },
  products: {
    sync: {
      start: (payload: { baseUrl: string; userToken: string }) =>
        ipcRenderer.invoke('products:sync:start', payload),
      progress: () => ipcRenderer.invoke('products:sync:progress'),
      reset: () => ipcRenderer.invoke('products:sync:reset')
    }
  }
  ,
  env: {
    get: (key: string) => ipcRenderer.invoke('env:get', key),
    list: () => ipcRenderer.invoke('env:list')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    console.log('[Preload] APIs exposed via contextBridge:', Object.keys(api))
    console.log('[Preload] Auth API available:', !!api.auth)
    console.log('[Preload] Auth methods:', Object.keys(api.auth))
  } catch (error) {
    console.error('[Preload] Error exposing APIs:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  console.log('[Preload] APIs exposed directly to window:', Object.keys(api))
}
