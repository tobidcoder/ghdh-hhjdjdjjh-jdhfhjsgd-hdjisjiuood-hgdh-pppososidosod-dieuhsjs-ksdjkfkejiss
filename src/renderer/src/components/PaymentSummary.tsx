import React from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardTitle } from '@renderer/components/ui/card'
import { CreditCard } from 'lucide-react'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  code: string | null
}

interface PaymentSummaryProps {
  cartItems: CartItem[]
  onCheckout: () => void
  taxRate: number
  onTaxRateChange: (rate: number) => void
  taxEnabled: boolean // From settings enable_tax
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  cartItems,
  onCheckout,
  taxRate,
  onTaxRateChange,
  taxEnabled
}) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxAmount

  const handleTaxRateChange = (value: string) => {
    // Allow empty string to clear the input
    if (value === '') {
      onTaxRateChange(0)
      return
    }

    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onTaxRateChange(numValue)
    }
  }

  return (
    <div className="mt-4   h-full w-full space-y-3 px-4 ">
      <Card>
        {/* <CardHeader className="">
        </CardHeader> */}
        <CardContent className="space-y-2 mt-0  pt-0">
          <CardTitle className="text-lg"> Payment</CardTitle>
          {/* <Input placeholder="CUSTOMER" className="text-xs h-8" /> */}

          <div className="space-y-1 text-lg">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span>{formatPriceBySymbol(subtotal)}</span>
            </div>

            {/* Tax Input (enabled based on settings) */}
            <div className="flex items-center justify-between py-2 border-t border-gray-200 gap-2">
              <div className="flex items-center space-x-2 flex-1">
                <label htmlFor="tax-input" className="text-sm text-gray-600 whitespace-nowrap">
                  Tax
                </label>
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    id="tax-input"
                    type="number"
                    value={taxRate}
                    onChange={(e) => handleTaxRateChange(e.target.value)}
                    disabled={!taxEnabled}
                    min="0"
                    max="100"
                    step="0.1"
                    className={`h-8 text-sm w-20 ${!taxEnabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>
              <span
                className={`text-sm ${taxEnabled && taxAmount > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}
              >
                {formatPriceBySymbol(taxAmount)}
              </span>
            </div>

            <div className="flex justify-between text-green-800 font-medium pt-2 border-t border-gray-300">
              <span>Grand Total:</span>
              <span>{formatPriceBySymbol(totalAmount)}</span>
            </div>
            {/* <div className="flex justify-between">
              <span>Paid:</span>
              <span>{formatPriceBySymbol(0)}</span>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Balance and Pay */}
      <div className="flex space-x-2">
        {/* <div className="flex-1 bg-red-100 border border-red-300 rounded p-2 text-center">
          <div className="text-xs text-red-800 font-medium">Balance</div>
          <div className="text-lg font-bold text-red-900">{formatPriceBySymbol(totalAmount)}</div>
        </div> */}
        <Button
          className="flex-1  py-6 cursor-pointer bg-green-800 text-white hover:bg-green-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={onCheckout}
          disabled={cartItems.length === 0}
          size={'lg'}
        >
          <CreditCard className="mr-2" />
          PAY
        </Button>
      </div>
    </div>
  )
}
