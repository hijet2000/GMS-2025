

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useSync } from '../App';
import { DashboardIcon, CheckInIcon, WorkOrderIcon, InventoryIcon, SettingsIcon, BillingIcon, LogoutIcon, XMarkIcon, UsersIcon } from './icons';
import OfflineIndicator from './OfflineIndicator';
import { useMediaQuery } from '../hooks/useMediaQuery';
import MobileBottomNav from './MobileBottomNav';
import { usePermissions } from '../hooks/usePermissions';

const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const permissions = usePermissions();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/app/dashboard', label: 'Dashboard', icon: <DashboardIcon />, permission: permissions.canViewDashboard },
    { to: '/app/check-in', label: 'Check-In', icon: <CheckInIcon />, permission: permissions.canCheckIn },
    { to: '/app/work-orders', label: 'Work Orders', icon: <WorkOrderIcon />, permission: permissions.canViewWorkOrders },
    { to: '/app/inventory', label: 'Inventory', icon: <InventoryIcon />, permission: permissions.canViewInventory },
    { to: '/app/hr', label: 'HR', icon: <UsersIcon />, permission: permissions.canManageHR },
  ];

  const bottomNavItems = [
     { to: '/billing', label: 'Billing', icon: <BillingIcon />, permission: permissions.canViewBilling },
    { to: '/app/settings', label: 'Settings', icon: <SettingsIcon />, permission: permissions.canViewSettings },
    { to: '/app/offline/queue', label: 'Offline Queue', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" /></svg>, permission: permissions.canViewOfflineQueue },
  ]

  const navLinkClasses = "flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors duration-200";
  const activeNavLinkClasses = "bg-blue-600 text-white";

  return (
    <aside className="w-64 bg-gray-800 text-white flex-col hidden md:flex">
      <div className="px-6 py-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">GMS</h1>
        <p className="text-sm text-gray-400">AutoRepair Pros</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.filter(item => item.permission).map(item => (
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
         {bottomNavItems.filter(item => item.permission).map(item => (
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
    const { isOnline, pendingActionCount } = useSync();
    const navigate = useNavigate();

    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
             <div onClick={() => navigate('/app/dashboard')} className="cursor-pointer">
                <h1 className="text-lg font-bold text-gray-800">GMS</h1>
            </div>
            <div className="flex items-center gap-4">
                <OfflineIndicator isOnline={isOnline} pendingActions={pendingActionCount} />
                <span className="text-gray-600 mr-3 hidden sm:inline">{user?.name}</span>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {user?.name.charAt(0)}
                </div>
            </div>
        </header>
    )
}

const AppLayout: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div className="flex h-screen bg-gray-100">
      {!isMobile && <Sidebar />}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <Header />}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto mb-16 md:mb-0">
          <Outlet />
        </div>
        {isMobile && <MobileBottomNav />}
      </main>
    </div>
  );
};

export default AppLayout;