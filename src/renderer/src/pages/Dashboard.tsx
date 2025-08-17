import React from 'react'
import { useAuthStore } from '@renderer/store/auth'
import { useProductsStore } from '@renderer/store/products'
import { ProductSyncStatus } from '@renderer/components/ProductSyncStatus'
import { Products } from '@renderer/components/Products'

import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { 
  Wifi, 
  WifiOff, 
  Calculator, 
  CreditCard, 
  User, 
  Search,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { searchProductByCode, addToCart, cartItems } = useProductsStore()
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [isOnline, setIsOnline] = React.useState(true) // Mock online status
  const [searchCode, setSearchCode] = React.useState('')
  const [searchResult, setSearchResult] = React.useState<any>(null)

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    })
  }

  const handleProductSearch = async () => {
    if (!searchCode.trim()) return
    
    try {
      const product = await searchProductByCode(searchCode.trim())
      if (product) {
        setSearchResult(product)
        // Auto-add to cart
        addToCart(product)
        setSearchCode('')
        setSearchResult(null)
      } else {
        setSearchResult({ error: 'Product not found' })
      }
    } catch (error) {
      setSearchResult({ error: 'Search failed' })
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleProductSearch()
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">X</span>
            </div>
            <span className="text-xl font-bold text-gray-900">XSEEN</span>
          </div>
          <span className="text-gray-600">POS : XSeen POS</span>
        </div>
        
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <span>Shift Date: {formatDate(currentTime)}</span>
          <span>Invoice No: 1</span>
          <span>Clerk: {user?.name || user?.username || 'User'}</span>
          <span>Time: {formatTime(currentTime)}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={isOnline ? "default" : "secondary"} className="flex items-center space-x-1">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? 'Connected' : 'Disconnected'}</span>
          </Badge>
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Transaction and Customer Details */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
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
                  <div className="text-center text-gray-500 py-4 text-xs">
                    No items in cart
                  </div>
                ) : (
                  cartItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-6 gap-2 text-xs py-1">
                      <span>{index + 1}</span>
                      <span className="col-span-2">{item.name}</span>
                      <span>{item.price.toFixed(3)}</span>
                      <span>{item.quantity}</span>
                      <span>{(item.price * item.quantity).toFixed(3)}</span>
                    </div>
                  ))
                )}
                
                {/* Add item input */}
                <div className="pt-2 space-y-2">
                  <Input 
                    placeholder="Search by product code..." 
                    className="text-xs h-8"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button 
                    onClick={handleProductSearch}
                    size="sm"
                    className="w-full text-xs h-8"
                  >
                    Search & Add
                  </Button>
                  
                  {/* Search Result */}
                  {searchResult && (
                    <div className={`text-xs p-2 rounded ${
                      searchResult.error 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {searchResult.error || `Added: ${searchResult.name}`}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calculator className="w-4 h-4 mr-2" />
                EXIT
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <CreditCard className="w-4 h-4 mr-2" />
                CR NOTE
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                REFUND
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                OPTIONS
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                HOLD
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                VOID
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                CANCEL
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                DISCOUNT
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                SERVICE
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={() => useProductsStore.getState().clearCart()}
              >
                CLEAR CART
              </Button>
            </div>

            {/* Customer and Payment Summary */}
            <div className="mt-4 space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Customer & Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input 
                    placeholder="CUSTOMER" 
                    className="text-xs h-8"
                  />
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Gross Amount:</span>
                      <span>{cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Tax Amount:</span>
                      <span>{(cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.15).toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Grand Total:</span>
                      <span>{(cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.15).toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span>0.000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Numeric Keypad */}
              <Card>
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <Button key={num} variant="outline" size="sm" className="h-10">
                        {num}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" className="h-10">0</Button>
                    <Button variant="outline" size="sm" className="h-10">.</Button>
                    <Button variant="outline" size="sm" className="h-10">*</Button>
                  </div>
                  
                  <div className="mt-2 flex space-x-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="keyboard" className="w-3 h-3" />
                      <label htmlFor="keyboard" className="text-xs">KEYBOARD</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="reference" className="w-3 h-3" />
                      <label htmlFor="reference" className="text-xs">REFERENCE</label>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex space-x-2">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button className="flex-1 h-8 text-xs">
                      ENTER →
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Balance and Pay */}
              <div className="flex space-x-2">
                <div className="flex-1 bg-red-100 border border-red-300 rounded p-2 text-center">
                  <div className="text-xs text-red-800 font-medium">Balance</div>
                  <div className="text-lg font-bold text-red-900">
                    {(cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.15).toFixed(3)}
                  </div>
                </div>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  <CreditCard className="w-4 h-4 mr-2" />
                  PAY
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Products and Sync Status */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Product Sync Status */}
          <div className="p-4">
            <ProductSyncStatus />
          </div>

          {/* Product Search and Filter */}
          <div className="px-4 pb-4">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search Product" 
                  className="h-10 pl-10"
                />
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
                <option>All Categories</option>
                <option>BISCUIT & COOKIES</option>
                <option>FRUITS</option>
                <option>DAIRY</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 px-4 pb-4 overflow-auto">
            <Products />
          </div>

          {/* Pagination Controls */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center space-x-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <span className="text-xs">⟪</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <span className="text-xs">⟨</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-orange-500 text-white border-orange-500">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                2
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                3
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                4
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <span className="text-xs">⟩</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <span className="text-xs">⟫</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 