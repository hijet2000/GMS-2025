
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockApi } from '../../services/mockApi';
import { Employee, EmployeeStatus } from '../../types';
import { PlusIcon, ExclamationTriangleIcon } from '../../components/icons';
import ErrorState from '../../components/ErrorState';

const statusColors: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [EmployeeStatus.ON_LEAVE]: 'bg-blue-100 text-blue-800',
  [EmployeeStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-800',
  [EmployeeStatus.TERMINATED]: 'bg-gray-100 text-gray-800',
};

const EmployeeCard: React.FC<{ employee: Employee }> = ({ employee }) => (
    <Link to={`/app/hr/employees/${employee.id}`} className="block bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-gray-800 text-lg">{employee.name}</p>
                <p className="text-sm text-gray-500">{employee.role}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[employee.status]}`}>{employee.status}</span>
        </div>
        <div className="mt-4 text-sm text-gray-600">
            <p>{employee.email}</p>
            <p>{employee.phone}</p>
        </div>
    </Link>
);


const HrHomePage: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [employeeLimit, setEmployeeLimit] = useState<{count: number, limit: number | 'unlimited'}>({count: 0, limit: 0});

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [emps, limitData] = await Promise.all([
                mockApi.getEmployees(),
                mockApi.getActiveEmployeeCount()
            ]);
            setEmployees(emps);
            setEmployeeLimit(limitData);
        } catch (err) {
            setError("Failed to fetch employee data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const canAddEmployee = employeeLimit.limit === 'unlimited' || employeeLimit.count < employeeLimit.limit;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">HR Management</h1>
                <Link 
                    to={canAddEmployee ? "/app/hr/employees/new" : '#'}
                    onClick={(e) => !canAddEmployee && e.preventDefault()}
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 ${!canAddEmployee ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-disabled={!canAddEmployee}
                >
                    <PlusIcon /> Add Employee
                </Link>
            </div>

            {!canAddEmployee && (
                <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-r-lg">
                    <div className="flex">
                        <div className="py-1"><ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-3" /></div>
                        <div>
                            <p className="font-bold">Plan Limit Reached</p>
                            <p className="text-sm">You have {employeeLimit.count} active employees, which is the maximum for your current plan. <Link to="/billing" className="font-semibold underline hover:text-yellow-800">Please upgrade your plan</Link> to add more.</p>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-10">Loading employees...</div>
            ) : error ? (
                <ErrorState message={error} onRetry={fetchData} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employees.map(emp => (
                        <EmployeeCard key={emp.id} employee={emp} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HrHomePage;
