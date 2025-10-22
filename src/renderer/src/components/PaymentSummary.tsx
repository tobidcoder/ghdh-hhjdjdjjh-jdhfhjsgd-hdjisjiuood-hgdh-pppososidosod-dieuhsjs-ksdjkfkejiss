import React from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
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
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({ cartItems, onCheckout }) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = subtotal * 0 // 15% tax
  const totalAmount = subtotal + taxAmount

  return (
    <div className="mt-4   h-full w-full space-y-3 px-4 ">
      <Card>
        {/* <CardHeader className="">
        </CardHeader> */}
        <CardContent className="space-y-2 mt-0  pt-0">
          <CardTitle className="text-lg"> Payment</CardTitle>
          {/* <Input placeholder="CUSTOMER" className="text-xs h-8" /> */}

          <div className="space-y-1 text-lg">
            <div className="flex justify-between">
              <span>Gross Amount:</span>
              <span>{formatPriceBySymbol(subtotal)}</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>Tax Amount:</span>
              <span>{formatPriceBySymbol(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-blue-600 font-medium">
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
          <CreditCard  className="mr-2" />
          PAY
        </Button>
      </div>
    </div>
  )
}
