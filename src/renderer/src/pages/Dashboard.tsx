import * as React from 'react';
import Header from '../components/Header';
import Products from '../components/Products';
import Cart from '../components/Cart';
import { ProductSyncStatus } from '../components/ProductSyncStatus';

const Dashboard: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="p-4">
            <ProductSyncStatus />
          </div>
          <div className="flex-1 flex overflow-hidden">
            <Products />
            <Cart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 