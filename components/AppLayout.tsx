
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { DashboardIcon, CheckInIcon, WorkOrderIcon, InventoryIcon, SettingsIcon, BillingIcon, LogoutIcon } from './icons';

const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/app/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/app/check-in', label: 'Check-In', icon: <CheckInIcon /> },
    { to: '/app/work-orders', label: 'Work Orders', icon: <WorkOrderIcon /> },
    { to: '/app/inventory', label: 'Inventory', icon: <InventoryIcon /> },
  ];

  const bottomNavItems = [
     { to: '/billing', label: 'Billing', icon: <BillingIcon /> },
    { to: '/app/settings', label: 'Settings', icon: <SettingsIcon /> },
  ]

  const navLinkClasses = "flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors duration-200";
  const activeNavLinkClasses = "bg-blue-600 text-white";

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="px-6 py-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">GMS</h1>
        <p className="text-sm text-gray-400">AutoRepair Pros</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </NavLink>
        ))}
      </nav>
       <div className="px-4 py-4 border-t border-gray-700 space-y-2">
         {bottomNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </NavLink>
          ))}
        <button onClick={handleLogout} className={`${navLinkClasses} w-full`}>
          <LogoutIcon />
          <span className="ml-3">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

const Header: React.FC = () => {
    const { user } = useAuth();
    return (
        <header className="bg-white shadow-sm p-4 flex justify-end items-center">
            <div className="flex items-center">
                <span className="text-gray-600 mr-3">{user?.name}</span>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {user?.name.charAt(0)}
                </div>
            </div>
        </header>
    )
}

const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
