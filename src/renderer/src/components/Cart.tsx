import * as React from 'react';
import { useState } from 'react'
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

const Cart: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: '1', name: 'MERBA CHOCO CHIP COOKIES 150G', quantity: 1, price: 2950, subtotal: 2950 },
    { id: '2', name: 'MERBA TRIPLE CHOCOLATE COOKIES', quantity: 1, price: 2300, subtotal: 2300 },
    { id: '3', name: 'BEST DREAM PURPLE COOKIES', quantity: 1, price: 450, subtotal: 450 },
  ]);

  const [tax, setTax] = useState('');
  const [discountType, setDiscountType] = useState('fixed');
  const [discount, setDiscount] = useState('');
  const [shipping, setShipping] = useState('');

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = tax ? (subtotal * parseFloat(tax)) / 100 : 0;
  const discountAmount = discount ? parseFloat(discount) : 0;
  const shippingAmount = shipping ? parseFloat(shipping) : 0;
  const total = subtotal + taxAmount - discountAmount + shippingAmount;

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(items => items.filter(item => item.id !== id));
    } else {
      setCartItems(items =>
        items.map(item =>
          item.id === id
            ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
            : item
        )
      );
    }
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      <Card className="flex-1 rounded-none border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Transaction</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Product List */}
          <div className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">PRODUCT</TableHead>
                  <TableHead className="text-xs">QTY</TableHead>
                  <TableHead className="text-xs">SUB TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm py-2">
                      <div className="max-w-32">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-6 h-6 p-0 text-xs"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="text-sm w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-6 h-6 p-0 text-xs"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatPrice(item.subtotal)}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-6 h-6 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removeItem(item.id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total QTY : {totalQuantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Sub Total : {formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total : {formatPrice(total)}</span>
            </div>
          </div>

          {/* Payment Adjustments */}
          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Discount</label>
              <div className="flex gap-2 mb-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={discountType === 'fixed'}
                    onChange={() => setDiscountType('fixed')}
                    className="w-3 h-3"
                  />
                  Fixed
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={discountType === 'percentage'}
                    onChange={() => setDiscountType('percentage')}
                    className="w-3 h-3"
                  />
                  Percentage
                </label>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm">
                  {discountType === 'fixed' ? '₦' : '%'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Shipping</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm">₦</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t pt-4 space-y-2">
            <Button className="w-full bg-green-100 text-green-800 border-green-300 hover:bg-green-200">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
              Hold
            </Button>
            <Button className="w-full bg-[#062417] hover:bg-[#09351f]">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </Button>
            <Button className="w-full bg-[#062417] hover:bg-[#09351f]">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cart; 