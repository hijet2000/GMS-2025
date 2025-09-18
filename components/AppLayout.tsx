
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useSync } from '../App';
import { DashboardIcon, CheckInIcon, WorkOrderIcon, InventoryIcon, SettingsIcon, BillingIcon, LogoutIcon, XMarkIcon } from './icons';
import OfflineIndicator from './OfflineIndicator';

const MobileMenu: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };
  
    const navItems = [
        { to: '/app/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
        { to: '/app/check-in', label: 'Check-In', icon: <CheckInIcon /> },
        { to: '/app/work-orders', label: 'Work Orders', icon: <WorkOrderIcon /> },
        { to: '/app/inventory', label: 'Inventory', icon: <InventoryIcon /> },
        { to: '/billing', label: 'Billing', icon: <BillingIcon /> },
        { to: '/app/settings', label: 'Settings', icon: <SettingsIcon /> },
    ];
    const navLinkClasses = "flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors duration-200";
    const activeNavLinkClasses = "bg-blue-600 text-white";

  return (
    <>
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <div className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white flex flex-col z-40 transform transition-transform md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">GMS</h1>
            <p className="text-sm text-gray-400">AutoRepair Pros</p>
          </div>
           <button onClick={onClose} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
            {navItems.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}
                >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                </NavLink>
            ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
            <button onClick={handleLogout} className={`${navLinkClasses} w-full`}>
                <LogoutIcon />
                <span className="ml-3">Log Out</span>
            </button>
        </div>
      </div>
    </>
  );
};


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
    <aside className="w-64 bg-gray-800 text-white flex-col hidden md:flex">
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

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const { user } = useAuth();
    const { isOnline, pendingActionCount } = useSync();

    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
            <button onClick={onMenuClick} className="md:hidden text-gray-500 hover:text-gray-800">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div className="flex-1"></div> {/* Spacer */}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;