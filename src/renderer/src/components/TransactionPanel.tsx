import React from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  code: string | null
}

interface TransactionPanelProps {
  cartItems: CartItem[]
  searchCode: string
  searchResult: {
    type: 'error'; error: string
  } | {
    type: 'product'; product: { id: string; name: string; price: number; code: string | null }
  } | null
  onSearchCodeChange: (value: string) => void
  onProductSearch: () => void
  onKeyPress: (event: React.KeyboardEvent) => void
  onClearCart: () => void
}

export const TransactionPanel: React.FC<TransactionPanelProps> = ({
  cartItems,
  searchCode,
  searchResult,
  onSearchCodeChange,
  onProductSearch,
  onKeyPress,
  onClearCart
}) => {
  return (
    <div className="w-96 bg-white border-r overflow-y-auto border-gray-200 flex flex-col">
      {/* Transaction Lines */}
      <div className="flex-1 p-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Transaction Lines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-600 border-b border-gray-200 pb-2">
              <span>LINE</span>
              <span className="col-span-2">DESCRIPTION</span>
              <span>PRICE</span>
              <span>QTY</span>
              <span>AMOUNT</span>
            </div>

            {/* Cart items */}
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-xs">No items in cart</div>
            ) : (
              cartItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-6 gap-2 text-xs py-1">
                  <span>{index + 1}</span>
                  <span className="col-span-2">{item.name}</span>
                  <span>{formatPriceBySymbol(item.price)}</span>
                  <span>{item.quantity}</span>
                  <span>{formatPriceBySymbol(item.price * item.quantity)}</span>
                </div>
              ))
            )}

            {/* Add item input */}
            <div className="pt-2 space-y-2">
              <Input
                placeholder="Search by product code..."
                className="text-xs h-8"
                value={searchCode}
                onChange={(e) => onSearchCodeChange(e.target.value)}
                onKeyPress={onKeyPress}
              />
              <Button onClick={onProductSearch} size="sm" className="w-full text-xs h-8">
                Search & Add
              </Button>

              {/* Search Result */}
              {searchResult && (
                <div
                  className={`text-xs p-2 rounded ${
                    searchResult.type === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {searchResult.type === 'error'
                    ? searchResult.error
                    : `Added: ${searchResult.product.name}`}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2 px-4">
        <Button variant="outline" size="sm" className="w-full justify-start">
          HOLD
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-red-600 hover:text-red-700"
          onClick={onClearCart}
        >
          CLEAR CART
        </Button>
      </div>
    </div>
  )
}
