import React from 'react';
import { WifiIcon } from './icons';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingActions: number;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline, pendingActions }) => {
  if (isOnline) {
    if (pendingActions > 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                <WifiIcon className="w-4 h-4" />
                <span>Syncing {pendingActions}...</span>
            </div>
        );
    }
    return null; // Or a subtle online indicator if preferred
  }

  return (
    <div className="flex items-center gap-2 text-sm text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full">
      <WifiIcon className="w-4 h-4" />
      <span>Offline {pendingActions > 0 && `(${pendingActions})`}</span>
    </div>
  );
};

export default OfflineIndicator;
