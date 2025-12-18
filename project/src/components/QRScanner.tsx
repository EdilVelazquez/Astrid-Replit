import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      iniciarEscaner();
    }

    return () => {
      detenerEscaner();
    };
  }, []);

  const iniciarEscaner = async () => {
    try {
      setError('');
      setScanning(true);

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScanSuccess(decodedText);
          detenerEscaner();
        },
        () => {
          // Ignorar errores de escaneo
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar la cámara';
      setError(errorMessage);
      setScanning(false);
    }
  };

  const detenerEscaner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error al detener el escáner:', err);
      }
    }
    scannerRef.current = null;
    setScanning(false);
  };

  const handleClose = async () => {
    await detenerEscaner();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5" />
            <h3 className="font-semibold">Escanear código QR</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error al acceder a la cámara</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <p className="text-xs text-red-600 mt-2">
                  Verifica los permisos de la cámara en tu dispositivo.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div
                id="qr-reader"
                className="rounded-lg overflow-hidden border-2 border-gray-200"
              />
              {scanning && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    <p className="text-sm text-blue-800 font-medium">
                      Apunta la cámara al código QR
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
