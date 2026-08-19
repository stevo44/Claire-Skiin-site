import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { name: 'Dashboard',    icon: 'dashboard',    path: '/admin/dashboard' },
  { name: 'Products',     icon: 'inventory_2',  path: '/admin/products'  },
  { name: 'Orders',       icon: 'shopping_bag', path: '/admin/orders'    },
  { name: 'Users',        icon: 'group',        path: '/admin/users'     },
  { name: 'Analytics',   icon: 'insights',     path: '/admin/analytics' },
  { name: 'Spa & Bookings', icon: 'spa',        path: '/admin/spa'       },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  // Active: exact match, OR /admin index resolves to dashboard
  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    // Prefix match for nested routes (e.g. /admin/products/add highlights Products)
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-full flex flex-col py-6 bg-stone-50 dark:bg-stone-950
        w-64 border-r border-stone-200/20 dark:border-stone-800/20
        shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-8 mb-12 flex justify-between items-center">
          <h1 className="font-serif text-xl text-tertiary">Claire Skiin</h1>
          <button onClick={onClose} className="lg:hidden text-stone-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 mb-8 flex-1">
          <p className="font-body uppercase tracking-wider text-[10px] text-stone-400 mb-4">Management</p>
          <nav className="space-y-1">
            {menuItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-body uppercase tracking-wider text-xs
                  ${isActive(item.path)
                    ? 'text-primary dark:text-primary-container font-bold border-r-2 border-tertiary bg-stone-100/50 dark:bg-stone-900'
                    : 'text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900'}
                `}
              >
                <span
                  className="material-symbols-outlined"
                  style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-6">
          <button className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-xl font-body uppercase tracking-widest text-[10px] font-bold hover:scale-105 transition-transform duration-300 shadow-lg shadow-primary/10">
            Generate Report
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
