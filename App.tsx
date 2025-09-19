import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { User, Subscription, SyncAction, UpdateInventoryPayload, OfflineScanPayload, WorkOrderLineItem } from './types';
import { mockApi } from './services/mockApi';
import LoginPage from './pages/Login';
import BillingPage from './pages/Billing';
import DashboardPage from './pages/Dashboard';
import AppLayout from './components/AppLayout';
import WorkOrdersPage from './pages/WorkOrders';
import CheckInPage from './pages/CheckIn';
import WorkOrderDetailPage from './pages/WorkOrderDetailPage';
import InventoryPage from './pages/Inventory';
import SettingsPage from './pages/Settings';
import { syncQueue } from './services/syncQueue';
import ScanHubPage from './pages/scan/ScanHubPage';
import VrmScannerPage from './pages/scan/VrmScannerPage';
import InventoryScannerPage from './pages/scan/InventoryScannerPage';
import AdjustStockPage from './pages/inventory/AdjustStockPage';
import OfflineQueuePage from './pages/offline/OfflineQueuePage';
import HrHomePage from './pages/hr/HrHomePage';
import EmployeeProfilePage from './pages/hr/EmployeeProfilePage';

// --- OFFLINE/SYNC CONTEXT ---
interface SyncContextType {
  isOnline: boolean;
  pendingActionCount: number;
  syncNow: () => void;
}
const SyncContext = createContext<SyncContextType>({ isOnline: true, pendingActionCount: 0, syncNow: () => {} });
export const useSync = () => useContext(SyncContext);

// --- AUTH CONTEXT ---
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => useContext(AuthContext)!;

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActionCount, setPendingActionCount] = useState(syncQueue.getQueue().length);

  const processSyncQueue = useCallback(async () => {
    if (navigator.onLine && syncQueue.getQueue().length > 0) {
        console.log('Online, processing sync queue...');
        const actions = syncQueue.getQueue();
        for (const action of actions) {
            try {
                switch(action.type) {
                    case 'UPDATE_INVENTORY_ITEM': {
                        const payload = action.payload as UpdateInventoryPayload;
                        await mockApi.updateInventoryItem(payload.itemId, payload.updates);
                        break;
                    }
                    case 'OFFLINE_SCAN_ADD_TO_WO': {
                        const payload = action.payload as OfflineScanPayload;
                        const foundItems = await mockApi.getInventoryItemsBySku(payload.sku);
                        if (foundItems.length > 0) {
                            const item = foundItems[0]; // Take the first match for offline sync
                            const newItem: Omit<WorkOrderLineItem, 'id'> = {
                                description: `${item.name} (${item.brand})`,
                                quantity: payload.quantity,
                                unitPrice: item.price,
                                isVatable: true,
                                type: 'part'
                            };
                            await mockApi.addLineItem(payload.workOrderId, newItem);
                        } else {
                            console.warn(`Offline Action: Item with SKU ${payload.sku} not found during sync. Action will be retried later.`);
                            continue; // Skip removal, retry next time
                        }
                        break;
                    }
                }
                syncQueue.removeAction(action.id);
            } catch (error) {
                console.error('Failed to sync action:', action, error);
            }
        }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleQueueChange = () => {
        setPendingActionCount(syncQueue.getQueue().length);
    };
    syncQueue.subscribe(handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncQueue.unsubscribe(handleQueueChange);
    };
  }, [processSyncQueue]);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await mockApi.getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    checkUser();
    processSyncQueue(); // Initial check
  }, [processSyncQueue]);

  const login = async (email: string) => {
    const loggedInUser = await mockApi.login(email);
    if (loggedInUser) {
      setUser(loggedInUser);
    } else {
        throw new Error("Invalid credentials");
    }
  };

  const logout = () => {
    mockApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
        <SyncContext.Provider value={{ isOnline, pendingActionCount, syncNow: processSyncQueue }}>
            {children}
        </SyncContext.Provider>
    </AuthContext.Provider>
  );
};


// --- SUBSCRIPTION CONTEXT ---
interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  refetch: () => void;
}
const SubscriptionContext = createContext<SubscriptionContextType | null>(null);
export const useSubscription = () => useContext(SubscriptionContext)!;

const SubscriptionProvider: React.FC = () => {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSubscription = useCallback(async () => {
        if (user?.tenantId) {
            setIsLoading(true);
            const sub = await mockApi.getSubscription(user.tenantId);
            setSubscription(sub);
            setIsLoading(false);
        } else {
            setSubscription(null);
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    return (
        <SubscriptionContext.Provider value={{ subscription, isLoading, refetch: fetchSubscription }}>
            <Outlet />
        </SubscriptionContext.Provider>
    );
};


// --- ROUTE GUARDS ---
const AuthGuard: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const SubscriptionGuard: React.FC = () => {
    const { subscription, isLoading } = useSubscription();
    const location = useLocation();

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><div>Checking subscription...</div></div>;
    }

    const isAllowed = subscription?.status === 'active' || subscription?.status === 'trialing';

    if (!isAllowed) {
        return <Navigate to="/billing" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

// --- MAIN APP ---
function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          
          <Route element={<AuthGuard />}>
            <Route element={<SubscriptionProvider />}>
              <Route path="/billing" element={<BillingPage />} />
              <Route element={<SubscriptionGuard />}>
                <Route path="/app" element={<AppLayout />}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="check-in" element={<CheckInPage />} />
                  <Route path="work-orders" element={<WorkOrdersPage />} />
                  <Route path="work-orders/:workOrderId" element={<WorkOrderDetailPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/adjust/:itemId" element={<AdjustStockPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="scan" element={<ScanHubPage />} />
                  <Route path="offline/queue" element={<OfflineQueuePage />} />

                  {/* HR Routes */}
                  <Route path="hr" element={<HrHomePage />} />
                  <Route path="hr/employees/new" element={<EmployeeProfilePage />} />
                  <Route path="hr/employees/:employeeId" element={<EmployeeProfilePage />} />
                </Route>
                 {/* Full-screen routes without AppLayout chrome */}
                 <Route path="/app/scan/vrm" element={<VrmScannerPage />} />
                 <Route path="/app/scan/inventory" element={<InventoryScannerPage />} />
              </Route>
            </Route>
          </Route>
          
          <Route path="*" element={<div className="p-4">404 - Not Found</div>} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;