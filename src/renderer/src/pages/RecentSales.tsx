import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { ArrowLeft, Calendar, Filter, CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react'
import { useAuthStore } from '@renderer/store/auth'
import { SaleDetailsModal } from '@renderer/components/SaleDetailsModal'
// import {  } from '@renderer/services/apiService'
import { useSalesStore } from '@renderer/store/sales'
import { printReceiptFromSale } from '@renderer/utils/printUtils'
import { showError, showSuccess, showInfo } from '@renderer/utils/notifications'

interface SaleRecord {
  id: string
  invoice_number: string
  customer_name: string | null
  customer_phone: string | null
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_method: string
  payment_status: string
  items: string // JSON string of cart items
  created_at: string
  synced_at?: string
  sync_status: 'pending' | 'synced' | 'failed'
  user_id: string
  note?: string | null
  discount?: number
  shipping?: number
  tax_rate?: number
}

type DateFilter = 'today' | 'yesterday' | 'day2' | 'day3' | 'day4' | 'day5' | 'day6'

const RecentSales: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<DateFilter>('today')
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { syncSales } = useSalesStore()
  // Generate date filters with day names
  const generateDateFilters = () => {
    const filters = []
    const today = new Date()

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)

      let key: DateFilter
      let label: string

      if (i === 0) {
        key = 'today'
        label = 'Today'
      } else if (i === 1) {
        key = 'yesterday'
        label = 'Yesterday'
      } else {
        key = `day${i}` as DateFilter
        label = date.toLocaleDateString('en-US', { weekday: 'long' })
      }

      filters.push({ key, label, date: new Date(date) } as never)
    }

    return filters
  }

  const dateFilters = generateDateFilters()

  const getDateRange = (filter: DateFilter): { startDate: string; endDate: string } => {
    const today = new Date()
    const selectedDate = new Date(today)

    // Calculate which day we're looking at
    let daysBack = 0
    if (filter === 'yesterday') {
      daysBack = 1
    } else if (filter.startsWith('day')) {
      daysBack = parseInt(filter.replace('day', ''))
    }

    // Set the selected date
    selectedDate.setDate(today.getDate() - daysBack)

    // Get start of day (00:00:00)
    const startOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    )

    // Get end of day (23:59:59.999)
    const endOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      23,
      59,
      59,
      999
    )

    return {
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString()
    }
  }

  const fetchSales = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange(selectedFilter)
      const salesData = await window.api.db.getSalesByDateRange(startDate, endDate)
      setSales(salesData || [])
    } catch (error) {
      console.error('Error fetching sales:', error)
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [selectedFilter, user?.id])

  const handleSaleClick = (sale: SaleRecord) => {
    setSelectedSale(sale)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setSelectedSale(null)
    setIsModalOpen(false)
  }

  const handleReprintReceipt = async (sale: SaleRecord) => {
    try {
      await printReceiptFromSale(sale)
      // Notification is shown by printReceipt function
      console.log('Receipt reprinted successfully')
    } catch (error) {
      console.error('Error reprinting receipt:', error)
      // Error notification is shown by printReceipt function
    }
  }

  // const handleSync = async () => {
  //   if (!user?.token) {
  //     alert('No authentication token available')
  //     return
  //   }

  //   try {

  //   } catch (error: any) {
  //     console.error('Sales sync failed:', error)
  //   }
  // }

  const handleSyncSale = async () => {
    try {
      showInfo('Syncing sales...', 'Please wait')
      // Call the electron API to sync sale
      await syncSales()
      // Refresh the sales data to show updated sync status
      fetchSales()
      showSuccess('Sales synced successfully!', 'Sync Complete')
    } catch (error: any) {
      console.error('Error syncing sale:', error)
      showError(error?.message || 'Failed to sync sales', 'Sync Failed')
    }
  }

  const handleSyncAll = async () => {
    if (!user?.token) {
      showError('No authentication token available. Please login again.', 'Authentication Error')
      return
    }

    setSyncing(true)
    try {
      // Call the sync API for all unsynced sales
      await syncSales()
      // Refresh the sales data to show updated sync status
      await fetchSales()
      console.log('All sales synced successfully')
    } catch (error) {
      console.error('Error syncing all sales:', error)
      // You could add error handling/notification here
    } finally {
      setSyncing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synced
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <RefreshCw className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        )
    }
  }

  const totalAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
  const syncedCount = sales.filter((sale) => sale.sync_status === 'synced').length
  const pendingCount = sales.filter((sale) => sale.sync_status === 'pending').length
  const failedCount = sales.filter((sale) => sale.sync_status === 'failed').length
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-[#052315] hover:bg-[#052315]/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-[#052315]">Recent Sales</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncing || (pendingCount === 0 && failedCount === 0)}
              className={`border-[#052315] text-[#052315] hover:bg-[#052315]/10 ${
                pendingCount > 0 || failedCount > 0
                  ? 'bg-orange-50 border-orange-500 text-orange-700 hover:bg-orange-100'
                  : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync All{' '}
              {pendingCount > 0 || failedCount > 0 ? `(${pendingCount + failedCount})` : ''}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSales}
              disabled={loading}
              className="border-[#052315] text-[#052315] hover:bg-[#052315]/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filter Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-[#052315]">
              <Filter className="w-5 h-5 mr-2" />
              Filter by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {dateFilters.map((filter: any) => (
                <Button
                  key={filter.key}
                  variant={selectedFilter === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter(filter.key)}
                  className={
                    selectedFilter === filter.key
                      ? 'bg-[#052315] hover:bg-[#052315]/90'
                      : 'border-[#052315] text-[#052315] hover:bg-[#052315]/10'
                  }
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-[#052315]">{sales.length}</div>
              <div className="text-sm text-gray-600">Total Sales</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
              <div className="text-sm text-gray-600">Total Amount</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{syncedCount}</div>
              <div className="text-sm text-gray-600">Synced</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-gray-600">Pending Sync</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-sm text-gray-600">Failed Sync</div>
            </CardContent>
          </Card>
        </div>

        {/* Sales List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#052315]">Sales Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-[#052315] mr-2" />
                <span className="text-gray-600">Loading sales...</span>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No sales found for the selected period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => handleSaleClick(sale)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-[#052315]">
                            Invoice #{sale.invoice_number}
                          </h3>
                          {getSyncStatusBadge(sale.sync_status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Amount:</span>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(sale.total_amount)}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Date:</span>
                            <div>{formatDate(sale.created_at)}</div>
                          </div>
                          <div>
                            <span className="font-medium">Sync Status:</span>
                            <div className="capitalize">{sale.sync_status}</div>
                          </div>
                          <div>
                            <span className="font-medium">Last Sync:</span>
                            <div>{sale.synced_at ? formatDate(sale.synced_at) : 'Not synced'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sale Details Modal */}
      <SaleDetailsModal
        sale={selectedSale}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onReprint={handleReprintReceipt}
        onSync={handleSyncSale}
      />
    </div>
  )
}

export default RecentSales
