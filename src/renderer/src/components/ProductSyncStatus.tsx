import React, { useEffect } from 'react'
import { useProductsStore } from '@renderer/store/products'
import { useAuthStore } from '@renderer/store/auth'
import { Badge } from '@renderer/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Progress } from './ui/progress'
import { Button } from './ui/button'
import { getBaseUrl } from '@renderer/config/env'

export const ProductSyncStatus: React.FC = () => {
  const { syncProgress, isSyncing, syncError, checkSyncProgress, startSync } = useProductsStore()
  const { user } = useAuthStore()

  useEffect(() => {
    // Check sync progress on mount
    checkSyncProgress()
  }, [checkSyncProgress])

  if (!syncProgress && !isSyncing && !syncError) {
    return null
  }

  const getProgressPercentage = () => {
    if (!syncProgress) return 0
    return Math.round((syncProgress.current_page / syncProgress.last_page) * 100)
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

  const handleManualSync = async () => {
    if (!user?.token) return
    
    try {
      const baseUrl = await getBaseUrl()
      if (!baseUrl) {
        console.error('No BASE_URL configured')
        return
      }
      
      console.log('Starting manual sync...')
      await startSync(baseUrl, user.token)
    } catch (error) {
      console.error('Manual sync failed:', error)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          Product Synchronization
          <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {syncError && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {syncError}
          </div>
        )}
        
        {user?.token && (
          <div className="flex gap-2">
            <Button 
              onClick={handleManualSync} 
              disabled={isSyncing}
              size="sm"
              variant="outline"
            >
              {isSyncing ? 'Syncing...' : 'Manual Sync'}
            </Button>
            <Button 
              onClick={checkSyncProgress} 
              size="sm"
              variant="ghost"
            >
              Refresh Status
            </Button>
          </div>
        )}
        
        {syncProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Page:</span>
                <span className="ml-1 font-medium">
                  {syncProgress.current_page} / {syncProgress.last_page}
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
      </CardContent>
    </Card>
  )
}
