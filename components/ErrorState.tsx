import React from 'react';
import { ExclamationTriangleIcon } from './icons';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="text-center py-10 px-4 bg-white rounded-lg shadow">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="mt-2 text-lg font-medium text-gray-900">An Error Occurred</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
};

export default ErrorState;
