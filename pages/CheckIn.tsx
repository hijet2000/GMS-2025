import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { mockApi } from '../services/mockApi';
import { VehicleDetails, Customer, AiAssistedDiagnosis, MotHistoryItem } from '../types';
import { SearchIcon, SparklesIcon, UserPlusIcon, ExclamationTriangleIcon, CameraIcon } from '../components/icons';

// --- Reusable Components ---
const Section: React.FC<{ title: string; step: number; children: React.ReactNode; isComplete: boolean; isDisabled: boolean }> = ({ title, step, children, isComplete, isDisabled }) => (
    <div className={`bg-white p-6 rounded-lg shadow transition-opacity duration-500 ${isDisabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${isComplete ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                {isComplete ? '✓' : step}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        {!isDisabled && <div className="md:pl-12">{children}</div>}
    </div>
);

const MotHistoryTable: React.FC<{ history: MotHistoryItem[] }> = ({ history }) => (
    <div className="mt-4 border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mileage</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item, index) => (
                    <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.date}</td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-semibold ${item.status === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>{item.status}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.mileage.toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

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
const CheckInPage: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [step, setStep] = useState(1);
    const [vrm, setVrm] = useState('');
    const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
    const [isVehicleLoading, setIsVehicleLoading] = useState(false);
    const [vehicleError, setVehicleError] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(false);

    const [customerSearch, setCustomerSearch] = useState('');
    const [foundCustomers, setFoundCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

    const [issue, setIssue] = useState('');
    const [aiDiagnosis, setAiDiagnosis] = useState<AiAssistedDiagnosis | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

    const handleVrmLookup = async (lookupVrm: string) => {
        if (!lookupVrm) return;
        setIsVehicleLoading(true);
        setVehicleError('');
        setVehicle(null);
        setShowManualEntry(false);
        try {
            const result = await mockApi.getVehicleDetails(lookupVrm);
            if (result) {
                await checkForDuplicates(result.vrm);
                setVehicle(result);
                setStep(2);
            } else {
                setVehicleError('Vehicle not found. You can enter the details manually.');
                setShowManualEntry(true);
            }
        } finally {
            setIsVehicleLoading(false);
        }
    };

    const handleVrmSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleVrmLookup(vrm);
    };

    const handleManualVehicleSubmit = async (manualVehicle: Omit<VehicleDetails, 'motHistory' | 'motStatus' | 'motExpiry' | 'taxStatus'>) => {
        const fullVehicle: VehicleDetails = {
            ...manualVehicle,
            motHistory: [], motStatus: 'Expired', motExpiry: 'N/A', taxStatus: 'Untaxed'
        };
        await checkForDuplicates(fullVehicle.vrm);
        setVehicle(fullVehicle);
        setStep(2);
        setShowManualEntry(false);
    };

    const checkForDuplicates = async (vrmToCheck: string) => {
        const hasOpenOrder = await mockApi.checkForOpenWorkOrders(vrmToCheck);
        if (hasOpenOrder) {
            setIsDuplicateModalOpen(true);
        }
    }

    useEffect(() => {
        const search = async () => {
            if (customerSearch.length > 2) {
                setIsCustomerLoading(true);
                const results = await mockApi.findCustomer(customerSearch);
                setFoundCustomers(results);
                setIsCustomerLoading(false);
            } else {
                setFoundCustomers([]);
            }
        };
        const timer = setTimeout(search, 300);
        return () => clearTimeout(timer);
    }, [customerSearch]);

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
        setFoundCustomers([]);
        setShowNewCustomerForm(false);
        setStep(3);
    };

    const handleNewCustomerSubmit = async (newCustomer: Omit<Customer, 'id'>) => {
        setIsCustomerLoading(true);
        const createdCustomer = await mockApi.createCustomer(newCustomer);
        handleCustomerSelect(createdCustomer);
        setIsCustomerLoading(false);
    }
    
    useEffect(() => {
        if(aiDiagnosis?.isUrgent) {
            setIsUrgent(true);
        }
    }, [aiDiagnosis]);

    const handleGetDiagnosis = async () => {
        if (!issue.trim() || issue.length < 10) {
            setAiError("Please provide a more detailed description (at least 10 characters).");
            return;
        };
        setIsAiLoading(true);
        setAiError('');
        setAiDiagnosis(null);

        const prompt = `A customer has reported the following issue with their vehicle: "${issue}". Based on this, provide a potential diagnosis. Your response should be a JSON object.`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A brief summary of the likely problem." },
                        potentialParts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of parts that might need replacement." },
                        isUrgent: { type: Type.BOOLEAN, description: "Whether this issue requires immediate attention." },
                        suggestedTasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of suggested diagnostic or repair tasks for the technician." }
                    },
                    required: ["summary", "potentialParts", "isUrgent", "suggestedTasks"]
                }},
            });
            const jsonText = response.text.trim();
            const diagnosisResult = JSON.parse(jsonText) as AiAssistedDiagnosis;
            setAiDiagnosis(diagnosisResult);

        } catch (err) {
            console.error('Gemini API call failed:', err);
            setAiError('Failed to get AI-assisted diagnosis. Please try again.');
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleCreateWorkOrder = async () => {
        if (!vehicle || !selectedCustomer || !issue || issue.length < 5) return;
        setIsSubmitting(true);
        try {
            const newWorkOrder = await mockApi.createWorkOrder({
                customerId: selectedCustomer.id,
                vehicleDetails: vehicle,
                issue,
                isUrgent,
            });
            navigate(`/app/work-orders/${newWorkOrder.id}`);
        } catch (error) {
            console.error("Failed to create work order", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Vehicle Check-In</h1>
            <div className="space-y-6">
                
                <Section title="Vehicle Information" step={1} isComplete={!!vehicle} isDisabled={false}>
                    <p className="mb-2 text-sm text-gray-600">Enter the Vehicle Registration Mark (VRM) to look up details.</p>
                    <form onSubmit={handleVrmSubmit} className="flex flex-col sm:flex-row gap-2">
                         <input
                            type="text"
                            name="vrm"
                            value={vrm}
                            onChange={e => setVrm(e.target.value.toUpperCase())}
                            placeholder="e.g., AB12 CDE"
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex gap-2">
                           <Link to="/app/scan/vrm" className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 h-[42px] min-w-[42px]">
                               <CameraIcon className="w-5 h-5" />
                               <span className="hidden sm:inline">Scan</span>
                           </Link>
                           <button type="submit" disabled={isVehicleLoading || !vrm} className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 h-[42px]">
                               {isVehicleLoading ? 'Searching...' : 'Search'}
                           </button>
                        </div>
                    </form>
                    {vehicleError && <p className="text-red-500 text-sm mt-2">{vehicleError}</p>}
                    
                    {vehicle && (
                        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                            <h3 className="font-bold text-lg">{vehicle.make} {vehicle.model} - {vehicle.vrm}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2 items-start">
                                <div><strong>Year:</strong> {vehicle.year}</div>
                                <div><strong>Colour:</strong> {vehicle.colour}</div>
                                <div className="flex items-center gap-2"><strong>MOT:</strong> <VehicleStatusBadge status={vehicle.motStatus} /> <span className="text-gray-600">({vehicle.motExpiry})</span></div>
                                <div className="flex items-center gap-2"><strong>Tax:</strong> <VehicleStatusBadge status={vehicle.taxStatus} /></div>
                            </div>
                            {vehicle.motHistory.length > 0 && <MotHistoryTable history={vehicle.motHistory} />}
                        </div>
                    )}
                </Section>
                
                <Section title="Customer Details" step={2} isComplete={!!selectedCustomer} isDisabled={!vehicle}>
                    <p className="mb-2 text-sm text-gray-600">Find an existing customer or create a new one.</p>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                            placeholder="Search by name, phone, or email..."
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        {foundCustomers.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-60 overflow-auto">
                                {foundCustomers.map(c => (
                                    <li key={c.id} onClick={() => handleCustomerSelect(c)} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                                        <p className="font-semibold">{c.name}</p>
                                        <p className="text-sm text-gray-500">{c.email} - {c.phone}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                     {selectedCustomer && (
                        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                            <h3 className="font-bold text-lg">{selectedCustomer.name}</h3>
                            <p className="text-sm">{selectedCustomer.email} | {selectedCustomer.phone}</p>
                        </div>
                    )}
                </Section>
                
                <Section title="Reported Issue" step={3} isComplete={!!issue && issue.length >= 10} isDisabled={!selectedCustomer}>
                    <p className="mb-2 text-sm text-gray-600">Describe the customer's issue with the vehicle (min 10 characters).</p>
                    <textarea
                        rows={4} value={issue} onChange={e => setIssue(e.target.value)}
                        placeholder="e.g., Grinding noise when braking at low speed. Pulls to the left."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="flex flex-col sm:flex-row justify-between items-start mt-2 gap-4">
                        <button 
                            onClick={handleGetDiagnosis} disabled={isAiLoading || issue.length < 10}
                            className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300"
                        >
                            <SparklesIcon />
                            {isAiLoading ? 'Analyzing...' : 'AI Assist'}
                        </button>
                        <div className="flex items-center self-end sm:self-center">
                            <input type="checkbox" id="urgent" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                            <label htmlFor="urgent" className="ml-2 block text-sm font-medium text-gray-700">Mark as Urgent</label>
                        </div>
                    </div>
                    {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
                    {aiDiagnosis && (
                        <div className="mt-4 p-4 border rounded-lg bg-purple-50 border-purple-200">
                             <h3 className="font-bold text-lg text-purple-800 mb-2">AI Diagnosis</h3>
                             <p className="text-sm text-gray-700 mb-4">{aiDiagnosis.summary}</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-sm mb-1">Potential Parts</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">{aiDiagnosis.potentialParts.map(p => <li key={p}>{p}</li>)}</ul>
                                </div>
                                 <div>
                                    <h4 className="font-semibold text-sm mb-1">Suggested Tasks</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">{aiDiagnosis.suggestedTasks.map(t => <li key={t}>{t}</li>)}</ul>
                                </div>
                             </div>
                        </div>
                    )}
                </Section>

                <div className="pt-4">
                     <button
                        onClick={handleCreateWorkOrder}
                        disabled={!vehicle || !selectedCustomer || issue.length < 5 || isSubmitting}
                        className="w-full text-lg px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? "Creating..." : "Create Work Order"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckInPage;
