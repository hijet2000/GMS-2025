import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CameraScanner from '../../components/CameraScanner';
import { mockApi } from '../../services/mockApi';
import { InventoryItem, WorkOrderLineItem } from '../../types';
import ScannedItemModal from '../../components/ScannedItemModal';
import DisambiguationModal from '../../components/DisambiguationModal';
import { useSync } from '../../App';
import { syncQueue } from '../../services/syncQueue';

const InventoryScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useSync();
  const { workOrderId } = location.state || {};

  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const handleScanSuccess = async (scannedSku: string) => {
    setIsLoading(true);
    setError(null);
    setScanResult(null);
    setSelectedItem(null);
    try {
      const items = await mockApi.getInventoryItemsBySku(scannedSku);
      if (items.length === 0) {
        if (!isOnline && workOrderId) {
            // Offline and for a work order, so queue it
            syncQueue.addAction({
                type: 'OFFLINE_SCAN_ADD_TO_WO',
                payload: { sku: scannedSku, quantity: 1, workOrderId }
            });
            alert(`Offline: Part with SKU ${scannedSku} queued to be added to Work Order ${workOrderId}.`);
            navigate(`/app/work-orders/${workOrderId}`);
        } else {
            setError(`Part with SKU "${scannedSku}" not found in inventory.`);
        }
      } else if (items.length === 1) {
        setSelectedItem(items[0]);
      } else {
        setScanResult(items);
      }
    } catch (e) {
      setError('An error occurred while looking up the item.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setError(null);
    setScanResult(null);
    setSelectedItem(null);
  };

  const handleCancelScan = () => {
    navigate(-1);
  };

  const handleAddToWorkOrder = async (item: InventoryItem, quantity: number) => {
    if (!workOrderId) return;
    const newItem: Omit<WorkOrderLineItem, 'id'> = {
        description: `${item.name} (${item.brand})`,
        quantity,
        unitPrice: item.price,
        isVatable: true,
        type: 'part'
    };
    await mockApi.addLineItem(workOrderId, newItem);
    navigate(`/app/work-orders/${workOrderId}`);
  };

  return (
    <>
      <CameraScanner
        mode="barcode"
        onScanSuccess={handleScanSuccess}
        onCancel={handleCancelScan}
      />
      
      {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center text-white">
              <p>Looking up item...</p>
          </div>
      )}

      {error && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleModalClose}>
              <div className="bg-white p-6 rounded-lg text-center" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-red-600">Error</h3>
                  <p className="my-4">{error}</p>
                  <button onClick={handleModalClose} className="px-4 py-2 bg-gray-200 rounded-md">Close</button>
              </div>
          </div>
      )}

      {scanResult && (
        <DisambiguationModal 
            items={scanResult}
            onClose={handleModalClose}
            onSelect={(item) => {
                setScanResult(null);
                setSelectedItem(item);
            }}
        />
      )}

      {selectedItem && (
          <ScannedItemModal
            item={selectedItem}
            workOrderId={workOrderId}
            onClose={handleModalClose}
            onAddToWorkOrder={handleAddToWorkOrder}
            onAdjustStock={(item) => navigate(`/app/inventory/adjust/${item.id}`)}
          />
      )}
    </>
  );
};

export default InventoryScannerPage;
