import * as React from 'react';
import Header from '../components/Header';
import Products from '../components/Products';
import Cart from '../components/Cart';

const Dashboard: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Products />
        <Cart />
        {/* <h1>ghghghgh</h1> */}
      </div>
    </div>
  );
};

export default Dashboard; 