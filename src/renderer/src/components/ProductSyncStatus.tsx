import React, { useEffect } from 'react'
import { useProductsStore } from '@renderer/store/products'
import { useAuthStore } from '@renderer/store/auth'
import { Badge } from '@renderer/components/ui/badge'
import { Progress } from './ui/progress'
import { Button } from './ui/button'
import {  RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger
} from '@renderer/components/ui/dialog'

export const ProductSyncStatus: React.FC = () => {
  const { syncProgress, isSyncing, syncError, checkSyncProgress, startSync, resetSync } =
    useProductsStore()
  const { user } = useAuthStore()
  // const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Check sync progress on mount
    checkSyncProgress()
  }, [checkSyncProgress])

  // if (!syncProgress && !isSyncing && !syncError) {
  //   return null
  // }

  const getProgressPercentage = () => {
    if (!syncProgress) return 0
    if (syncProgress.is_completed) return 100
    const current_page = syncProgress.current_page - 1
    return Math.round((current_page / syncProgress.last_page) * 100)
  }

  const getStatusText = () => {
    if (syncError) return 'Sync Failed'
    if (isSyncing) return 'Syncing Products...'
    if (syncProgress?.is_completed) return 'Sync Completed'
    return 'Sync In Progress'
  }

  const getStatusColor = () => {
    if (syncError) return 'destructive'
    if (syncProgress?.is_completed) return 'default'
    return 'secondary'
  }

  const getStatusIcon = () => {
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (syncError) return <AlertCircle className="w-4 h-4 text-red-600" />
    if (syncProgress?.is_completed) return <CheckCircle className="w-4 h-4 text-green-600" />
    return <Clock className="w-4 h-4 text-orange-600" />
  }

  const handleManualSync = async () => {
    if (!user?.token) return

    try {
      console.log('Starting manual sync...')
      await startSync()
    } catch (error) {
      console.error('Manual sync failed:', error)
    }
  }

  const handleResetSync = async () => {
    try {
      await resetSync()
      console.log('Sync progress reset')
    } catch (error) {
      console.error('Failed to reset sync:', error)
    }
  }

  // const toggleExpanded = () => {
  //   setIsExpanded(!isExpanded)
  // }

  return (
    <>
      <Dialog>
        <DialogTrigger>
          <Badge variant={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <div className="flex gap-5 items-center space-x-2">
              <span>Product Synchronization</span>
              <Badge variant={getStatusColor()}>
                {getStatusIcon()}
                <span className="ml-1">{getStatusText()}</span>
              </Badge>
            </div>
          </DialogHeader>

          <div className="px-4 pb-0">
            {syncProgress && (
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{getProgressPercentage()}%</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>
                <div className="text-xs text-gray-600 text-right">
                  <div>
                    Page {syncProgress.current_page - 1}/{syncProgress.last_page}
                  </div>
                  <div>{syncProgress.total_products} products</div>
                </div>
              </div>
            )}
          </div>

          {syncError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{syncError}</div>
          )}

          {user?.token && (
            <div className="flex gap-2">
              <Button onClick={handleManualSync} disabled={isSyncing} size="sm" variant="outline">
                {isSyncing ? 'Syncing...' : 'Manual Sync'}
              </Button>
              <Button onClick={checkSyncProgress} size="sm" variant="ghost">
                Refresh Status
              </Button>
              <Button onClick={handleResetSync} size="sm" variant="destructive">
                Reset Sync
              </Button>
            </div>
          )}

          {syncProgress && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Page:</span>
                  <span className="ml-1 font-medium">
                    {syncProgress.current_page - 1} / {syncProgress.last_page}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Products:</span>
                  <span className="ml-1 font-medium">{syncProgress.total_products}</span>
                </div>
              </div>

              {syncProgress.last_sync_at && (
                <div className="text-xs text-gray-500">
                  Last sync: {new Date(syncProgress.last_sync_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
