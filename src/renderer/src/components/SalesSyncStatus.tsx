import React, { useState } from 'react'
import { useSalesStore } from '@renderer/store/sales'
import { useAuthStore } from '@renderer/store/auth'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Upload, CheckCircle, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

export const SalesSyncStatus: React.FC = () => {
  const { unsyncedCount, isSyncing, syncError, getUnsyncedCount, syncSales, clearError } =
    useSalesStore()
  const { user } = useAuthStore()
  const [isExpanded, setIsExpanded] = useState(false)

  React.useEffect(() => {
    // Get initial unsynced count
    getUnsyncedCount()

    // Set up interval to check unsynced count every 30 seconds
    const interval = setInterval(getUnsyncedCount, 30000)
    return () => clearInterval(interval)
  }, [getUnsyncedCount])

  const handleSync = async () => {
    if (!user?.token) {
      alert('No authentication token available')
      return
    }

    try {
      // Get base URL from environment or use a default
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'
      await syncSales(baseUrl, user.token)
    } catch (error: any) {
      console.error('Sales sync failed:', error)
    }
  }

  const getStatusIcon = () => {
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (unsyncedCount === 0) return <CheckCircle className="w-4 h-4 text-green-600" />
    if (syncError) return <AlertCircle className="w-4 h-4 text-red-600" />
    return <Clock className="w-4 h-4 text-orange-600" />
  }

  const getStatusText = () => {
    if (isSyncing) return 'Syncing sales...'
    if (unsyncedCount === 0) return 'All sales synced'
    if (syncError) return 'Sync failed'
    return `${unsyncedCount} sales pending sync`
  }

  const getStatusColor = () => {
    if (isSyncing) return 'bg-blue-100 text-blue-800'
    if (unsyncedCount === 0) return 'bg-green-100 text-green-800'
    if (syncError) return 'bg-red-100 text-red-800'
    return 'bg-orange-100 text-orange-800'
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-0 cursor-pointer" onClick={toggleExpanded}>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            <span>Sales Sync Status</span>
          </div>
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* Collapsed View - Always Visible */}
      <div className="px-4 pb-0">
        <div className="flex items-center justify-between text-sm">
          <span>Unsynced Sales:</span>
          <span className="font-medium">{unsyncedCount}</span>
        </div>
        {syncError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            <span>Error: {syncError}</span>
          </div>
        )}
      </div>

      {/* Expanded View - Only Visible When Expanded */}
      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {syncError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              <div className="flex items-center justify-between">
                <span>Error: {syncError}</span>
                <button onClick={clearError} className="text-red-600 hover:text-red-800">
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing || unsyncedCount === 0}
              size="sm"
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isSyncing ? 'Syncing...' : 'Sync Sales'}
            </Button>

            <Button onClick={getUnsyncedCount} disabled={isSyncing} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {unsyncedCount > 0 && (
            <div className="text-xs text-gray-600">
              Sales will be automatically synced when online. You can also manually sync using the
              button above.
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
