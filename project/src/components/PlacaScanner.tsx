import { useState, useRef, ChangeEvent } from 'react';
import { Camera, Upload, Loader2, CheckCircle, XCircle, Send } from 'lucide-react';

interface PlacaScannerProps {
  onPlacaDetected: (placa: string) => void;
  currentPlaca?: string;
}

export function PlacaScanner({ onPlacaDetected, currentPlaca }: PlacaScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedPlaca, setDetectedPlaca] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const WEBHOOK_URL = 'https://aiwebhookn8n.numaris.com/webhook/22f90299-fae1-415b-9cba-5cffc962dca4';

  const validatePlaca = (placa: string): boolean => {
    const cleanPlaca = placa.replace(/[^A-Z0-9]/g, '').toUpperCase();

    if (cleanPlaca.length < 6 || cleanPlaca.length > 7) {
      return false;
    }

    const formatoNuevo = /^[A-Z]{3}[0-9]{3}[A-Z]{1}$/;
    const formatoAnterior = /^[A-Z]{3}[0-9]{4}$/;
    const formatoTaxi = /^[0-9]{3}[A-Z]{3}$/;

    return formatoNuevo.test(cleanPlaca) ||
           formatoAnterior.test(cleanPlaca) ||
           formatoTaxi.test(cleanPlaca);
  };

  const extractPlaca = (response: any): string | null => {
    if (typeof response === 'string') {
      if (response === 'NO_PLACA_ENCONTRADA' || response === 'NO_PLATE_FOUND') {
        return null;
      }
      const cleanResponse = response.replace(/[^A-Z0-9]/g, '').toUpperCase();
      if (validatePlaca(cleanResponse)) {
        return cleanResponse;
      }
      return null;
    }

    const possibleKeys = ['placa', 'PLACA', 'plate', 'licensePlate', 'license_plate', 'texto', 'text'];
    for (const key of possibleKeys) {
      if (response?.[key]) {
        const cleanPlaca = String(response[key]).replace(/[^A-Z0-9]/g, '').toUpperCase();
        if (validatePlaca(cleanPlaca)) {
          return cleanPlaca;
        }
      }
    }

    return null;
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setDetectedPlaca(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al procesar la imagen');
      }

      const data = await response.json();
      const extractedPlaca = extractPlaca(data);

      if (extractedPlaca) {
        setDetectedPlaca(extractedPlaca);
        setError(null);
      } else {
        setError('No se pudo detectar una placa válida en la imagen. Por favor, intenta con otra foto más clara o ingresa las placas manualmente.');
        setDetectedPlaca(null);
      }
    } catch (err) {
      setError('Error al conectar con el servicio de escaneo. Por favor, intenta nuevamente o ingresa las placas manualmente.');
      setDetectedPlaca(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }
      processImage(file);
    }
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleUploadImage = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const handleConfirmPlaca = () => {
    if (detectedPlaca) {
      onPlacaDetected(detectedPlaca);
      setDetectedPlaca(null);
      setIsScanning(false);
    }
  };

  if (!isScanning) {
    return (
      <div className="mt-3 p-4 border-2 border-dashed border-green-400 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2">
            <Camera className="w-8 h-8 text-green-600" />
          </div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">Método Recomendado</h4>
          <p className="text-xs text-gray-600">Escanea las placas con tu cámara para mayor precisión</p>
        </div>
        <button
          type="button"
          onClick={() => setIsScanning(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
        >
          <Camera className="w-6 h-6" />
          Escanear Placas con IA
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 border-2 border-green-200 rounded-lg bg-green-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-green-800">Escaneo de Placas con IA</h4>
        <button
          type="button"
          onClick={() => {
            setIsScanning(false);
            setDetectedPlaca(null);
            setError(null);
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!detectedPlaca && !error && !isProcessing && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCameraCapture}
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Tomar Foto de Placas
          </button>

          <button
            type="button"
            onClick={handleUploadImage}
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Subir Imagen de Placas
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
          <p className="text-sm text-gray-600">Analizando imagen de placas...</p>
        </div>
      )}

      {detectedPlaca && (
        <div className="space-y-3">
          <div className="p-4 bg-green-100 border-2 border-green-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Placas detectadas:</span>
            </div>
            <p className="text-2xl font-bold text-green-900 font-mono text-center tracking-wider">
              {detectedPlaca}
            </p>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="text-xs text-yellow-800">
              Asegúrate de que las placas mostradas coincidan con las del vehículo antes de confirmar
            </p>
          </div>

          <button
            type="button"
            onClick={handleConfirmPlaca}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Confirmar y Usar estas Placas
          </button>

          <button
            type="button"
            onClick={() => {
              setDetectedPlaca(null);
              setError(null);
            }}
            className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {error && (
        <div className="space-y-3">
          <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-red-800">Error:</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDetectedPlaca(null);
              setError(null);
            }}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
