import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/auth'
import { formatCurrency } from '@renderer/lib/currencyFormatter'
import { Button } from '@renderer/components/ui/button'

interface ScannedProduct {
  id: string
  name: string
  price: number
  code: string | null
}

const PriceChecker: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [searchCode, setSearchCode] = useState('')
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-focus the input field
  useEffect(() => {
    if (inputRef.current && !showPasswordModal) {
      inputRef.current.focus()
    }
  }, [showPasswordModal, scannedProduct])

  // Clear product display after 10 seconds
  useEffect(() => {
    if (scannedProduct) {
      // Clear any existing timeout
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current)
      }

      // Set new timeout to clear after 10 seconds
      clearTimeoutRef.current = setTimeout(() => {
        setScannedProduct(null)
        setError(null)
        setSearchCode('')
        // Refocus the input after clearing
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 5000)
    }

    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current)
      }
    }
  }, [scannedProduct])

  // Handle barcode scan (input submission)
  const handleScan = useCallback(async (code: string) => {
    if (!code.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      const product = await window.api.db.searchProductByCode(code.trim())

      if (product) {
        setScannedProduct({
          id: product.id,
          name: product.name,
          price: product.price,
          code: product.code
        })
        setError(null)
      } else {
        setScannedProduct(null)
        setError('Product not found')
      }
    } catch (err) {
      console.error('Error searching product:', err)
      setScannedProduct(null)
      setError('Error searching for product')
    } finally {
      setIsSearching(false)
      setSearchCode('')
      // Refocus the input after search completes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }, [])

  // Handle input key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Clear any pending scan timeout and trigger immediately
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }
      handleScan(searchCode)
    }
  }

  // Auto-scan when input changes (debounced for barcode scanners)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchCode(value)

    // Clear any existing scan timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
    }

    // Auto-trigger scan after 500ms of no input (barcode scanners type fast)
    if (value.trim()) {
      scanTimeoutRef.current = setTimeout(() => {
        handleScan(value)
      }, 500)
    }
  }

  // Cleanup scan timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  // Handle navigation back to dashboard - requires password
  const handleBackToDashboard = () => {
    setShowPasswordModal(true)
    setPassword('')
    setPasswordError(null)
  }

  // Verify password and navigate
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.email && !user?.username) {
      setPasswordError('User session invalid')
      return
    }

    setIsVerifying(true)
    setPasswordError(null)

    try {
      // Verify password using the auth API
      const result = await window.api.auth.login({
        email: user.email || user.username,
        password: password
      })

      if (result.user) {
        // Password verified, navigate to dashboard
        setShowPasswordModal(false)
        navigate('/dashboard')
      } else {
        setPasswordError('Invalid password')
      }
    } catch (err: any) {
      console.error('Password verification failed:', err)
      setPasswordError(err?.message || 'Invalid password')
    } finally {
      setIsVerifying(false)
    }
  }

  // Cancel password modal
  const handleCancelPassword = () => {
    setShowPasswordModal(false)
    setPassword('')
    setPasswordError(null)
    // Refocus the barcode input
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="min-h-screen min-w-screen flex flex-col bg-[#052315]">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-[#052315]">Cheetah</span>
          <span className="text-lg text-gray-600">|</span>
          <span className="text-xl font-semibold text-[#052315]">Price Checker</span>
        </div>
        <Button
          onClick={handleBackToDashboard}
          className="bg-[#052315] hover:bg-[#0a3d2a] text-white px-6 py-2"
        >
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Scan Input */}
        {!scannedProduct && (
          <div className="w-full max-w-xl mb-12">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <label className="block text-[#052315] text-lg font-medium mb-3">
                Scan Product Barcode
              </label>
              <input
                ref={inputRef}
                type="text"
                value={searchCode}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Scan or enter product code..."
                className="w-full border-2 border-gray-300 rounded-xl px-6 py-4 text-xl focus:outline-none focus:ring-4 focus:ring-[#052315] focus:border-[#052315] transition-all"
                autoFocus
                disabled={isSearching}
              />
              {isSearching && <div className="mt-3 text-gray-500 text-center">Searching...</div>}
            </div>
          </div>
        )}
        {/* Product Display */}
        {scannedProduct && (
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl p-12 text-center transform transition-all duration-300 scale-100">
              <div className="mb-6">
                <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full">
                  Product Found
                </span>
              </div>

              {/* Product Code */}
              {scannedProduct.code && (
                <p className="text-gray-500 text-lg mb-2">Code: {scannedProduct.code}</p>
              )}

              {/* Product Name */}
              <h1 className="text-4xl md:text-5xl font-bold text-[#052315] mb-8 leading-tight">
                {scannedProduct.name}
              </h1>

              {/* Product Price */}
              <div className="bg-[#052315] rounded-2xl py-8 px-12 inline-block">
                <p className="text-white text-2xl mb-2 opacity-80">Price</p>
                <p className="text-6xl md:text-7xl font-bold text-white">
                  {formatCurrency(scannedProduct.price)}
                </p>
              </div>

              {/* Auto-clear notice */}
              <p className="mt-8 text-gray-400 text-sm">
                This display will clear automatically in 10 seconds
              </p>
            </div>
          </div>
        )}
        {/* Error Display */}
        {error && !scannedProduct && (
          <div className="w-full max-w-xl animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="mb-4">
                <span className="inline-block bg-red-100 text-red-800 text-sm font-semibold px-4 py-2 rounded-full">
                  Not Found
                </span>
              </div>
              <p className="text-2xl text-gray-700">{error}</p>
              <p className="mt-4 text-gray-400">Please try scanning another product</p>
            </div>
          </div>
        )}
        {/* Initial State - Welcome Message */}
        {!scannedProduct && !error && (
          <div className="text-center text-white opacity-80">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-24 h-24 mx-auto mb-6 opacity-60"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
              />
            </svg>
            <h2 className="text-3xl font-semibold mb-3">Scan a Product</h2>
            <p className="text-xl">Position the barcode in front of the scanner</p>
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#052315] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="white"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#052315]">Authentication Required</h2>
              <p className="text-gray-600 mt-2">Enter your password to return to the dashboard</p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label className="block text-[#052315] font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#052315] focus:border-[#052315]"
                  autoFocus
                  required
                />
              </div>

              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{passwordError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleCancelPassword}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800"
                  disabled={isVerifying}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#052315] hover:bg-[#0a3d2a] text-white"
                  disabled={isVerifying || !password}
                >
                  {isVerifying ? 'Verifying...' : 'Confirm'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white/10 px-6 py-3 text-center">
        <p className="text-white/60 text-sm">
          Logged in as:{' '}
          <span className="font-medium text-white/80">{user?.name || user?.username}</span>
        </p>
      </div>
    </div>
  )
}

export default PriceChecker
