import React, { useState } from 'react'
import { useAxiosApi } from '@renderer/hooks/useAxiosApi'
import { useUnifiedApi } from '@renderer/hooks/useUnifiedApi'
import { Button } from './ui/button'
import { Card } from './ui/card'

/**
 * Example component demonstrating the new axios-based API usage
 * This component shows how to use both useAxiosApi and useUnifiedApi hooks
 */
export const ApiExample: React.FC = () => {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Using the direct axios API hook
  const axiosApi = useAxiosApi()

  // Using the unified API service hook
  const unifiedApi = useUnifiedApi()

  const handleAxiosApiTest = async () => {
    try {
      setError(null)
      setResult('Testing axios API...')

      // Example: Test a simple GET request
      const response = await axiosApi.get('/test', {
        onSuccess: (data) => console.log('Success:', data),
        onError: (err) => console.error('Error:', err)
      })

      setResult(`Axios API Response: ${JSON.stringify(response, null, 2)}`)
    } catch (err: any) {
      setError(`Axios API Error: ${err.message}`)
    }
  }

  const handleUnifiedApiTest = async () => {
    try {
      setError(null)
      setResult('Testing unified API...')

      // Example: Test settings fetch
      const settings = await unifiedApi.getSettings({
        onSuccess: (data) => console.log('Settings loaded:', data),
        onError: (err) => console.error('Settings error:', err)
      })

      setResult(`Unified API Response: ${JSON.stringify(settings, null, 2)}`)
    } catch (err: any) {
      setError(`Unified API Error: ${err.message}`)
    }
  }

  const handleSwitchToHttp = () => {
    unifiedApi.setUseHttp(true)
    setResult('Switched to HTTP mode')
  }

  const handleSwitchToIpc = () => {
    unifiedApi.setUseHttp(false)
    setResult('Switched to IPC mode')
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">API Testing Component</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Axios API Hook</h3>
          <p className="text-sm text-gray-600 mb-3">
            Direct axios-based API calls with automatic error handling and loading states.
          </p>
          <Button
            onClick={handleAxiosApiTest}
            disabled={axiosApi.loading}
            className="w-full"
          >
            {axiosApi.loading ? 'Testing...' : 'Test Axios API'}
          </Button>
          {axiosApi.error && (
            <div className="mt-2 text-sm text-red-600">
              Error: {axiosApi.error.message}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Unified API Hook</h3>
          <p className="text-sm text-gray-600 mb-3">
            Unified API service that can switch between HTTP and IPC calls.
          </p>
          <div className="space-y-2">
            <Button
              onClick={handleUnifiedApiTest}
              disabled={unifiedApi.loading}
              className="w-full"
            >
              {unifiedApi.loading ? 'Testing...' : 'Test Unified API'}
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={handleSwitchToHttp}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                HTTP Mode
              </Button>
              <Button
                onClick={handleSwitchToIpc}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                IPC Mode
              </Button>
            </div>
          </div>
          {unifiedApi.error && (
            <div className="mt-2 text-sm text-red-600">
              Error: {unifiedApi.error.message}
            </div>
          )}
        </Card>
      </div>

      {result && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Result</h3>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {result}
          </pre>
        </Card>
      )}

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold mb-2 text-red-800">Error</h3>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}
    </div>
  )
}

export default ApiExample

