import * as React from 'react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/auth'

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { login, isSubmitting, error, user, clearError, syncProgress } = useAuthStore()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-[#052315]">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col items-center">
        <div className="flex flex-col items-center mb-6">
          <span className="text-4xl font-bold text-[#052315] flex items-center gap-2 mb-2">
            <span className="inline-block">
              <svg
                width="130"
                height="24"
                viewBox="0 0 130 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="40" height="24" fill="none" />
                <text
                  x="0"
                  y="18"
                  fontFamily="Arial Black, Arial, sans-serif"
                  fontSize="24"
                  fontWeight="bold"
                  fill="#052315"
                >
                  Cheetah
                </text>
              </svg>
            </span>
          </span>
        </div>
        <h2 className="text-2xl font-semibold text-[#052315] mb-2">Sign in</h2>
        <p className="text-center text-[#052315] mb-6">
          Please enter your email address and password.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            clearError()
            await login({ email, password })
          }}
          className="w-full flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-[#052315] font-medium">
              Email/Username<span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="text"
              placeholder="Enter Email or Username"
              className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#052315]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-[#052315] font-medium">
              Password<span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter Password"
                className="border border-gray-300 rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#052315]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="#052315"
                  className="w-5 h-5"
                >
                  {showPassword ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 0 0 2.25 12c2.083 3.61 6.017 6 9.75 6 1.563 0 3.06-.362 4.385-1.01M21.75 12c-.512-.882-1.16-1.708-1.927-2.445M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6.75 0c-2.083-3.61-6.017-6-9.75-6-.845 0-1.676.087-2.484.252M3 3l18 18"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12C4.333 8.39 8.267 6 12 6c3.733 0 7.667 2.39 9.75 6-2.083 3.61-6.017 6-9.75 6-3.733 0-7.667-2.39-9.75-6Zm9.75 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
          {error ? (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md" role="alert">
              <div className="font-medium">Login Failed</div>
              <div>{error}</div>
            </div>
          ) : null}
          {syncProgress?.isSyncing ? (
            <div className="text-blue-600 text-sm bg-blue-50 p-3 rounded-md" role="alert">
              <div className="font-medium">Syncing Data...</div>
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">
                  {syncProgress.currentStep} ({syncProgress.completedSteps}/{syncProgress.totalSteps})
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.completedSteps / syncProgress.totalSteps) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end mb-2">
            <a href="#" className="text-blue-500 text-sm hover:underline">
              Forgot Password ?
            </a>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || syncProgress?.isSyncing}
            className="w-full bg-[#052315] text-white rounded-md py-2 mt-2 hover:bg-[#09351f] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in…' : syncProgress?.isSyncing ? 'Syncing data…' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default Login
