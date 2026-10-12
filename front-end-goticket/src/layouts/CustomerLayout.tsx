import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../shared/presentation/components/Navbar';
import { Footer } from '../shared/presentation/components/Footer';

export const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#111827] relative selection:bg-[#FF385C]/20 selection:text-[#FF385C]">
      {/* Ambient lighting spots for glass refraction */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-[#FFF0F2]/60 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-10 w-[30rem] h-[30rem] bg-gradient-to-tl from-[#FFF4EA]/50 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
