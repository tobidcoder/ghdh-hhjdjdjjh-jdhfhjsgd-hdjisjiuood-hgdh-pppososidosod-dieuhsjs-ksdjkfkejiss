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
    // Initialize auth on app startup to load user data from local storage
    initializeAuth()
  }, [initializeAuth])

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
