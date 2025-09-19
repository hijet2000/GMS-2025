import React, { useState, useEffect } from 'react';
import { useSync } from '../../App';
import { syncQueue } from '../../services/syncQueue';
// FIX: Import specific payload types to use with type assertions.
import { SyncAction, OfflineScanPayload, UpdateInventoryPayload } from '../../types';

const OfflineQueuePage: React.FC = () => {
  const { isOnline, syncNow } = useSync();
  const [queue, setQueue] = useState<SyncAction[]>(syncQueue.getQueue());

  useEffect(() => {
    const handleQueueChange = () => {
      setQueue(syncQueue.getQueue());
    };
    syncQueue.subscribe(handleQueueChange);
    return () => syncQueue.unsubscribe(handleQueueChange);
  }, []);
  
  const getActionDescription = (action: SyncAction): string => {
      // FIX: Use type assertions within each case to correctly access payload properties for the discriminated union.
      // Also, handle all possible action types for a more descriptive UI.
      switch (action.type) {
          case 'UPDATE_INVENTORY_ITEM': {
              const payload = action.payload as UpdateInventoryPayload;
              return `Update stock for item ${payload.itemId} to ${payload.updates.stockQty ?? '[not specified]'}`;
          }
          case 'OFFLINE_SCAN_ADD_TO_WO': {
              const payload = action.payload as OfflineScanPayload;
              return `Add part SKU ${payload.sku} (Qty: ${payload.quantity}) to WO#${payload.workOrderId}`;
          }
          default:
              return `Unknown action: ${action.type}`;
      }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Offline Action Queue</h1>
      <p className="text-gray-600 mb-6">These actions were performed while offline and will be synced automatically when a connection is restored.</p>

      <div className="flex justify-between items-center mb-4">
        <div className={`text-sm font-semibold px-3 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          Status: {isOnline ? 'Online' : 'Offline'}
        </div>
        <button 
            onClick={syncNow}
            disabled={!isOnline || queue.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            Sync Now
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Action</th>
                <th scope="col" className="px-6 py-3">Timestamp</th>
                <th scope="col" className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(action => (
                <tr key={action.id} className="bg-white border-b">
                  <td className="px-6 py-4 font-medium text-gray-900">{action.type}</td>
                  <td className="px-6 py-4">{new Date(action.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-500">{getActionDescription(action)}</td>
                </tr>
              ))}
              {queue.length === 0 && (
                  <tr>
                      <td colSpan={3} className="text-center p-8 text-gray-500">
                          The sync queue is empty.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OfflineQueuePage;