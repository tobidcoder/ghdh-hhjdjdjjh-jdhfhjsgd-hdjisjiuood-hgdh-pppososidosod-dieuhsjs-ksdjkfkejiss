import * as React from 'react';
import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useProductsStore } from '@renderer/store/products'

const Products: React.FC = () => {
  const {
    selectedCategory,
    setCategory,
    products,
    refresh,
    isLoading
  } = useProductsStore()

  const categories = [
    'All Categories',
    'BISCUIT & COOKIES',
    'BATTERIES',
    'BATHING SOAP',
    'BAKED SNACKS',
    'BAGS'
  ];

  useEffect(() => {
    void refresh()
  }, [])

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <Tabs value={selectedCategory} onValueChange={setCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6 overflow-x-auto ">
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category === 'All Categories' ? 'all' : category}
              className={`text-xs ${
                selectedCategory === (category === 'All Categories' ? 'all' : category)
                  ? 'bg-[#062417] text-white'
                  : 'bg-white text-gray-600'
              }`}
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-scroll h-[40vh]">
            {isLoading ? (
              <div className="col-span-full text-center text-sm text-gray-500">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center text-sm text-gray-500">No products</div>
            ) : filteredProducts.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-xs text-gray-500">NO IMAGE</span>
                    </div>
                    <Badge className="absolute top-0 right-0 text-xs bg-blue-500">Piece</Badge>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-lg font-bold text-[#062417]">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Products; 