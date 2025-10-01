import React from 'react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Wifi, WifiOff, BarChart3 } from 'lucide-react'
import { SalesSyncStatus } from './SalesSyncStatus'
import { ProductSyncStatus } from './ProductSyncStatus'
import Logo from '@renderer/assets/images/cheetah-dark-logo.png'
import { useNavigate } from 'react-router-dom'

interface DashboardHeaderProps {
  currentTime: Date
  settings: any
  user: { name?: string | null; username?: string | null } | null
  isOnline: boolean
  unsyncedCount: number
  onLogout: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentTime,
  // settings,
  user,
  isOnline,
  // unsyncedCount,
  onLogout,
}) => {
  const navigate = useNavigate()

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
      hour12: true
    })
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <img src={Logo} alt="logo" width={130} />
        {/* <span className="text-[#b2d93b] font-bold">
          POS : <span className="text-[#052315]">{settings?.company_name} </span>
        </span> */}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => navigate('/recent-sales')}
        className="border-[#052315] text-[#052315] hover:bg-[#052315]/10 cursor-pointer"
      >
        <BarChart3 className="w-4 h-4 mr-2" />
        Recent Sales
      </Button>

      <div className="flex items-center space-x-6 text-sm text-[#b2d93b] font-bold">
        <span>
          Shift Date: <span className="text-[#052315] ">{formatDate(currentTime)}</span>
        </span>
        <span>
          Clerk: <span className="text-[#052315]">{user?.name || user?.username || 'User'}</span>
        </span>
        <span>
          Time: <span className="text-[#052315]">{formatTime(currentTime)}</span>
        </span>
      </div>

      <div className="flex items-center space-x-3">
        <SalesSyncStatus />
        <ProductSyncStatus />
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
