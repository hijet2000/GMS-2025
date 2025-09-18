import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from './icons';

interface CameraScannerProps {
  mode: 'vrm' | 'barcode';
  onScanSuccess: (scannedValue: string) => void;
  onCancel: () => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ mode, onScanSuccess, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        setError("Could not access the camera. Please ensure permissions are granted.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Simulate a scan after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      // In a real app, this would be the result from a scanning library
      const mockValue = mode === 'vrm' ? 'AB12 CDE' : 'BOS-BR-1234';
      onScanSuccess(mockValue);
    }, 3000); // 3-second delay to simulate scanning

    return () => clearTimeout(timer);
  }, [mode, onScanSuccess]);

  const overlayClass = mode === 'vrm'
    ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-white border-dashed w-3/4 h-1/4 rounded-lg'
    : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-white border-dashed w-3/4 h-1/2 rounded-lg';

  const instructionText = mode === 'vrm' ? 'Align number plate with the rectangle' : 'Align barcode with the rectangle';

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover"></video>
      <div className="absolute inset-0 bg-black bg-opacity-25"></div>
      
      <div className={overlayClass}></div>
      
      <div className="z-10 text-center text-white p-4 bg-black bg-opacity-50 rounded-lg absolute top-20">
        <p className="text-lg font-semibold">{instructionText}</p>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>

      <button
        onClick={onCancel}
        className="absolute top-4 right-4 z-20 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
        aria-label="Close scanner"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      <div className="absolute bottom-10 z-10 text-white text-sm">
        <p>Simulating {mode} scan...</p>
      </div>
    </div>
  );
};

export default CameraScanner;
