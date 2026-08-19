import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from '../../components/admin/Header';

const PAGE_TITLES: Record<string, string> = {
  '/admin':              'Dashboard',   // index route fix
  '/admin/dashboard':    'Dashboard',
  '/admin/products':     'Inventory',
  '/admin/products/add': 'New Creation',
  '/admin/orders':       'Transactions',
  '/admin/users':        'Registry',
  '/admin/analytics':    'Performance',
  '/admin/spa':          'Spa & Bookings', // Fix 4
};

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname: string) =>
    PAGE_TITLES[pathname] ?? 'Management';

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-tertiary-fixed relative overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
        <Header
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          title={getPageTitle(location.pathname)}
        />

        <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8 overflow-y-auto">
          <Outlet />
        </div>

        <footer className="w-full bg-stone-100 dark:bg-stone-900/50 py-4 px-8 border-t border-stone-200/20 mt-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-[10px] tracking-widest uppercase text-stone-400">
            © 2024 Claire Skiin Boutique. All rights reserved.
          </p>
          <div className="flex gap-4 md:gap-8">
            <a className="font-body text-[10px] tracking-widest uppercase text-stone-400 hover:text-primary transition-colors underline underline-offset-4" href="#">System Status</a>
            <a className="font-body text-[10px] tracking-widest uppercase text-stone-400 hover:text-primary transition-colors underline underline-offset-4" href="#">Documentation</a>
            <a className="font-body text-[10px] tracking-widest uppercase text-stone-400 hover:text-primary transition-colors underline underline-offset-4" href="#">Support</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AdminLayout;
