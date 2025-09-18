import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { mockApi } from '../services/mockApi';
import { WorkOrder, WorkOrderStatus, GarageSettings } from '../types';
import { SearchIcon, ChevronDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from '../components/icons';
import { useDebounce } from '../hooks/useDebounce';
import { calculateWorkOrderTotals, formatGbp } from '../utils/money';
import ErrorState from '../components/ErrorState';

// --- Helper Functions & Hooks ---

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = sessionStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key “${key}”:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};

// --- Sub-components ---

const statusColors: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.NEW]: 'bg-gray-200 text-gray-800',
  [WorkOrderStatus.IN_PROGRESS]: 'bg-blue-200 text-blue-800',
  [WorkOrderStatus.AWAITING_PARTS]: 'bg-yellow-200 text-yellow-800',
  [WorkOrderStatus.AWAITING_CUSTOMER]: 'bg-orange-200 text-orange-800',
  [WorkOrderStatus.READY]: 'bg-purple-200 text-purple-800',
  [WorkOrderStatus.COMPLETED]: 'bg-green-200 text-green-800',
  [WorkOrderStatus.INVOICED]: 'bg-pink-200 text-pink-800',
};

type SortConfig = { key: keyof WorkOrder | 'total'; direction: 'ascending' | 'descending' } | null;
type SortableHeaderProps = {
    title: string;
    sortKey: SortConfig['key'];
    sortConfig: SortConfig;
    setSortConfig: (config: SortConfig) => void;
};

const SortableHeader: React.FC<SortableHeaderProps> = ({ title, sortKey, sortConfig, setSortConfig }) => {
    const isSorted = sortConfig?.key === sortKey;
    const isAscending = sortConfig?.direction === 'ascending';

    const handleClick = () => {
        if (isSorted) {
            setSortConfig({ key: sortKey, direction: isAscending ? 'descending' : 'ascending' });
        } else {
            setSortConfig({ key: sortKey, direction: 'descending' });
        }
    };
    
    const Icon = isSorted ? (isAscending ? ArrowUpIcon : ChevronDownIcon) : ArrowsUpDownIcon;

    return (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={handleClick}>
            <div className="flex items-center gap-2">
                {title}
                <Icon className={`w-4 h-4 ${isSorted ? 'text-gray-800' : 'text-gray-400'}`} />
            </div>
        </th>
    );
};

// --- Main Page Component ---

const WorkOrdersPage: React.FC = () => {
  const [allWorkOrders, setAllWorkOrders] = useState<WorkOrder[]>([]);
  const [settings, setSettings] = useState<GarageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = usePersistentState('wo_search', '');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = usePersistentState<WorkOrderStatus[]>('wo_statusFilter', []);
  const [sortConfig, setSortConfig] = usePersistentState<SortConfig>('wo_sortConfig', { key: 'lastUpdatedAt', direction: 'descending' });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [woData, settingsData] = await Promise.all([
        mockApi.getWorkOrders(),
        mockApi.getGarageSettings()
      ]);
      setAllWorkOrders(woData);
      setSettings(settingsData);
    } catch (err) {
      setError('Failed to fetch work orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAndSortedWorkOrders = useMemo(() => {
    let filtered = [...allWorkOrders];

    if (debouncedSearchQuery) {
      const lowercasedQuery = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(wo =>
        wo.id.toLowerCase().includes(lowercasedQuery) ||
        wo.customerName.toLowerCase().includes(lowercasedQuery) ||
        wo.vrm.toLowerCase().includes(lowercasedQuery)
      );
    }

    if (statusFilter.length > 0) {
      filtered = filtered.filter(wo => statusFilter.includes(wo.status));
    }

    if (sortConfig && settings) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'total') {
            aValue = calculateWorkOrderTotals(a.lineItems, settings.vatRate).gross;
            bValue = calculateWorkOrderTotals(b.lineItems, settings.vatRate).gross;
        } else {
            aValue = a[sortConfig.key as keyof WorkOrder];
            bValue = b[sortConfig.key as keyof WorkOrder];
        }
        // FIX: Ensure correct type comparison for sorting. `aValue` and `bValue` can be strings or numbers.
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allWorkOrders, debouncedSearchQuery, statusFilter, sortConfig, settings]);

  const WorkOrderRow: React.FC<{ workOrder: WorkOrder }> = ({ workOrder }) => {
    const grossTotal = useMemo(() => {
        if (!settings) return 0;
        return calculateWorkOrderTotals(workOrder.lineItems, settings.vatRate).gross;
    }, [workOrder.lineItems, settings]);

    return (
        <tr className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4 font-medium text-blue-600 whitespace-nowrap"><Link to={`/app/work-orders/${workOrder.id}`} className="hover:underline">{workOrder.id}</Link></td>
            <td className="px-6 py-4">{workOrder.vrm}</td>
            <td className="px-6 py-4">{workOrder.customerName}</td>
            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[workOrder.status]}`}>{workOrder.status}</span></td>
            <td className="px-6 py-4">{new Date(workOrder.lastUpdatedAt).toLocaleString()}</td>
            <td className="px-6 py-4">{new Date(workOrder.createdAt).toLocaleDateString()}</td>
            <td className="px-6 py-4 text-right font-medium">{formatGbp(grossTotal)}</td>
            <td className="px-6 py-4 text-center">...</td>
        </tr>
    );
  };
  
  const StatusFilterDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleStatusToggle = (status: WorkOrderStatus) => {
        setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                Status {statusFilter.length > 0 && `(${statusFilter.length})`}
                <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" />
            </button>
            {isOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        {Object.values(WorkOrderStatus).map(status => (
                            <label key={status} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <input
                                    type="checkbox"
                                    checked={statusFilter.includes(status)}
                                    onChange={() => handleStatusToggle(status)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3">{status}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

  if (error && !isLoading) {
    return <div className="p-4"><ErrorState message={error} onRetry={fetchData} /></div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Work Orders</h1>
        <div className="flex items-center gap-4">
            <div className="relative">
                 <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                 <input
                    type="text"
                    placeholder="Search ID, VRM, Customer..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-64 rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
            </div>
            <StatusFilterDropdown />
            <Link to="/app/check-in" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                New Check-In
            </Link>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">ID</th>
                <th scope="col" className="px-6 py-3">VRM</th>
                <th scope="col" className="px-6 py-3">Customer</th>
                <SortableHeader title="Status" sortKey="status" sortConfig={sortConfig} setSortConfig={setSortConfig} />
                <SortableHeader title="Last Updated" sortKey="lastUpdatedAt" sortConfig={sortConfig} setSortConfig={setSortConfig} />
                <SortableHeader title="Created" sortKey="createdAt" sortConfig={sortConfig} setSortConfig={setSortConfig} />
                <SortableHeader title="Total (Gross)" sortKey="total" sortConfig={sortConfig} setSortConfig={setSortConfig} />
                <th scope="col" className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-10">Loading work orders...</td></tr>
              )}
              {!isLoading && !error && filteredAndSortedWorkOrders.map(wo => <WorkOrderRow key={wo.id} workOrder={wo} />)}
            </tbody>
          </table>
          {!isLoading && filteredAndSortedWorkOrders.length === 0 && (
            <div className="text-center py-10 text-gray-500">No work orders match the current filters.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkOrdersPage;