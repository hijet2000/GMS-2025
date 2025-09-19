import React from 'react';
import { InventoryItem } from '../types';
import Modal from './Modal';
import { formatGbp } from '../utils/money';

interface DisambiguationModalProps {
  items: InventoryItem[];
  onSelect: (item: InventoryItem) => void;
  onClose: () => void;
}

const DisambiguationModal: React.FC<DisambiguationModalProps> = ({ items, onSelect, onClose }) => {
  return (
    <Modal isOpen={true} onClose={onClose} title="Multiple Items Found">
      <div>
        <p className="text-sm text-gray-600 mb-4">
          This SKU matches multiple items in your inventory. Please select the correct one.
        </p>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {items.map(item => (
            <li
              key={item.id}
              onClick={() => onSelect(item)}
              className="p-3 border rounded-md hover:bg-gray-100 cursor-pointer"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.brand}</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold">{formatGbp(item.price)}</p>
                    <p className="text-sm text-gray-500">Stock: {item.stockQty}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default DisambiguationModal;
