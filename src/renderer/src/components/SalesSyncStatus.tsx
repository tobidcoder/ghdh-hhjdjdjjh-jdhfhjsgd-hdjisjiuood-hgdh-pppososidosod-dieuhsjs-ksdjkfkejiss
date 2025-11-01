import React from 'react'
import { useSalesStore } from '@renderer/store/sales'
import { useAuthStore } from '@renderer/store/auth'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
// import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  // ChevronDown,
  // ChevronRight
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  // DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'

export const SalesSyncStatus: React.FC = () => {
  const { unsyncedCount, isSyncing, syncError, getUnsyncedCount, syncSales, clearError } =
    useSalesStore()
  const { user } = useAuthStore()
  // const [isExpanded, setIsExpanded] = useState(false)

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
      await syncSales()
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

  // const toggleExpanded = () => {
  //   setIsExpanded(!isExpanded)
  // }

  return (
    <>
      <Dialog>
        <DialogTrigger className='cursor-pointer'>
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </DialogTrigger>
        <DialogTitle></DialogTitle>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-5 space-x-2">
              <span>Sales Sync Status</span>
              <Badge variant="outline" className={getStatusColor()}>
                {getStatusIcon()}
                <span className="ml-1">{getStatusText()}</span>
              </Badge>
            </div>
          </DialogHeader>

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

          {syncError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              <div className="flex items-center justify-between">
                <span>Error: {syncError}</span>
                <button
                  onClick={clearError}
                  className="text-red-600 cursor-pointer hover:text-red-800"
                >
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
        </DialogContent>
      </Dialog>
    </>
  )
}
