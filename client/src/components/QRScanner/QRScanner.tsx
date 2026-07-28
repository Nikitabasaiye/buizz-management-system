import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ticketScanApi } from '../../services/ticketScanApi';

interface ScanResult {
  success: boolean;
  message: string;
  ticket?: {
    ticketId: number;
    ticketNumber: string;
    attendeeName: string;
    attendeeEmail: string;
    eventTitle: string;
    venueName: string;
    checkedInAt: string;
  };
}

interface QRScannerProps {
  eventId?: string;
  onClose?: () => void;
  onScanSuccess?: (result: ScanResult) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ eventId, onClose, onScanSuccess }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      if (!videoRef.current) return;

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        supportedScanTypes: [Html5QrcodeSupportedFormats.QR_CODE],
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccessHandler,
        onScanFailureHandler
      );

      setIsScanning(true);
      setCameraPermission(true);
    } catch (err) {
      setCameraPermission(false);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
      }
    }
  };

  const onScanSuccessHandler = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await ticketScanApi.scanTicket(decodedText, {
        location: 'Main Gate',
        device_info: navigator.userAgent
      });
      
      setScanResult(result);
      setShowResult(true);
      onScanSuccess?.(result);
      
      // Pause scanning for 3 seconds to show result
      await stopScanner();
      setTimeout(() => {
        setShowResult(false);
        setScanResult(null);
        startScanner();
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Scan failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const onScanFailureHandler = (error: string) => {
    // Ignore scan failures (normal during scanning)
  };

  const handleRetry = () => {
    setError(null);
    setScanResult(null);
    setShowResult(false);
    startScanner();
  };

  if (cameraPermission === false) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Camera Access Required</h3>
          <p className="text-gray-600 mb-6">
            Please enable camera permissions to scan QR codes.
          </p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <h2 className="text-white text-lg font-semibold">Scan Ticket QR</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative flex items-center justify-center">
        <div id="qr-reader" ref={videoRef} className="w-full h-full" />
        
        {/* Google Lens-style Overlay */}
        {!showResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Scanning Frame */}
            <div className="relative">
              {/* Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
              
              {/* Scanning Line Animation */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan-line" />
              </div>
              
              {/* Center Guide */}
              <div className="w-64 h-64 border-2 border-white/30 rounded-lg" />
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="text-gray-900 font-medium">Verifying ticket...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute top-20 left-4 right-4 bg-red-500 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}
      </div>

      {/* Result Display */}
      {showResult && scanResult && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            {scanResult.success ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
                  Ticket Verified!
                </h3>
                <p className="text-center text-gray-600 mb-6">
                  {scanResult.message}
                </p>
                
                {scanResult.ticket && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Attendee</span>
                      <span className="font-semibold text-gray-900">
                        {scanResult.ticket.attendeeName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Event</span>
                      <span className="font-semibold text-gray-900">
                        {scanResult.ticket.eventTitle}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Venue</span>
                      <span className="font-semibold text-gray-900">
                        {scanResult.ticket.venueName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Checked In</span>
                      <span className="font-semibold text-green-600">
                        {new Date(scanResult.ticket.checkedInAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
                  Scan Failed
                </h3>
                <p className="text-center text-gray-600 mb-6">
                  {scanResult.message}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex items-center justify-center gap-4 text-white/70 text-sm">
          <Camera className="w-4 h-4" />
          <span>Point camera at QR code</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-line {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(256px);
          }
          100% {
            transform: translateY(0);
          }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
