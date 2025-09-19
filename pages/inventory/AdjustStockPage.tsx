import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockApi } from '../../services/mockApi';
import { InventoryItem } from '../../types';
import { formatGbp } from '../../utils/money';
import { ArrowLeftIcon } from '../../components/icons';

const AdjustStockPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [currentStock, setCurrentStock] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!itemId) {
        navigate('/app/inventory');
        return;
    }
    setIsLoading(true);
    try {
      const fetchedItem = await mockApi.getInventoryItem(itemId);
      if (fetchedItem) {
        setItem(fetchedItem);
        setCurrentStock(fetchedItem.stockQty);
      } else {
        setError('Inventory item not found.');
      }
    } catch (e) {
      setError('Failed to load inventory item.');
    } finally {
      setIsLoading(false);
    }
  }, [itemId, navigate]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);
  
  const handleAdjust = (amount: number) => {
      setCurrentStock(prev => Math.max(0, prev + amount));
  };
  
  const handleSave = async () => {
      if(!item) return;
      setIsSaving(true);
      try {
          await mockApi.updateInventoryItem(item.id, { stockQty: currentStock });
          navigate('/app/inventory');
      } catch (e) {
          setError('Failed to save stock update.');
      } finally {
          setIsSaving(false);
      }
  };

  if (isLoading) return <div className="p-4 text-center">Loading item...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!item) return <div className="p-4 text-center">Item not found.</div>;

  return (
    <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
            <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>

      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">{item.name}</h1>
        <p className="text-sm text-gray-500">{item.sku} - {item.brand}</p>
        <p className="text-lg font-semibold mt-1">{formatGbp(item.price)}</p>

        <div className="my-8 text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Current Stock</p>
            <div className="flex items-center justify-center gap-6">
                <button onClick={() => handleAdjust(-1)} className="w-16 h-16 bg-gray-200 text-gray-800 rounded-full text-4xl font-bold flex items-center justify-center hover:bg-gray-300 active:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">-</button>
                <span className="text-7xl font-bold w-32 text-center">{currentStock}</span>
                <button onClick={() => handleAdjust(1)} className="w-16 h-16 bg-gray-200 text-gray-800 rounded-full text-4xl font-bold flex items-center justify-center hover:bg-gray-300 active:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">+</button>
            </div>
        </div>
        
        <button
            onClick={handleSave}
            disabled={isSaving || currentStock === item.stockQty}
            className="w-full text-lg px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
            {isSaving ? "Saving..." : "Save Stock Level"}
        </button>
      </div>
    </div>
  );
};

export default AdjustStockPage;
