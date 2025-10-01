import React, { useState, useEffect } from 'react'
import Barcode from 'react-barcode'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'
import { useSettingsStore } from '@renderer/store/settings'

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
    ref?: string // Add ref field for barcode
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
  const [paymentMethodDisplayName, setPaymentMethodDisplayName] = useState<string>(
    saleData.paymentMethod
  )

  // Get settings for field visibility
  const {
    getShowPhone,
    getShowAddress,
    getShowCustomer,
    getShowEmail,
    getShowBarcodeInReceipt,
    // getShowLogoInReceipt,
    getShowNote,
    // getShowTaxDiscountShipping,
    getTaxEnabled,
    getDiscountEnabled,
    getShippingEnabled
  } = useSettingsStore()

  const showPhone = getShowPhone()
  const showAddress = getShowAddress()
  const showCustomer = getShowCustomer()
  const showEmail = getShowEmail()
  const showBarcodeInReceipt = getShowBarcodeInReceipt()
  // const showLogoInReceipt = getShowLogoInReceipt()
  const showNote = getShowNote()
  // const showTaxDiscountShipping = getShowTaxDiscountShipping()
  const taxEnabled = getTaxEnabled()
  const discountEnabled = getDiscountEnabled()
  const shippingEnabled = getShippingEnabled()

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = 0
  // const taxAmount = subtotal * 0.15 // 15% tax
  const totalAmount = subtotal + taxAmount

  // Fetch payment method display name if paymentMethod is an ID
  useEffect(() => {
    const fetchPaymentMethodName = async () => {
      if (
        typeof saleData.paymentMethod === 'number' ||
        (typeof saleData.paymentMethod === 'string' && !isNaN(Number(saleData.paymentMethod)))
      ) {
        try {
          const paymentMethod = await window.api.db.getPaymentMethodById(
            Number(saleData.paymentMethod)
          )
          if (paymentMethod && paymentMethod.display_name) {
            setPaymentMethodDisplayName(paymentMethod.display_name)
          }
        } catch (error) {
          console.error('Failed to fetch payment method display name:', error)
          // Keep the original value as fallback
        }
      }
    }

    fetchPaymentMethodName()
  }, [saleData.paymentMethod])

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

  // const generateBarcode = (_invoiceNumber: string) => {
  //   // Generate a unique barcode-like string
  //   const timestamp = Date.now()
  //   const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  //   return `SR-${timestamp}${random}`
  // }

  return (
    <div className="bg-white p-6 max-w-md mx-auto font-mono text-sm" id="receipt" data-receipt>
      {/* Company Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-gray-900">{companyInfo.name}</h1>
        <p className="text-gray-600 text-xs">{formatDate(saleData.date)}</p>
        <p className="text-gray-600 text-xs">Branch: {companyInfo.branch}</p>
        <p className="text-gray-600 text-xs">Cashier: {companyInfo.cashier}</p>
        {showAddress && <p className="text-gray-600 text-xs">{companyInfo.address}</p>}
        {showPhone && <p className="text-gray-600 text-xs">Phone: {companyInfo.phone}</p>}
        {showEmail && <p className="text-gray-600 text-xs">{companyInfo.email}</p>}
        {showCustomer && (
          <p className="text-gray-600 text-xs">
            Customer: {saleData.customerName || 'walk-in-customer'}
          </p>
        )}
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
          <div
            key={index}
            className="grid grid-cols-12 gap-1 text-xs border-b border-gray-100 py-1"
          >
            <div className="col-span-6 text-gray-800 leading-tight">{item.name}</div>
            <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
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
          {/* <div className="flex items-center justify-between">
            <span className="text-gray-600">Order Tax:</span>
            <span className="font-medium">{formatPriceBySymbol(taxAmount)} (15.00%)</span>
          </div> */}
          {taxEnabled && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tax:</span>
              <span className="text-gray-800 font-semibold">{formatPriceBySymbol(taxAmount)}</span>
            </div>
          )}
          {discountEnabled && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Discount:</span>
              <span className="text-gray-800 font-semibold">{formatPriceBySymbol(0)}</span>
            </div>
          )}
          {shippingEnabled && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Shipping:</span>
              <span className="text-gray-800 font-semibold">{formatPriceBySymbol(0)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium">{paymentMethodDisplayName}</span>
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
        {showNote && saleData.note && (
          <div className="mb-3 text-left">
            <p className="text-xs font-semibold text-gray-700 mb-1">Note:</p>
            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
              {saleData.note}
            </p>
          </div>
        )}
        {showBarcodeInReceipt && (
          <div className="mb-2">
            {/* Barcode using react-barcode with sale ref */}
            <div className="flex justify-center mb-1">
              <Barcode
                value={saleData.ref || saleData.invoiceNumber}
                width={1.5}
                height={40}
                format="CODE128"
                displayValue={false}
                background="#ffffff"
                lineColor="#000000"
              />
            </div>
            <p className="text-xs text-gray-600">{saleData.ref || saleData.invoiceNumber}</p>
          </div>
        )}
        <p className="text-xs text-gray-500">Powered by: www.usecheetah.com</p>
      </div>
    </div>
  )
}
