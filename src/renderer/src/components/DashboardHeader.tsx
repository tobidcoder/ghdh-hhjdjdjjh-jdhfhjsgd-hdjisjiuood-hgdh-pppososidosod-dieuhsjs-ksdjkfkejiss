import React from 'react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Wifi, WifiOff } from 'lucide-react'
import { SalesSyncStatus } from './SalesSyncStatus'
import { ProductSyncStatus } from './ProductSyncStatus'

interface DashboardHeaderProps {
  currentTime: Date
  settings: any
  user: { name?: string | null; username?: string | null } | null
  isOnline: boolean
  unsyncedCount: number
  onLogout: () => void
  saleRef: string
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentTime,
  settings,
  user,
  isOnline,
  unsyncedCount,
  onLogout,
  saleRef
}) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg"></span>
          </div>
          <span className="text-xl font-bold text-gray-900">Cheetah</span>
        </div>
        <span className="text-gray-600">POS : {settings?.company_name}</span>
      </div>

      <div className="flex items-center space-x-6 text-sm text-gray-600">
        <span>Shift Date: {formatDate(currentTime)}</span>
        <span>Invoice No: {saleRef}</span>
        <span>Clerk: {user?.name || user?.username || 'User'}</span>
        <span>Time: {formatTime(currentTime)}</span>
        <SalesSyncStatus />
        <ProductSyncStatus />

        {/* {unsyncedCount > 0 && (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {unsyncedCount} sales pending sync
          </Badge>
        )} */}
      </div>

      <div className="flex items-center space-x-2">
        <Badge variant={isOnline ? 'default' : 'secondary'} className="flex items-center space-x-1">
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{isOnline ? 'Connected' : 'Disconnected'}</span>
        </Badge>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </div>
  )
}
