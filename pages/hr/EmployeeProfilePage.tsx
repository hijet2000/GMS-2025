
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mockApi } from '../../services/mockApi';
import { Employee, EmployeeRole, EmployeePayType, EmployeeStatus } from '../../types';
import { ArrowLeftIcon } from '../../components/icons';
import { formatISO } from 'date-fns';

const employeeSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    role: z.nativeEnum(EmployeeRole),
    payType: z.nativeEnum(EmployeePayType),
    hourlyRatePence: z.number().optional(),
    salaryAnnualPence: z.number().optional(),
    status: z.nativeEnum(EmployeeStatus),
    startDate: z.string().min(1, 'Start date is required'),
    kioskPinCode: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
}).superRefine((data, ctx) => {
    if (data.payType === EmployeePayType.HOURLY && (data.hourlyRatePence === undefined || data.hourlyRatePence <= 0)) {
        ctx.addIssue({ code: 'custom', message: 'Hourly rate is required', path: ['hourlyRatePence'] });
    }
    if (data.payType === EmployeePayType.SALARIED && (data.salaryAnnualPence === undefined || data.salaryAnnualPence <= 0)) {
        ctx.addIssue({ code: 'custom', message: 'Annual salary is required', path: ['salaryAnnualPence'] });
    }
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

const EmployeeProfilePage: React.FC = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const isNew = employeeId === 'new';
    
    const [isLoading, setIsLoading] = useState(!isNew);
    const [serverError, setServerError] = useState<string | null>(null);

    const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            startDate: formatISO(new Date(), { representation: 'date' })
        }
    });

    const payType = watch('payType');

    const loadEmployee = useCallback(async () => {
        if (!employeeId || isNew) return;
        setIsLoading(true);
        try {
            const employee = await mockApi.getEmployee(employeeId);
            if (employee) {
                const formData = {
                    ...employee,
                    hourlyRatePence: employee.hourlyRatePence ? employee.hourlyRatePence / 100 : undefined,
                    salaryAnnualPence: employee.salaryAnnualPence ? employee.salaryAnnualPence / 100 : undefined,
                    startDate: formatISO(new Date(employee.startDate), { representation: 'date' })
                };
                reset(formData);
            } else {
                setServerError('Employee not found.');
            }
        } catch (e) {
            setServerError('Failed to load employee data.');
        } finally {
            setIsLoading(false);
        }
    }, [employeeId, isNew, reset]);

    useEffect(() => {
        loadEmployee();
    }, [loadEmployee]);

    const onSubmit: SubmitHandler<EmployeeFormData> = async (data) => {
        setServerError(null);
        try {
            const payload: Omit<Employee, 'id' | 'endDate'> & {endDate?: string} = {
                ...data,
                hourlyRatePence: data.payType === EmployeePayType.HOURLY ? Math.round((data.hourlyRatePence || 0) * 100) : undefined,
                salaryAnnualPence: data.payType === EmployeePayType.SALARIED ? Math.round((data.salaryAnnualPence || 0) * 100) : undefined,
                startDate: new Date(data.startDate).toISOString()
            };

            if (isNew) {
                await mockApi.createEmployee(payload as Omit<Employee, 'id'>);
            } else if (employeeId) {
                await mockApi.updateEmployee(employeeId, payload);
            }
            navigate('/app/hr');
        } catch (e: any) {
            setServerError(e.message || 'An unexpected error occurred.');
        }
    };
    
    if (isLoading) return <div className="text-center p-8">Loading employee profile...</div>;

    return (
        <div>
            <button onClick={() => navigate('/app/hr')} className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
                <ArrowLeftIcon className="w-4 h-4" /> Back to HR
            </button>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{isNew ? 'Add New Employee' : 'Edit Employee Profile'}</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" id="name" {...register('name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Employment Status</label>
                        <select id="status" {...register('status')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            {Object.values(EmployeeStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" id="email" {...register('email')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input type="tel" id="phone" {...register('phone')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                    </div>
                     <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                        <select id="role" {...register('role')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            {Object.values(EmployeeRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input type="date" id="startDate" {...register('startDate')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
                    </div>
                </div>

                <div className="border-t pt-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="payType" className="block text-sm font-medium text-gray-700">Pay Type</label>
                            <select id="payType" {...register('payType')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                {Object.values(EmployeePayType).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                            </select>
                        </div>
                        {payType === EmployeePayType.HOURLY && (
                             <div>
                                <label htmlFor="hourlyRatePence" className="block text-sm font-medium text-gray-700">Hourly Rate (£)</label>
                                <input type="number" id="hourlyRatePence" {...register('hourlyRatePence', { valueAsNumber: true })} step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                                {errors.hourlyRatePence && <p className="mt-1 text-sm text-red-600">{errors.hourlyRatePence.message}</p>}
                            </div>
                        )}
                        {payType === EmployeePayType.SALARIED && (
                            <div>
                                <label htmlFor="salaryAnnualPence" className="block text-sm font-medium text-gray-700">Annual Salary (£)</label>
                                <input type="number" id="salaryAnnualPence" {...register('salaryAnnualPence', { valueAsNumber: true })} step="100" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                                {errors.salaryAnnualPence && <p className="mt-1 text-sm text-red-600">{errors.salaryAnnualPence.message}</p>}
                            </div>
                        )}
                         <div>
                            <label htmlFor="kioskPinCode" className="block text-sm font-medium text-gray-700">Kiosk PIN (4 digits)</label>
                            <input type="text" id="kioskPinCode" {...register('kioskPinCode')} maxLength={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            {errors.kioskPinCode && <p className="mt-1 text-sm text-red-600">{errors.kioskPinCode.message}</p>}
                        </div>
                     </div>
                </div>
                
                {serverError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{serverError}</p>}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-md border border-transparent bg-blue-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Employee'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EmployeeProfilePage;
