import React, { useMemo } from 'react'
import { X, Calendar, User, CreditCard, Package, CheckCircle, Clock, AlertCircle, Printer, RefreshCw } from 'lucide-react'

interface SaleItem {
  id: string
  name: string
  code?: string
  price: number
  quantity: number
  category?: string
}

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

interface SaleDetailsModalProps {
  sale: SaleRecord | null
  isOpen: boolean
  onClose: () => void
  onReprint?: (sale: SaleRecord) => void
  onSync?: (sale: SaleRecord) => void
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  sale,
  isOpen,
  onClose,
  onReprint,
  onSync
}) => {
  if (!isOpen || !sale) return null

  // Parse items from JSON string using useMemo
  const items = useMemo<SaleItem[]>(() => {
    if (!sale.items) return []

    try {
      const parsed = JSON.parse(JSON.parse(sale.items))
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Error parsing sale items:', error)
      return []
    }
  }, [sale.items])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getSyncStatusText = (status: string) => {
    switch (status) {
      case 'synced':
        return 'Synced'
      case 'pending':
        return 'Pending Sync'
      case 'failed':
        return 'Sync Failed'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50   flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#052315] to-[#b2d93b]">
          <div className="text-white">
            <h2 className="text-xl font-semibold">Sale Details</h2>
            <p className="text-blue-100 text-sm">Invoice #{sale.invoice_number}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Action Buttons */}
            {onReprint && (
              <button
                onClick={() => onReprint(sale)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 bg-green-700 bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                title="Reprint Receipt"
              >
                <Printer className="w-4 h-4" />
                <span className="text-sm">Reprint</span>
              </button>
            )}
            {onSync && sale.sync_status !== 'synced' && (
              <button
                onClick={() => onSync(sale)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 bg-green-700 bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                title="Sync Sale"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Sync</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-red-600 cursor-pointer hover:text-blue-200 transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Sale Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Date & Time */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-[#b2d93b] mr-2" />
                <h3 className="font-medium text-gray-900">Date & Time</h3>
              </div>
              <p className="text-gray-700">{formatDate(sale.created_at)}</p>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <User className="w-5 h-5 text-[#b2d93b] mr-2" />
                <h3 className="font-medium text-gray-900">Customer</h3>
              </div>
              <p className="text-gray-700">{sale.customer_name || 'Walk-in Customer'}</p>
              {sale.customer_phone && (
                <p className="text-sm text-gray-500">{sale.customer_phone}</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CreditCard className="w-5 h-5 text-[#b2d93b] mr-2" />
                <h3 className="font-medium text-gray-900">Payment</h3>
              </div>
              <p className="text-gray-700 capitalize">{sale.payment_method}</p>
              <p className="text-sm text-gray-500 capitalize">{sale.payment_status}</p>
            </div>

            {/* Sync Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                {getSyncStatusIcon(sale.sync_status)}
                <h3 className="font-medium text-gray-900 ml-2">Sync Status</h3>
              </div>
              <p className="text-gray-700">{getSyncStatusText(sale.sync_status)}</p>
              {sale.synced_at && (
                <p className="text-sm text-gray-500">Synced: {formatDate(sale.synced_at)}</p>
              )}
            </div>

            {/* Total Amount */}
            <div className="bg-blue-50 rounded-lg p-4 md:col-span-2">
              <div className="flex items-center mb-2">
                <Package className="w-5 h-5 text-[#b2d93b] mr-2" />
                <h3 className="font-medium text-gray-900">Total Amount</h3>
              </div>
              <p className="text-2xl font-bold text-[#b2d93b]">
                {formatCurrency(sale.total_amount)}
              </p>
              <div className="text-sm text-gray-600 mt-1">
                <span>Subtotal: {formatCurrency(sale.subtotal)}</span>
                {sale.tax_amount > 0 && (
                  <span className="ml-4">Tax: {formatCurrency(sale.tax_amount)}</span>
                )}
                {sale.discount && sale.discount > 0 && (
                  <span className="ml-4">Discount: -{formatCurrency(sale.discount)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Items Purchased</h3>
              <p className="text-sm text-gray-600">{items?.length} item(s)</p>
            </div>

            {items?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items?.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            {item.category && (
                              <div className="text-sm text-gray-500">{item.category}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.code || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No items found for this sale</p>
              </div>
            )}
          </div>

          {/* Note Section */}
          {sale.note && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Note</h3>
              <p className="text-sm text-yellow-700">{sale.note}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 cursor-pointer bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
