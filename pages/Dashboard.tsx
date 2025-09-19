

import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { useAuth } from '../App';
import { SparklesIcon, ChartBarIcon } from '../components/icons';
import AskAIModal from '../components/AskAIModal';
import AnalyzeProductivityModal from '../components/AnalyzeProductivityModal';
import { mockApi } from '../services/mockApi';
import { DashboardData } from '../types';
import { formatGbp } from '../utils/money';
import ErrorState from '../components/ErrorState';

const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import('recharts').then(m => ({ default: m.Pie })));
const Cell = lazy(() => import('recharts').then(m => ({ default: m.Cell })));
const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import('recharts').then(m => ({ default: m.Bar })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));


type DateRange = 'day' | 'week' | 'month';

// --- HELPER COMPONENTS ---

const KpiCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
    <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
  </div>
);

const KpiCardSkeleton: React.FC = () => (
    <div className="bg-white p-4 rounded-lg shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-300 rounded w-1/2"></div>
    </div>
);

const DateRangeSelector: React.FC<{ selected: DateRange; onSelect: (range: DateRange) => void }> = ({ selected, onSelect }) => {
    const buttonClasses = "px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
    const activeClasses = "bg-blue-600 text-white";
    const inactiveClasses = "bg-white text-gray-700 hover:bg-gray-50";

    return (
        <div className="flex items-center space-x-2">
            {(['day', 'week', 'month'] as DateRange[]).map(range => (
                <button
                    key={range}
                    onClick={() => onSelect(range)}
                    className={`${buttonClasses} ${selected === range ? activeClasses : inactiveClasses}`}
                >
                    {range === 'day' ? 'Today' : `This ${range.charAt(0).toUpperCase() + range.slice(1)}`}
                </button>
            ))}
        </div>
    );
};

const EmptyState: React.FC<{ message: string, className?: string }> = ({ message, className = '' }) => (
    <div className={`flex items-center justify-center h-full text-gray-500 ${className}`}>
        <p>{message}</p>
    </div>
);

// --- MAIN DASHBOARD COMPONENT ---

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isProductivityModalOpen, setIsProductivityModalOpen] = useState(false);
  
  const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await mockApi.getDashboardData(dateRange);
        setData(result);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const REVENUE_COLORS = ['#3B82F6', '#8B5CF6'];
  const hasWorkOrderData = data && Object.keys(data.workOrderStats).length > 0;
  const chartSuspenseFallback = <div className="h-full w-full flex items-center justify-center text-gray-500">Loading chart...</div>;

  const pieChartData = useMemo(() => {
    if (!data?.revenueBreakdown) return [];
    return data.revenueBreakdown.map(item => ({ name: item.name, value: item.value }));
  }, [data?.revenueBreakdown]);


  return (
    <div>
        {data && (
            <>
                <AskAIModal 
                    isOpen={isAiModalOpen}
                    onClose={() => setIsAiModalOpen(false)}
                    dashboardData={data}
                    dateRange={dateRange}
                />
                <AnalyzeProductivityModal
                    isOpen={isProductivityModalOpen}
                    onClose={() => setIsProductivityModalOpen(false)}
                    productivityData={data.techProductivity}
                    dateRange={dateRange}
                />
            </>
        )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 mt-1">Hello {user?.name.split(' ')[0]}, here's your workshop overview.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <DateRangeSelector selected={dateRange} onSelect={setDateRange} />
            <button
                onClick={() => setIsAiModalOpen(true)}
                disabled={isLoading || !data}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300"
            >
                <SparklesIcon />
                <span>Ask AI</span>
            </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i}/>)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, i) => <KpiCardSkeleton key={i}/>)}
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="bg-white p-6 rounded-lg shadow animate-pulse h-[360px]"></div>
                <div className="bg-white p-6 rounded-lg shadow animate-pulse h-[360px]"></div>
            </div>
        </div>
      ) : error ? (
         <ErrorState message={error} onRetry={fetchData} />
      ) : data ? (
      <div className="space-y-6">
        {/* KPI Tiles */}
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700 -mb-2">Financial Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard title="Total Revenue (Net)" value={formatGbp(data.totalNet * 100)} />
                <KpiCard title={`VAT @ ${data.totalNet > 0 ? ((data.totalVat/data.totalNet)*100).toFixed(0) : '0'}%`} value={formatGbp(data.totalVat * 100)} />
                <KpiCard title="Total Revenue (Gross)" value={formatGbp(data.totalGross * 100)} />
            </div>
             <h2 className="text-xl font-semibold text-gray-700 pt-4 -mb-2">Work Order Status</h2>
             {hasWorkOrderData ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {Object.entries(data.workOrderStats).map(([title, value]) => (
                    <KpiCard key={title} title={title} value={value} />
                    ))}
                </div>
             ) : (
                <div className="bg-white p-4 rounded-lg shadow">
                    <EmptyState message="No work order data for this period." />
                </div>
             )}
        </div>
        

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Revenue Breakdown</h2>
            <div className="sr-only">
                <p>Revenue Breakdown:</p>
                <ul>
                    {pieChartData.map(item => <li key={item.name}>{item.name}: {formatGbp(item.value * 100)}</li>)}
                </ul>
            </div>
            <div style={{ width: '100%', height: 300 }}>
                {pieChartData.length > 0 ? (
                    <Suspense fallback={chartSuspenseFallback}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                aria-label="Revenue breakdown pie chart"
                            >
                            {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                            ))}
                            </Pie>
                            {/* Fix: Ensure the formatter always returns a valid ReactNode (e.g., a string) to satisfy the type requirements of the recharts Tooltip component. */}
                            <Tooltip formatter={(value: unknown) => typeof value === 'number' ? formatGbp(value * 100) : String(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                    </Suspense>
                ) : <EmptyState message="No revenue data for this period." />}
            </div>
            </div>

            {/* Technician Productivity */}
            <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Technician Productivity</h2>
                <button
                    onClick={() => setIsProductivityModalOpen(true)}
                    disabled={data.techProductivity.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                >
                    <ChartBarIcon className="w-4 h-4" />
                    AI Analysis
                </button>
            </div>
             <div className="sr-only">
                <p>Technician Productivity (Logged vs Billed Hours):</p>
                <ul>
                    {data.techProductivity.map(tech => <li key={tech.name}>{tech.name}: {tech.logged}h logged, {tech.billed}h billed.</li>)}
                </ul>
            </div>
            <div style={{ width: '100%', height: 300 }}>
                {data.techProductivity.length > 0 ? (
                    <Suspense fallback={chartSuspenseFallback}>
                    <ResponsiveContainer>
                    <BarChart data={data.techProductivity} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#6B7280' }} />
                        <YAxis tick={{ fill: '#6B7280' }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#6B7280' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="logged" fill="#FBBF24" name="Hours Logged" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="billed" fill="#10B981" name="Hours Billed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                    </Suspense>
                ) : <EmptyState message="No productivity data for this period." />}
            </div>
            </div>
        </div>
      </div>
      ) : null}
    </div>
  );
};

export default DashboardPage;