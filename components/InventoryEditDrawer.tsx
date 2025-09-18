import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { InventoryItem } from '../types';
import { XMarkIcon } from './icons';

interface InventoryEditDrawerProps {
    item: InventoryItem;
    isOpen: boolean;
    onClose: () => void;
    onSave: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
}

const InputField: React.FC<{ label: string; id: string; type: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string, min?: string }> = 
({ label, id, type, value, onChange, step, min }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">
            <input
                type={type}
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                step={step}
                min={min}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
        </div>
    </div>
);


const InventoryEditDrawer: React.FC<InventoryEditDrawerProps> = ({ item, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name,
                brand: item.brand,
                price: item.price / 100, // convert from pence to pounds for display
                stockQty: item.stockQty,
                lowStockThreshold: item.lowStockThreshold
            });
            setError('');
        }
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleSave = async () => {
        if (formData.stockQty !== undefined && formData.stockQty < 0) {
            setError('Stock quantity cannot be negative.');
            return;
        }
        setError('');
        setIsSaving(true);
        const updates = { ...formData };
        if (updates.price !== undefined) {
            updates.price = Math.round(updates.price * 100); // convert back to pence
        }
        await onSave(item.id, updates);
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="relative z-40" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
            <div className="fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                        <div className="pointer-events-auto w-screen max-w-md transform transition ease-in-out duration-500"
                             style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}>
                            <div className="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                                <div className="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
                                    <div className="px-4 sm:px-6">
                                        <div className="flex items-start justify-between">
                                            <h2 className="text-lg font-medium text-gray-900" id="slide-over-title">{item.name}</h2>
                                            <div className="ml-3 flex h-7 items-center">
                                                <button type="button" onClick={onClose} className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                    <span className="sr-only">Close panel</span>
                                                    <XMarkIcon className="h-6 w-6" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-sm text-gray-500">{item.sku}</p>
                                        </div>
                                    </div>
                                    <div className="relative mt-6 flex-1 px-4 sm:px-6">
                                        <div className="space-y-4">
                                            <InputField label="Name" id="name" type="text" value={formData.name || ''} onChange={handleChange} />
                                            <InputField label="Brand" id="brand" type="text" value={formData.brand || ''} onChange={handleChange} />
                                            <InputField label="Price (£)" id="price" type="number" value={formData.price || 0} onChange={handleChange} step="0.01" min="0" />
                                            <InputField label="Stock Quantity" id="stockQty" type="number" value={formData.stockQty || 0} onChange={handleChange} min="0" />
                                            <InputField label="Low Stock Threshold" id="lowStockThreshold" type="number" value={formData.lowStockThreshold || 0} onChange={handleChange} min="0" />
                                            {error && <p className="text-sm text-red-600">{error}</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-shrink-0 justify-end px-4 py-4">
                                    <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Cancel</button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="ml-4 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InventoryEditDrawer;
