import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../shared/presentation/components/Navbar';
import { Footer } from '../shared/presentation/components/Footer';

export const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#111827]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
