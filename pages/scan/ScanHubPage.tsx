import React from 'react';
import { Link } from 'react-router-dom';
import { CameraIcon, QrCodeIcon } from '../../components/icons';

const ScanHubPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Scan Hub</h1>
      <p className="text-gray-600 mb-8">Choose a scanning action to begin.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          to="/app/scan/vrm"
          className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-200 text-center"
        >
          <CameraIcon className="w-16 h-16 text-blue-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Scan Number Plate</h2>
          <p className="text-gray-500 mt-2">Start a new vehicle check-in by scanning a VRM.</p>
        </Link>
        
        <Link
          to="/app/scan/inventory"
          className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-200 text-center"
        >
          <QrCodeIcon className="w-16 h-16 text-purple-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Scan Inventory Part</h2>
          <p className="text-gray-500 mt-2">Look up, adjust stock, or add a part to a work order.</p>
        </Link>
      </div>
    </div>
  );
};

export default ScanHubPage;
