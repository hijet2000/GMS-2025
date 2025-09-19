import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { mockApi, TECHNICIANS_LIST } from '../services/mockApi';
import { WorkOrder, WorkOrderStatus, WorkOrderLineItem, VehicleDetails, LineItemType, TimeLog, GarageSettings } from '../types';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon, StopwatchIcon, ClockIcon, DocumentDuplicateIcon, CameraIcon } from '../components/icons';
import Modal from '../components/Modal';
import ErrorState from '../components/ErrorState';
import { calculateWorkOrderTotals, formatGbp } from '../utils/money';
import { generateInvoicePdf } from '../utils/pdfGenerator';

// --- Helper Components ---

const statusColors: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.NEW]: 'bg-gray-200 text-gray-800',
  [WorkOrderStatus.IN_PROGRESS]: 'bg-blue-200 text-blue-800',
  [WorkOrderStatus.AWAITING_PARTS]: 'bg-yellow-200 text-yellow-800',
  [WorkOrderStatus.AWAITING_CUSTOMER]: 'bg-orange-200 text-orange-800',
  [WorkOrderStatus.READY]: 'bg-purple-200 text-purple-800',
  [WorkOrderStatus.COMPLETED]: 'bg-green-200 text-green-800',
  [WorkOrderStatus.INVOICED]: 'bg-pink-200 text-pink-800',
};

