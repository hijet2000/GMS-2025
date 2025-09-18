import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { User, Subscription } from './types';
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

// --- OFFLINE/SYNC CONTEXT ---
interface SyncContextType {
  isOnline: boolean;
  pendingActionCount: number;
}
const SyncContext = createContext<SyncContextType>({ isOnline: true, pendingActionCount: 0 });
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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
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
  }, []);

  useEffect(() => {
    const processSyncQueue = async () => {
        if (isOnline && syncQueue.getQueue().length > 0) {
            console.log('Online, processing sync queue...');
            const actions = syncQueue.getQueue();
            for (const action of actions) {
                try {
                    if (action.type === 'UPDATE_INVENTORY_ITEM') {
                        await mockApi.updateInventoryItem(action.payload.itemId, action.payload.updates);
                    }
                    syncQueue.removeAction(action.id);
                } catch (error) {
                    console.error('Failed to sync action:', action, error);
                }
            }
        }
    };
    processSyncQueue();
  }, [isOnline]);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await mockApi.getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    checkUser();
  }, []);

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
        <SyncContext.Provider value={{ isOnline, pendingActionCount }}>
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

// Fix: Updated SubscriptionProvider to work as a layout route element.
// It no longer accepts `children` as a prop and instead renders an `<Outlet />`
// to display nested routes, aligning with react-router-dom v6 patterns.
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
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
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