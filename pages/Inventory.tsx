import React, { useState, useEffect, useMemo } from 'react';
import { mockApi } from '../services/mockApi';
import { InventoryItem } from '../types';
import { SearchIcon } from '../components/icons';
import InventoryEditDrawer from '../components/InventoryEditDrawer';
import { useDebounce } from '../hooks/useDebounce';
import { formatGbp } from '../utils/money';
import ErrorState from '../components/ErrorState';

type StockStatus = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

// --- Sub-components ---

const StockStatusBadge: React.FC<{ item: InventoryItem }> = ({ item }) => {
    if (item.stockQty <= 0) {
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Out of Stock</span>;
    }
    if (item.stockQty <= item.lowStockThreshold) {
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Low Stock</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">In Stock</span>;
};

const FilterButton: React.FC<{ currentFilter: StockStatus; filter: StockStatus; setFilter: (f: StockStatus) => void; children: React.ReactNode }> =
({ currentFilter, filter, setFilter, children }) => {
    const isActive = currentFilter === filter;
    const activeClasses = "bg-blue-600 text-white";
    const inactiveClasses = "bg-white text-gray-700 hover:bg-gray-100";
    return (
        <button onClick={() => setFilter(filter)} className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm border ${isActive ? activeClasses : inactiveClasses}`}>
            {children}
        </button>
    );
};


// --- Main Page Component ---
const InventoryPage: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [statusFilter, setStatusFilter] = useState<StockStatus>('all');
    
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    const fetchInventory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await mockApi.getInventory();
            setInventory(data);
        } catch (err) {
            setError('Failed to fetch inventory.');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchInventory();
    }, []);

    const filteredInventory = useMemo(() => {
        return inventory
            .filter(item => {
                if (statusFilter === 'in-stock') return item.stockQty > item.lowStockThreshold;
                if (statusFilter === 'low-stock') return item.stockQty > 0 && item.stockQty <= item.lowStockThreshold;
                if (statusFilter === 'out-of-stock') return item.stockQty <= 0;
                return true; // 'all'
            })
            .filter(item => {
                const query = debouncedSearchQuery.toLowerCase();
                return item.sku.toLowerCase().includes(query) ||
                       item.name.toLowerCase().includes(query) ||
                       item.brand.toLowerCase().includes(query);
            });
    }, [inventory, debouncedSearchQuery, statusFilter]);

    const handleRowClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsDrawerOpen(true);
    };
    
    const handleDrawerClose = () => {
        setIsDrawerOpen(false);
        setSelectedItem(null);
    };
    
    const handleSaveItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        try {
            const updatedItem = await mockApi.updateInventoryItem(itemId, updates);
            setInventory(prev => prev.map(item => item.id === itemId ? updatedItem : item));
            handleDrawerClose();
        } catch (e) {
            console.error("Failed to save item", e);
            // In a real app, show a toast notification here
        }
    };

    return (
        <div>
            {selectedItem && (
                <InventoryEditDrawer 
                    item={selectedItem} 
                    isOpen={isDrawerOpen} 
                    onClose={handleDrawerClose} 
                    onSave={handleSaveItem}
                />
            )}

            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search SKU, name, brand..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-64 rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
                <FilterButton currentFilter={statusFilter} filter="all" setFilter={setStatusFilter}>All</FilterButton>
                <FilterButton currentFilter={statusFilter} filter="in-stock" setFilter={setStatusFilter}>In Stock</FilterButton>
                <FilterButton currentFilter={statusFilter} filter="low-stock" setFilter={setStatusFilter}>Low Stock</FilterButton>
                <FilterButton currentFilter={statusFilter} filter="out-of-stock" setFilter={setStatusFilter}>Out of Stock</FilterButton>
            </div>
            
            {error && !isLoading ? (
                 <ErrorState message={error} onRetry={fetchInventory} />
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">SKU</th>
                                    <th scope="col" className="px-6 py-3">Name</th>
                                    <th scope="col" className="px-6 py-3">Brand</th>
                                    <th scope="col" className="px-6 py-3 text-right">Stock Qty</th>
                                    <th scope="col" className="px-6 py-3 text-right">Price</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && (
                                    <tr><td colSpan={6} className="text-center py-10">Loading inventory...</td></tr>
                                )}
                                {!isLoading && !error && filteredInventory.map(item => (
                                    <tr key={item.id} onClick={() => handleRowClick(item)} className="bg-white border-b hover:bg-gray-50 cursor-pointer">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.sku}</td>
                                        <td className="px-6 py-4">{item.name}</td>
                                        <td className="px-6 py-4">{item.brand}</td>
                                        <td className="px-6 py-4 text-right">{item.stockQty}</td>
                                        <td className="px-6 py-4 text-right">{formatGbp(item.price)}</td>
                                        <td className="px-6 py-4"><StockStatusBadge item={item} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!isLoading && filteredInventory.length === 0 && (
                            <div className="text-center py-10 text-gray-500">No inventory items match the current filters.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryPage;