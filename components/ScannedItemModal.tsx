import React from 'react';
import { InventoryItem } from '../types';
import Modal from './Modal';
import { formatGbp } from '../utils/money';

interface ScannedItemModalProps {
  item: InventoryItem;
  workOrderId?: string;
  onClose: () => void;
  onAddToWorkOrder: (item: InventoryItem, quantity: number) => void;
  onAdjustStock: (item: InventoryItem) => void;
}

const ScannedItemModal: React.FC<ScannedItemModalProps> = ({
  item,
  workOrderId,
  onClose,
  onAddToWorkOrder,
  onAdjustStock,
}) => {
  return (
    <Modal isOpen={true} onClose={onClose} title="Item Found">
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-bold">{item.name}</h3>
          <p className="text-sm text-gray-500">{item.brand} - {item.sku}</p>
        </div>
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-600">Current Stock</p>
            <p className="text-3xl font-bold">{item.stockQty}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Price</p>
            <p className="text-3xl font-bold">{formatGbp(item.price)}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {workOrderId && (
            <button
              onClick={() => onAddToWorkOrder(item, 1)}
              className="w-full text-lg px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700"
            >
              Add to Work Order
            </button>
          )}
          <button
            onClick={() => onAdjustStock(item)}
            className="w-full text-lg px-6 py-3 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-700"
          >
            Adjust Stock
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ScannedItemModal;
