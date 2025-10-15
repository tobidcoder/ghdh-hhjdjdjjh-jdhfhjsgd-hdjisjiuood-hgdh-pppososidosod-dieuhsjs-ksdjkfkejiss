import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import RecentSales from './pages/RecentSales'
import { useAuthStore } from './store/auth'
// removed unused imports

function App(): React.JSX.Element {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    // Expose the Zustand store (hook function) globally for axios interceptor access
    ;(window as any).__authStore = useAuthStore

    // Initialize auth on app startup to load user data from local storage
    initializeAuth()

    // Listen for forced logout from main process (401 during background sync)
    const handler = () => {
      try {
        const { logoutWithDatabaseCleanup } = useAuthStore.getState()
        // Only trigger if a user exists
        if (useAuthStore.getState().user) {
          logoutWithDatabaseCleanup()
        }
      } catch {}
    }
    window.electron?.ipcRenderer?.on?.('auth:forceLogout401', handler)

    return () => {
      try {
        window.electron?.ipcRenderer?.removeAllListeners?.('auth:forceLogout401')
      } catch {}
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* <Route path="/dashboard" element={<h1>kjkj</h1>} /> */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/recent-sales" element={<RecentSales />} />
    </Routes>
  )
}

export default App
