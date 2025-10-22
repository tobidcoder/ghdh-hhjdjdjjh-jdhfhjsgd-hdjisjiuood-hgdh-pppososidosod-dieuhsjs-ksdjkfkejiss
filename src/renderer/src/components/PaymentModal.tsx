import React, { useState, useEffect } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import { X } from 'lucide-react'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'
import { useSettingsStore } from '@renderer/store/settings'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  code: string | null
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  onSubmit: (paymentData: PaymentData) => void
}

interface PaymentData {
  receivedAmount: number
  changeReturn: number
  note: string
  paymentStatus: number
  payingAmount: number
  paymentType: string
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onSubmit,
}) => {
  const { paymentMethods, fetchPaymentMethods, isLoading } = useSettingsStore()
  const [receivedAmount, setReceivedAmount] = useState('')
  const [note, setNote] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(1)
  const [paymentType, setPaymentType] = useState('')

  // Get settings for field visibility
  const { getTaxEnabled, getDiscountEnabled, getShippingEnabled } = useSettingsStore()
  const taxEnabled = getTaxEnabled()
  const discountEnabled = getDiscountEnabled()
  const shippingEnabled = getShippingEnabled()

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = subtotal * 0.15 // 15% tax
  const totalAmount = subtotal
  // + taxAmount
  const changeReturn = parseFloat(receivedAmount) - totalAmount

  // Fetch payment methods when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods()
    }
  }, [isOpen])

//   if (paymentMethods) {
// console.log('Available payment methods:', paymentMethods)
//   }

  // Set default received amount to total amount and default payment type
  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      setReceivedAmount(totalAmount.toFixed(2))

      // Force default payment type to 'Cash' if available, else first active
      if (paymentMethods.length > 0) {
        const activeMethods = paymentMethods.filter((method) => method.is_active)
        const cashMethod = activeMethods.find(
          (method) => method.name?.toLowerCase() === 'cash' || method.display_name?.toLowerCase() === 'cash'
        )
        if (cashMethod) {
          setPaymentType(String(cashMethod.id))
        } else if (activeMethods.length > 0) {
          setPaymentType(String(activeMethods[0].id))
        }
      }
    }
  }, [isOpen, cartItems, totalAmount, paymentMethods])

  const handleSubmit = () => {
    if (!paymentType) {
      alert('Please select a payment type')
      return
    }

    const paymentData: PaymentData = {
      receivedAmount: parseFloat(receivedAmount) || 0,
      changeReturn: changeReturn || 0,
      note,
      paymentStatus,
      payingAmount: parseFloat(receivedAmount) || 0,
      paymentType
    }

    onSubmit(paymentData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[80vw] max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-green-800">Make Payment</h2>
          <button onClick={onClose} className="text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex p-6 gap-6">
          {/* Left Panel - Payment Input Fields */}
          <div className="w-2/3 space-y-4">
            <div className="grid grid-cols-2  gap-4">
              <div className="">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Received Amount:
                  </label>
                  <Input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="text-lg font-medium"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Change Return:</label>
                  <Input
                    type="number"
                    value={changeReturn.toFixed(2)}
                    readOnly
                    className="text-lg font-medium bg-gray-50"
                  />
                </div>
              </div>
              <div className="">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Paying Amount:</label>
                  <Input
                    type="number"
                    value={receivedAmount}
                    readOnly
                    className="text-lg font-medium bg-gray-50"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Type: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value="">
                      {isLoading ? 'Loading payment methods...' : 'Select Payment Method'}
                    </option>
                    {paymentMethods
                      .filter((method) => method.is_active)
                      .map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.display_name || method.name}
                        </option>
                      ))}
                  </select>
                  {isLoading && (
                    <p className="text-xs text-gray-500">Loading available payment methods...</p>
                  )}
                  {!isLoading && paymentMethods.length === 0 && (
                    <p className="text-xs text-orange-600">
                      No payment methods available. Please check your settings.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Note:</label>
              <textarea
                placeholder="Enter Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Payment Status:</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={1}>Paid</option>
                <option value={2}>Pending</option>
                <option value={3}>Partial</option>
              </select>
            </div>
          </div>

          {/* Right Panel - Order Summary */}
          <div className="w-1/2 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Products</span>
                <Badge className="bg-green-800 text-white">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold text-gray-800">{formatPriceBySymbol(subtotal)}</span>
              </div>

              {/* <div className="flex items-center justify-between">
                <span className="text-gray-600">Order Tax</span>
                <span className="font-semibold text-gray-800">
                  {formatPriceBySymbol(taxAmount)} (15.00%)
                </span>
              </div> */}

              {taxEnabled && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold text-gray-800">
                    {formatPriceBySymbol(taxAmount)}
                  </span>
                </div>
              )}

              {discountEnabled && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-gray-800 font-semibold">{formatPriceBySymbol(0)}</span>
                </div>
              )}

              {shippingEnabled && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-800 font-semibold">{formatPriceBySymbol(0)}</span>
                </div>
              )}

              <div className="border-t border-gray-300 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-800">Grand Total</span>
                  <span className="text-xl font-bold text-green-800">
                    {formatPriceBySymbol(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-8 py-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!paymentType || isLoading}
            className="px-8 py-2 bg-green-800 text-white hover:bg-green-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Submit & Print
          </Button>
        </div>
      </div>
    </div>
  )
}
