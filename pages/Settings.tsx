import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mockApi } from '../services/mockApi';
import { GarageSettings } from '../types';

// Zod schema for validation
// FIX: Switched to z.number() for vatRate and made invoiceNotes required
// to align types with react-hook-form state and the GarageSettings interface.
const settingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  vatRate: z.number().min(0, 'VAT rate must be non-negative').max(100, 'VAT rate cannot exceed 100'),
  invoiceNotes: z.string(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// Reusable form field components
interface InputFieldProps {
  label: string;
  name: Extract<keyof SettingsFormData, string>;
  register: any;
  errors: FieldErrors<SettingsFormData>;
  type?: string;
  step?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, register, errors, type = 'text', step }) => {
    const errorId = `${name}-error`;
    return (
      <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input
          id={name}
          type={type}
          step={step}
          {...register(name)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors[name] ? 'border-red-500' : ''}`}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? errorId : undefined}
        />
        {errors[name] && <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">{errors[name]?.message}</p>}
      </div>
    );
};

const TextareaField: React.FC<Omit<InputFieldProps, 'type' | 'step'>> = ({ label, name, register, errors }) => {
    const errorId = `${name}-error`;
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
            <textarea
              id={name}
              rows={4}
              {...register(name)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors[name] ? 'border-red-500' : ''}`}
              aria-invalid={!!errors[name]}
              aria-describedby={errors[name] ? errorId : undefined}
            />
            {errors[name] && <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">{errors[name]?.message}</p>}
        </div>
    );
};

const SettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const settings = await mockApi.getGarageSettings();
      reset(settings);
      setIsLoading(false);
    };
    fetchSettings();
  }, [reset]);

  const onSubmit: SubmitHandler<SettingsFormData> = async (data) => {
    await mockApi.updateGarageSettings(data);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Garage Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Company Information Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium leading-6 text-gray-900">Company Information</h2>
          <p className="mt-1 text-sm text-gray-500">This information will appear on invoices and other communications.</p>
          <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
            <div className="sm:col-span-2">
              <InputField name="companyName" label="Company Name" register={register} errors={errors} />
            </div>
            <div className="sm:col-span-2">
              <TextareaField name="address" label="Company Address" register={register} errors={errors} />
            </div>
            <InputField name="phone" label="Phone Number" type="tel" register={register} errors={errors} />
            <InputField name="email" label="Email Address" type="email" register={register} errors={errors} />
          </div>
        </div>

        {/* Invoice Configuration Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium leading-6 text-gray-900">Invoice Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">Set default values for your invoices.</p>
          <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2">
             <div>
                 <label htmlFor="vatRate" className="block text-sm font-medium text-gray-700">VAT Rate (%)</label>
                 <input
                    id="vatRate"
                    type="number"
                    step="0.01"
                    // FIX: Added `valueAsNumber: true` to ensure the form state for this field is a number,
                    // matching the Zod schema and preventing type errors with the resolver.
                    {...register("vatRate", { valueAsNumber: true })}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.vatRate ? 'border-red-500' : ''}`}
                    aria-invalid={!!errors.vatRate}
                    aria-describedby={errors.vatRate ? 'vatRate-error' : undefined}
                 />
                 {errors.vatRate && <p id="vatRate-error" role="alert" className="mt-1 text-sm text-red-600">{errors.vatRate.message}</p>}
             </div>
            <div className="sm:col-span-2">
               <TextareaField name="invoiceNotes" label="Invoice Notes / Footer" register={register} errors={errors} />
               <p className="mt-2 text-xs text-gray-500">e.g., Terms & Conditions, payment instructions.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md border border-transparent bg-blue-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
      
      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 rounded-md bg-green-500 p-4 text-white shadow-lg transition-opacity duration-300">
          <p className="font-medium">Settings saved successfully!</p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;