const VehicleStatusBadge: React.FC<{ status: 'Valid' | 'Expired' | 'Taxed' | 'Untaxed' }> = ({ status }) => {
  const isPositive = status === 'Valid' || status === 'Taxed';
  const colorClasses = isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses}`}>
      {status}
    </span>
  );
};

// --- Main Component ---
const WorkOrderDetailPage: React.FC = () => {
    const { workOrderId } = useParams<{ workOrderId: string }>();
    const navigate = useNavigate();
    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null);
    const [settings, setSettings] = useState<GarageSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<WorkOrderLineItem | null>(null);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    
    const fetchWorkOrder = useCallback(async () => {
        if (!workOrderId) return;
        setIsLoading(true);
        setError(null);
        try {
            const [data, settingsData] = await Promise.all([
                mockApi.getWorkOrder(workOrderId),
                mockApi.getGarageSettings(),
            ]);

            if (data) {
                setWorkOrder(data);
                setVehicleDetails(data.vehicleDetails);
                setSettings(settingsData);
            } else {
                setError('Work order not found.');
            }
        } catch (err) {
            setError('Failed to fetch work order details.');
        } finally {
            setIsLoading(false);
        }
    }, [workOrderId]);

    useEffect(() => {
        fetchWorkOrder();
    }, [fetchWorkOrder]);
    
    const totals = useMemo(() => {
        if (!workOrder || !settings) return { net: 0, vat: 0, gross: 0 };
        return calculateWorkOrderTotals(workOrder.lineItems, settings.vatRate);
    }, [workOrder, settings]);

    const handleStatusChange = async (newStatus: WorkOrderStatus) => {
        if (!workOrder) return;
        const updatedWorkOrder = await mockApi.updateWorkOrderStatus(workOrder.id, newStatus);
        setWorkOrder(updatedWorkOrder);
    };

    const handleOpenModal = (item: WorkOrderLineItem | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSaveItem = async (itemData: Omit<WorkOrderLineItem, 'id'>) => {
        if (!workOrder) return;
        let updatedWorkOrder;
        if (editingItem) {
            updatedWorkOrder = await mockApi.updateLineItem(workOrder.id, editingItem.id, itemData);
        } else {
            updatedWorkOrder = await mockApi.addLineItem(workOrder.id, itemData);
        }
        setWorkOrder(updatedWorkOrder);
        setIsModalOpen(false);
    };
    
    const handleDeleteItem = async (itemId: string) => {
        if (!workOrder) return;
        const updatedWorkOrder = await mockApi.deleteLineItem(workOrder.id, itemId);
        setWorkOrder(updatedWorkOrder);
    };

    const handleTimeLogToggle = async (technicianName: string) => {
        if (!workOrder) return;
        const activeLog = workOrder.timeLogs.find(log => log.technicianName === technicianName && log.endTime === null);

        if (activeLog) { // Stop timer
            const { workOrder: updatedWorkOrder, stoppedLog } = await mockApi.stopTimeLog(workOrder.id, technicianName);
            setWorkOrder(updatedWorkOrder);
            
            // Auto-suggest labour line
            setConfirmMessage(`Time log of ${stoppedLog.durationMinutes} minutes stopped for ${technicianName}. Would you like to add this as a labour line item?`);
            setConfirmAction(() => () => {
                 handleOpenModal(null);
                 setTimeout(() => {
                    const descInput = document.getElementById('item-description') as HTMLInputElement;
                    const qtyInput = document.getElementById('item-quantity') as HTMLInputElement;
                    const typeSelect = document.getElementById('item-type') as HTMLSelectElement;
                    if(descInput && qtyInput && typeSelect) {
                        typeSelect.value = 'labour';
                        descInput.value = `Labour for ${technicianName}`;
                        qtyInput.value = (stoppedLog.durationMinutes / 60).toFixed(2);
                    }
                 }, 100);
            });
        } else { // Start timer
            const updatedWorkOrder = await mockApi.startTimeLog(workOrder.id, technicianName);
            setWorkOrder(updatedWorkOrder);
        }
    };
    
    const handleGeneratePdf = () => {
      if (!workOrder || !settings) return;
      generateInvoicePdf(workOrder, settings, totals);
    };

    if (isLoading) return <div className="text-center p-8">Loading work order...</div>;
    if (error) return <div className="p-4"><ErrorState message={error} onRetry={fetchWorkOrder} /></div>;
    if (!workOrder) return <div className="text-center p-8">Work order not found.</div>;
    
    const canBeInvoiced = workOrder.lineItems.length > 0 && totals.gross > 0;

    return (
        <div>
            {isModalOpen && <LineItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveItem} item={editingItem} />}
            {confirmAction && (
                <Modal isOpen={true} onClose={() => setConfirmAction(null)} title="Suggestion">
                    <p className="mb-4">{confirmMessage}</p>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setConfirmAction(null)} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                        <button onClick={() => { confirmAction(); setConfirmAction(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Yes, Add</button>
                    </div>
                </Modal>
            )}

            <Link to="/app/work-orders" className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
                <ArrowLeftIcon className="w-4 h-4" /> Back to Work Orders
            </Link>
            
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Work Order #{workOrder.id}</h1>
                        <p className="text-gray-500 mt-1">Last updated: {new Date(workOrder.lastUpdatedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        {workOrder.isUrgent && <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">URGENT</span>}
                        <select
                            value={workOrder.status}
                            onChange={(e) => handleStatusChange(e.target.value as WorkOrderStatus)}
                            className={`px-3 py-1 text-sm font-semibold rounded-full border-none appearance-none ${statusColors[workOrder.status]} focus:ring-2 focus:ring-blue-500 w-full sm:w-auto`}
                        >
                            {Object.values(WorkOrderStatus).map(status => (
                                <option key={status} value={status} disabled={status === WorkOrderStatus.INVOICED && !canBeInvoiced}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="border-t mt-4 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h3 className="font-semibold">Customer</h3>
                        <p>{workOrder.customerName}</p>
                        <p className="text-sm text-gray-600">{workOrder.customerEmail}</p>
                        <p className="text-sm text-gray-600">{workOrder.customerPhone}</p>
                    </div>
                     <div>
                        <h3 className="font-semibold">Vehicle</h3>
                        <p>{workOrder.vehicle} ({workOrder.vrm})</p>
                         {vehicleDetails && <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            MOT: <VehicleStatusBadge status={vehicleDetails.motStatus} /> | Tax: <VehicleStatusBadge status={vehicleDetails.taxStatus} />
                         </div>}
                    </div>
                    <div>
                        <h3 className="font-semibold">Reported Issue</h3>
                        <p className="text-sm text-gray-600">{workOrder.issue}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-6 rounded-lg shadow">
                         <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-2 mb-4 gap-2">
                             <h2 className="text-lg font-semibold">Financials</h2>
                             <div className="flex items-center gap-2">
                                <button onClick={() => navigate('/app/scan/inventory', { state: { workOrderId: workOrder.id }})} className="flex items-center gap-1.5 px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 h-[34px] min-w-[34px]">
                                    <CameraIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Part by Scan</span>
                                </button>
                                <button onClick={() => handleOpenModal()} className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 h-[34px]">
                                    <PlusIcon className="w-4 h-4" /> Add Item
                                </button>
                             </div>
                         </div>
                         <table className="w-full text-sm">
                            <thead className="text-left text-gray-500">
                                <tr>
                                    <th className="p-2 font-medium">Description</th>
                                    <th className="p-2 font-medium text-right">Qty</th>
                                    <th className="p-2 font-medium text-right">Unit Price</th>
                                    <th className="p-2 font-medium text-right">Total</th>
                                    <th className="p-2 font-medium text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workOrder.lineItems.map(item => (
                                    <tr key={item.id} className="border-t">
                                        <td className="p-2">{item.description} <span className="text-xs text-gray-400">({item.type})</span></td>
                                        <td className="p-2 text-right">{item.quantity}</td>
                                        <td className="p-2 text-right">{formatGbp(item.unitPrice)}</td>
                                        <td className="p-2 text-right font-medium">{formatGbp(item.quantity * item.unitPrice)}</td>
                                        <td className="p-2 text-center">
                                            <div className="flex justify-center gap-2">
                                                 <button onClick={() => handleOpenModal(item)} className="text-gray-400 hover:text-blue-600"><PencilIcon className="w-4 h-4" /></button>
                                                 <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {workOrder.lineItems.length === 0 && (
                                    <tr><td colSpan={5} className="text-center p-8 text-gray-500">No line items added yet.</td></tr>
                                )}
                            </tbody>
                         </table>
                     </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                         <h2 className="text-lg font-semibold border-b pb-2 mb-4">Totals</h2>
                         <div className="space-y-2 text-sm">
                             <div className="flex justify-between"><span>Net Total</span><span className="font-medium">{formatGbp(totals.net)}</span></div>
                             <div className="flex justify-between"><span>VAT @ {settings?.vatRate || 0}%</span><span className="font-medium">{formatGbp(totals.vat)}</span></div>
                             <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Gross Total</span><span>{formatGbp(totals.gross)}</span></div>
                         </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Time Logging</h2>
                        <div className="space-y-4">
                            {TECHNICIANS_LIST.map(tech => {
                                const activeLog = workOrder.timeLogs.find(log => log.technicianName === tech && log.endTime === null);
                                const completedLogs = workOrder.timeLogs.filter(log => log.technicianName === tech && log.endTime !== null);
                                const totalLoggedMinutes = completedLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
                                
                                let elapsedTime = '00:00';
                                if(activeLog) {
                                    const startTime = new Date(activeLog.startTime);
                                    const elapsedSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
                                    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
                                    const displaySeconds = elapsedSeconds % 60;
                                    elapsedTime = `${elapsedMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
                                }

                                return (
                                <div key={tech} className="text-sm border-b last:border-b-0 pb-3 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{tech}</p>
                                            <p className="text-xs text-gray-500">Total Logged: {Math.floor(totalLoggedMinutes / 60)}h {totalLoggedMinutes % 60}m</p>
                                        </div>
                                        <button onClick={() => handleTimeLogToggle(tech)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white w-32 justify-center ${activeLog ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                            <StopwatchIcon className="w-4 h-4" />
                                            {activeLog ? `Stop (${elapsedTime})` : 'Start Timer'}
                                        </button>
                                    </div>
                                     {completedLogs.length > 0 && (
                                        <div className="mt-2 pl-2 space-y-1">
                                            {completedLogs.map(log => (
                                                <div key={log.id} className="flex items-center gap-2 text-xs text-gray-600">
                                                    <ClockIcon className="w-3 h-3 flex-shrink-0" />
                                                    <span>{new Date(log.startTime).toLocaleDateString()}: {log.durationMinutes} mins</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                     <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Invoice Actions</h2>
                        <div className="space-y-3">
                             <button onClick={() => handleStatusChange(WorkOrderStatus.COMPLETED)} disabled={workOrder.status === WorkOrderStatus.COMPLETED || workOrder.status === WorkOrderStatus.INVOICED} className="w-full text-center px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                Mark as Completed
                            </button>
                            <button 
                                onClick={handleGeneratePdf}
                                disabled={workOrder.status !== WorkOrderStatus.COMPLETED && workOrder.status !== WorkOrderStatus.INVOICED} 
                                className="w-full flex items-center justify-center gap-2 text-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <DocumentDuplicateIcon className="w-5 h-5" />
                                Generate PDF Invoice
                            </button>
                             <button onClick={() => handleStatusChange(WorkOrderStatus.INVOICED)} disabled={!canBeInvoiced || workOrder.status === WorkOrderStatus.INVOICED || workOrder.status !== WorkOrderStatus.COMPLETED} className="w-full text-center px-4 py-2 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                Mark as Invoiced
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- LineItemModal Component ---
const LineItemModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Omit<WorkOrderLineItem, 'id'>) => void;
    item: WorkOrderLineItem | null;
}> = ({ isOpen, onClose, onSave, item }) => {
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [type, setType] = useState<LineItemType>('part');
    const [isVatable, setIsVatable] = useState(true);

    useEffect(() => {
        if (item) {
            setDescription(item.description);
            setQuantity(item.quantity);
            setUnitPrice(item.unitPrice / 100); // Display in pounds
            setType(item.type);
            setIsVatable(item.isVatable);
        } else {
            // Reset for new item
            setDescription('');
            setQuantity(1);
            setUnitPrice(0);
            setType('part');
            setIsVatable(true);
        }
    }, [item, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            description,
            quantity,
            unitPrice: Math.round(unitPrice * 100), // Save in pence
            type,
            isVatable: type === 'fee' ? isVatable : true,
        });
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Line Item' : 'Add Line Item'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="item-type" className="block text-sm font-medium text-gray-700">Type</label>
                    <select id="item-type" value={type} onChange={e => setType(e.target.value as LineItemType)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="part">Part</option>
                        <option value="labour">Labour</option>
                        <option value="fee">Fee</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="item-description" className="block text-sm font-medium text-gray-700">Description</label>
                    <input type="text" id="item-description" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="item-quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input type="number" id="item-quantity" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value) || 0)} step="0.01" required className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="item-price" className="block text-sm font-medium text-gray-700">Unit Price (£)</label>
                        <input type="number" id="item-price" value={unitPrice} onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} step="0.01" required className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                    </div>
                </div>
                {type === 'fee' ? (
                    <div className="flex items-center">
                        <input type="checkbox" id="item-vatable" checked={isVatable} onChange={e => setIsVatable(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="item-vatable" className="ml-2 block text-sm text-gray-900">VAT applicable</label>
                    </div>
                ) : (
                    <div className="flex items-center">
                        <input type="checkbox" id="item-vatable" checked={true} disabled className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="item-vatable" className="ml-2 block text-sm text-gray-500">VAT applicable (required for Parts/Labour)</label>
                    </div>
                )}
                 <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Item</button>
                </div>
            </form>
        </Modal>
    );
};


export default WorkOrderDetailPage;
