import { useAuth } from '../App';
import { UserRole } from '../types';

type Permissions = {
  canViewDashboard: boolean;
  canCheckIn: boolean;
  canViewWorkOrders: boolean;
  canViewInventory: boolean;
  canScan: boolean;
  canViewSettings: boolean;
  canViewBilling: boolean;
  canViewOfflineQueue: boolean;
  canManageHR: boolean;
};

const permissionsByRole: Record<UserRole, Permissions> = {
  Manager: {
    canViewDashboard: true,
    canCheckIn: true,
    canViewWorkOrders: true,
    canViewInventory: true,
    canScan: true,
    canViewSettings: true,
    canViewBilling: true,
    canViewOfflineQueue: true,
    canManageHR: true,
  },
  Admin: {
    canViewDashboard: true,
    canCheckIn: true,
    canViewWorkOrders: true,
    canViewInventory: true,
    canScan: true,
    canViewSettings: true,
    canViewBilling: true,
    canViewOfflineQueue: true,
    canManageHR: true,
  },
  Technician: {
    canViewDashboard: true,
    canCheckIn: false,
    canViewWorkOrders: true,
    canViewInventory: true,
    canScan: true,
    canViewSettings: false,
    canViewBilling: false,
    canViewOfflineQueue: true,
    canManageHR: false,
  },
  'Service Advisor': {
    canViewDashboard: true,
    canCheckIn: true,
    canViewWorkOrders: true,
    canViewInventory: false,
    canScan: true,
    canViewSettings: false,
    canViewBilling: false,
    canViewOfflineQueue: true,
    canManageHR: false,
  }
};

const defaultPermissions: Permissions = {
    canViewDashboard: false,
    canCheckIn: false,
    canViewWorkOrders: false,
    canViewInventory: false,
    canScan: false,
    canViewSettings: false,
    canViewBilling: false,
    canViewOfflineQueue: false,
    canManageHR: false,
};

export const usePermissions = (): Permissions => {
  const { user } = useAuth();

  if (!user || !user.role) {
    return defaultPermissions;
  }

  return permissionsByRole[user.role] || defaultPermissions;
};