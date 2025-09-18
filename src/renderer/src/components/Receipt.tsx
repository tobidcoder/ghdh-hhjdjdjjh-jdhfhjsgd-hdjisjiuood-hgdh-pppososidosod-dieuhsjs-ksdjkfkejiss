import React from 'react'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  code: string | null
}

interface ReceiptProps {
  saleData: {
    invoiceNumber: string
    date: string
    customerName: string | null
    paymentMethod: string
    paymentStatus: string
    note: string
    receivedAmount: number
    changeReturn: number
  }
  cartItems: CartItem[]
  companyInfo: {
    name: string
    address: string
    phone: string
    email: string
    branch: string
    cashier: string
  }
}

export const Receipt: React.FC<ReceiptProps> = ({ saleData, cartItems, companyInfo }) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = subtotal * 0.15 // 15% tax
  const totalAmount = subtotal + taxAmount

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const generateBarcode = (_invoiceNumber: string) => {
    // Generate a unique barcode-like string
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `SR-${timestamp}${random}`
  }

  return (
    <div className="bg-white p-6 max-w-md mx-auto font-mono text-sm" id="receipt" data-receipt>
      {/* Company Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-gray-900">{companyInfo.name}</h1>
        <p className="text-gray-600 text-xs">{formatDate(saleData.date)}</p>
        <p className="text-gray-600 text-xs">Branch: {companyInfo.branch}</p>
        <p className="text-gray-600 text-xs">Cashier: {companyInfo.cashier}</p>
        <p className="text-gray-600 text-xs">{companyInfo.address}</p>
        <p className="text-gray-600 text-xs">Phone: {companyInfo.phone}</p>
        <p className="text-gray-600 text-xs">{companyInfo.email}</p>
        <p className="text-gray-600 text-xs">Customer: {saleData.customerName || 'walk-in-customer'}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-300 my-4"></div>

      {/* Items Table */}
      <div className="mb-4">
        <div className="grid grid-cols-12 gap-1 text-xs font-semibold border-b border-gray-300 pb-2 mb-2">
          <div className="col-span-6">Item</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
        
        {cartItems.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-1 text-xs border-b border-gray-100 py-1">
            <div className="col-span-6 text-gray-800 leading-tight">
              {item.name}
            </div>
            <div className="col-span-2 text-center text-gray-600">
              {item.quantity}
            </div>
            <div className="col-span-2 text-right text-gray-600">
              {formatPriceBySymbol(item.price)}
            </div>
            <div className="col-span-2 text-right text-gray-800 font-medium">
              {formatPriceBySymbol(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Section */}
      <div className="border-t border-gray-300 pt-4 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-medium">{formatPriceBySymbol(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Order Tax:</span>
            <span className="font-medium">{formatPriceBySymbol(taxAmount)} (15.00%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Discount:</span>
            <span className="text-gray-800 font-semibold">
              {formatPriceBySymbol(0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Shipping:</span>
            <span className="text-gray-800 font-semibold">
              {formatPriceBySymbol(0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium">{saleData.paymentMethod}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Change:</span>
            <span className="font-medium">{formatPriceBySymbol(saleData.changeReturn)}</span>
          </div>
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

      {/* Footer */}
      <div className="text-center border-t border-gray-300 pt-4">
        <div className="mb-2">
          {/* Barcode placeholder - in a real implementation, you'd use a barcode library */}
          <div className="w-full h-12 bg-gray-200 flex items-center justify-center text-xs text-gray-500 mb-1">
            [BARCODE]
          </div>
          <p className="text-xs text-gray-600">{generateBarcode(saleData.invoiceNumber)}</p>
        </div>
        <p className="text-xs text-gray-500">Powered by: www.usecheetah.com</p>
      </div>
    </div>
  )
}
