import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'User Management',
  '/challenges': 'Challenge Management',
  '/communities': 'Community Management',
  '/reports': 'Reports',
  '/coins': 'Coins & Transactions',
  '/notifications': 'Notifications',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'Admin';

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-800 flex items-center gap-4 px-4 lg:px-6 shrink-0 bg-slate-950/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-slate-100 text-lg">{title}</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
