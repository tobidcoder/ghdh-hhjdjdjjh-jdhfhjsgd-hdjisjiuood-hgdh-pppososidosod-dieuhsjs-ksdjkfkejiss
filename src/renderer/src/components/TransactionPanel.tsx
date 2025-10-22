import React, { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { formatPriceBySymbol } from '@renderer/lib/currencyUtils'
import { Minus, Plus, Trash2, Eye } from 'lucide-react'
import { apiService } from '@renderer/services/apiService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { toast } from 'sonner'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  code: string | null
}

interface TransactionPanelProps {
  cartItems: CartItem[]
  onClearCart: () => void
  onRemoveFromCart: (productId: string) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onAddItem: (product: any) => void
  saleRef: string
}

export const TransactionPanel: React.FC<TransactionPanelProps> = ({
  cartItems,
  onClearCart,
  onRemoveFromCart,
  onUpdateQuantity,
  onAddItem,
  saleRef
}) => {
  const [holdName, setHoldName] = useState('')
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false)
  const [isViewHoldsOpen, setIsViewHoldsOpen] = useState(false)
  const [holds, setHolds] = useState<any[]>([])
  const [isLoadingHolds, setIsLoadingHolds] = useState(false)

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleSaveHold = async () => {
    if (!holdName.trim()) {
      toast.error('Please enter a name for the hold')
      return
    }

    if (cartItems.length === 0) {
      toast.error('Cannot save an empty cart')
      return
    }

    try {
      await apiService.saveHold({
        name: holdName.trim(),
        items: cartItems,
        totalAmount: total
      })

      toast.success('Hold saved successfully')
      setHoldName('')
      setIsHoldDialogOpen(false)
      onClearCart()
    } catch (error: any) {
      toast.error('Failed to save hold: ' + error.message)
    }
  }

  const loadHolds = async () => {
    setIsLoadingHolds(true)
    try {
      const holdsData = await apiService.getHolds()
      setHolds(holdsData)
    } catch (error: any) {
      toast.error('Failed to load holds: ' + error.message)
    } finally {
      setIsLoadingHolds(false)
    }
  }

  const handleViewHolds = async () => {
    setIsViewHoldsOpen(true)
    await loadHolds()
  }

  const handleLoadHold = async (hold: any) => {
    try {
      // Clear current cart and load hold items
      onClearCart()

      // Add each item from the hold to the cart
      hold.items.forEach((item: CartItem) => {
        // Convert CartItem back to Product format for onAddItem
        const product = {
          id: item.id,
          name: item.name,
          price: item.price,
          code: item.code
        }

        // Add the item multiple times based on quantity
        for (let i = 0; i < item.quantity; i++) {
          onAddItem(product)
        }
      })

      // Delete the hold after successfully loading it
      await apiService.deleteHold(hold.id)

      toast.success(`Hold "${hold.name}" loaded and removed from holds`)
      setIsViewHoldsOpen(false)

      // Refresh the holds list in case the dialog is opened again
      await loadHolds()
    } catch (error: any) {
      toast.error('Failed to load hold: ' + error.message)
    }
  }

  const handleDeleteHold = async (holdId: string) => {
    try {
      await apiService.deleteHold(holdId)
      toast.success('Hold deleted successfully')
      await loadHolds() // Refresh the list
    } catch (error: any) {
      toast.error('Failed to delete hold: ' + error.message)
    }
  }
  return (
    <div className="w-[35vw]  bg-white border-r overflow-y-auto border-gray-200 flex flex-col">
      {/* Transaction Lines */}
      <div className="flex-1 p-4">
        <Card>
          <CardHeader className="">
            <CardTitle className="text-sm text-[#b2d93b] font-bold">
              Invoice Number : <span className="text-[#052315]  "> {saleRef}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[40dvh] ">
            <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-600 border-b border-gray-200 pb-2">
              <span>LINE</span>
              <span className="col-span-2">DESCRIPTION</span>
              <span>PRICE</span>
              <span>QTY</span>
              <span>AMOUNT</span>
              <span></span>
            </div>
            {/* Cart items */}
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-xs">No items in cart</div>
            ) : (
              <>
                <div className="max-h-[35dvh] overflow-y-auto">
                  {cartItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-7 gap-2 text-xs py-2 border-b border-gray-100"
                    >
                      <span className="flex items-center">{index + 1}</span>
                      <span className="col-span-2 flex items-center text-xs leading-tight">
                        {item.name}
                      </span>
                      <span className="flex items-center">{formatPriceBySymbol(item.price)}</span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="flex items-center font-medium">
                        {formatPriceBySymbol(item.price * item.quantity)}
                      </span>
                      <div className="flex items-center">
                        <button
                          onClick={() => onRemoveFromCart(item.id)}
                          className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Simple Cart Total */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-gray-900">
                      {formatPriceBySymbol(
                        cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                      )}
                    </span>
                  </div>
                </div>
              </>
            )}
            {/* Add item input */}
            {/* <div className="pt-2 space-y-2">
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

              //  Search Result
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
            </div> */}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-2 flex space-x-2 px-4">
        <Dialog open={isHoldDialogOpen} onOpenChange={setIsHoldDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="lg" className="justify-start">
              HOLD
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Hold</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="holdName">Hold Name</Label>
                <Input
                  id="holdName"
                  value={holdName}
                  onChange={(e) => setHoldName(e.target.value)}
                  placeholder="Enter a name for this hold..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsHoldDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveHold}>Save Hold</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewHoldsOpen} onOpenChange={setIsViewHoldsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="lg" className="justify-start" onClick={handleViewHolds}>
              <Eye className="w-4 h-4 mr-2" />
              VIEW HOLDS
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Saved Holds</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {isLoadingHolds ? (
                <div className="text-center py-4">Loading holds...</div>
              ) : holds.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No holds saved</div>
              ) : (
                holds.map((hold) => (
                  <div key={hold.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{hold.name}</h3>
                        <p className="text-sm text-gray-500">
                          {hold.items.length} items • {formatPriceBySymbol(hold.total_amount)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(hold.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleLoadHold(hold)}>
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteHold(hold.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Items: {hold.items.map((item: CartItem) => item.name).join(', ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="lg"
          className="justify-start text-red-600 hover:text-red-700"
          onClick={onClearCart}
        >
          CLEAR CART
        </Button>
      </div>
    </div>
  )
}
