import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { DashboardIcon, WorkOrderIcon, InventoryIcon, QrCodeIcon, UsersIcon } from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  permission: keyof ReturnType<typeof usePermissions>;
}

const MobileBottomNav: React.FC = () => {
  const permissions = usePermissions();

  const navItems: NavItem[] = [
    { to: '/app/dashboard', label: 'Dashboard', icon: <DashboardIcon />, permission: 'canViewDashboard' },
    { to: '/app/work-orders', label: 'Jobs', icon: <WorkOrderIcon />, permission: 'canViewWorkOrders' },
    { to: '/app/scan', label: 'Scan', icon: <QrCodeIcon />, permission: 'canScan' },
    { to: '/app/inventory', label: 'Inventory', icon: <InventoryIcon />, permission: 'canViewInventory' },
    { to: '/app/hr', label: 'HR', icon: <UsersIcon />, permission: 'canManageHR' },
  ];

  const visibleItems = navItems.filter(item => permissions[item.permission]);
  
  const navLinkClasses = "flex flex-col items-center justify-center text-gray-500 w-full pt-2 pb-1";
  const activeNavLinkClasses = "text-blue-600";

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex md:hidden z-20">
      {visibleItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}
        >
          {item.icon}
          <span className="text-xs mt-1">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileBottomNav;