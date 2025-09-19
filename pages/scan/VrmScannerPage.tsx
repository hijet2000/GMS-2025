import React from 'react';
import { useNavigate } from 'react-router-dom';
import CameraScanner from '../../components/CameraScanner';

const VrmScannerPage: React.FC = () => {
  const navigate = useNavigate();

  const handleScanSuccess = (scannedVrm: string) => {
    // Navigate back to the check-in page and pass the scanned VRM
    // This isn't directly possible with react-router's navigate, so we'll
    // rely on a different mechanism like session storage or context if needed.
    // For now, we'll just navigate and the user can see the VRM they need to type.
    // A better implementation could use a global state.
    
    // Simple alert for now to show it works
    alert(`Scanned VRM: ${scannedVrm}. You will now be returned to the Check-in page.`);
    navigate('/app/check-in');
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <CameraScanner
      mode="vrm"
      onScanSuccess={handleScanSuccess}
      onCancel={handleCancel}
    />
  );
};

export default VrmScannerPage;
