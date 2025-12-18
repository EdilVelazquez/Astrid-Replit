import { useState, useRef, ChangeEvent } from 'react';
import { Camera, Upload, Loader2, CheckCircle, XCircle, Send } from 'lucide-react';

interface PlacaScannerWithPhotoProps {
  onPlacaDetected: (placa: string, photo: File) => void;
  currentPlaca?: string;
}

export function PlacaScannerWithPhoto({ onPlacaDetected, currentPlaca }: PlacaScannerWithPhotoProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedPlaca, setDetectedPlaca] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const WEBHOOK_URL = 'https://aiwebhookn8n.numaris.com/webhook/22f90299-fae1-415b-9cba-5cffc962dca4';

  const validatePlaca = (placa: string): boolean => {
    // Permitir guiones en la placa (ej: USX-587-A)
    const cleanPlaca = placa.toUpperCase().trim();

    // Versión sin guiones para validar el formato básico
    const placaSinGuiones = cleanPlaca.replace(/[^A-Z0-9]/g, '');

    if (placaSinGuiones.length < 6 || placaSinGuiones.length > 7) {
      return false;
    }

    // Formatos válidos de placas mexicanas (sin guiones)
    const formatoNuevo = /^[A-Z]{3}[0-9]{3}[A-Z]{1}$/;  // ABC123D (nuevo formato)
    const formatoAnterior = /^[A-Z]{3}[0-9]{4}$/;        // ABC1234 (formato anterior)
    const formatoTaxi = /^[0-9]{3}[A-Z]{3}$/;            // 123ABC (taxi)

    // Validar que los caracteres sin guiones cumplan con algún formato válido
    const esFormatoValido = formatoNuevo.test(placaSinGuiones) ||
                            formatoAnterior.test(placaSinGuiones) ||
                            formatoTaxi.test(placaSinGuiones);

    // Si tiene guiones, validar que estén en posiciones razonables
    if (cleanPlaca.includes('-')) {
      // Solo permitir guiones como separadores (no al inicio o final)
      if (cleanPlaca.startsWith('-') || cleanPlaca.endsWith('-')) {
        return false;
      }
      // No permitir guiones consecutivos
      if (cleanPlaca.includes('--')) {
        return false;
      }
    }

    return esFormatoValido;
  };

  const extractPlaca = (response: any): string | null => {
    try {
      console.log('🔍 [PLACAS] Iniciando extracción de placa...');

      // Formato 1: Objeto simple {PLACA: 'USX-587-A'}
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        const possibleKeys = ['PLACA', 'placa', 'plate', 'text', 'licensePlate', 'license_plate'];
        for (const key of possibleKeys) {
          if (response[key]) {
            const placaText = String(response[key]).trim().toUpperCase();
            console.log(`🔍 [PLACAS] Encontrado en clave "${key}":`, placaText);

            if (placaText === 'NO_PLACA_ENCONTRADA' || placaText === 'NO_PLATE_FOUND') {
              console.log('⚠️ [PLACAS] El servicio indicó que no encontró placa');
              return null;
            }

            // Mantener los guiones pero eliminar espacios y otros caracteres no deseados
            const cleanPlaca = placaText.replace(/[^A-Z0-9-]/g, '');
            console.log('🧹 [PLACAS] Placa limpia:', cleanPlaca);

            if (validatePlaca(cleanPlaca)) {
              console.log('✅ [PLACAS] Placa válida encontrada:', cleanPlaca);
              return cleanPlaca;
            } else {
              console.warn('❌ [PLACAS] Placa no pasa validación:', cleanPlaca);
              return null;
            }
          }
        }
      }

      // Formato 2: Array anidado [[{ content: [{ text: "USX-587-A" }] }]]
      if (Array.isArray(response) && response.length > 0) {
        const firstLevel = response[0];
        if (Array.isArray(firstLevel) && firstLevel.length > 0) {
          const message = firstLevel[0];
          if (message?.content && Array.isArray(message.content) && message.content.length > 0) {
            const textContent = message.content[0];
            if (textContent?.text) {
              const placaText = String(textContent.text).trim().toUpperCase();
              console.log('🔍 [PLACAS] Texto extraído de estructura anidada:', placaText);

              if (placaText === 'NO_PLACA_ENCONTRADA' || placaText === 'NO_PLATE_FOUND') {
                console.log('⚠️ [PLACAS] El servicio indicó que no encontró placa');
                return null;
              }

              const cleanPlaca = placaText.replace(/[^A-Z0-9-]/g, '');
              console.log('🧹 [PLACAS] Placa limpia:', cleanPlaca);

              if (validatePlaca(cleanPlaca)) {
                console.log('✅ [PLACAS] Placa válida encontrada:', cleanPlaca);
                return cleanPlaca;
              } else {
                console.warn('❌ [PLACAS] Placa no pasa validación:', cleanPlaca);
              }
            }
          }
        }
      }

      // Formato 3: String directo
      if (typeof response === 'string') {
        const placaText = response.trim().toUpperCase();
        console.log('🔍 [PLACAS] Texto directo:', placaText);

        if (placaText === 'NO_PLACA_ENCONTRADA' || placaText === 'NO_PLATE_FOUND') {
          return null;
        }

        const cleanPlaca = placaText.replace(/[^A-Z0-9-]/g, '');
        if (validatePlaca(cleanPlaca)) {
          console.log('✅ [PLACAS] Placa válida encontrada:', cleanPlaca);
          return cleanPlaca;
        }
      }

      console.warn('⚠️ [PLACAS] No se pudo extraer placa de la estructura de respuesta');
      return null;
    } catch (error) {
      console.error('❌ [PLACAS] Error en extractPlaca:', error);
      return null;
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setDetectedPlaca(null);
    setCapturedPhoto(file);

    try {
      console.log('🚀 [PLACAS] Iniciando escaneo de placas...');
      console.log('📸 [PLACAS] Archivo:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 [PLACAS] Enviando petición a:', WEBHOOK_URL);
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 [PLACAS] Respuesta recibida. Status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ [PLACAS] Error HTTP:', response.status, response.statusText);
        throw new Error('Error al procesar la imagen');
      }

      const data = await response.json();
      console.log('📦 [PLACAS] Datos completos de respuesta:', JSON.stringify(data, null, 2));
      console.log('📦 [PLACAS] Tipo de respuesta:', typeof data);
      console.log('📦 [PLACAS] Claves disponibles:', Object.keys(data));

      const extractedPlaca = extractPlaca(data);
      console.log('🔍 [PLACAS] Placa extraída:', extractedPlaca);

      if (extractedPlaca) {
        console.log('✅ [PLACAS] Placa válida detectada:', extractedPlaca);
        setDetectedPlaca(extractedPlaca);
        setError(null);
      } else {
        console.warn('⚠️ [PLACAS] No se pudo extraer una placa válida');
        console.warn('📋 [PLACAS] Respuesta original:', data);
        setError('No se pudo detectar una placa válida en la imagen. Por favor, intenta con otra foto más clara.');
        setDetectedPlaca(null);
        setCapturedPhoto(null);
      }
    } catch (err) {
      console.error('❌ [PLACAS] Error durante el procesamiento:', err);
      setError('Error al conectar con el servicio de escaneo. Por favor, intenta nuevamente.');
      setDetectedPlaca(null);
      setCapturedPhoto(null);
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
    if (detectedPlaca && capturedPhoto) {
      onPlacaDetected(detectedPlaca, capturedPhoto);
      setDetectedPlaca(null);
      setCapturedPhoto(null);
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
          <p className="text-xs text-gray-600">Escanea las placas con tu cámara para capturar foto y texto automáticamente</p>
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
            setCapturedPhoto(null);
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
            Tomar Foto de las Placas
          </button>

          <button
            type="button"
            onClick={handleUploadImage}
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Subir Imagen de las Placas
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
          <p className="text-sm text-gray-600">Analizando imagen de las placas...</p>
        </div>
      )}

      {detectedPlaca && (
        <div className="space-y-3">
          <div className="p-4 bg-green-100 border-2 border-green-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Placa detectada:</span>
            </div>
            <p className="text-2xl font-bold text-green-900 font-mono text-center tracking-wider">
              {detectedPlaca}
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
            <p className="text-xs text-blue-800">
              Al confirmar, las placas se rellenarán automáticamente y la foto se guardará como evidencia
            </p>
          </div>

          <button
            type="button"
            onClick={handleConfirmPlaca}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Confirmar y Guardar
          </button>

          <button
            type="button"
            onClick={() => {
              setDetectedPlaca(null);
              setCapturedPhoto(null);
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
              setCapturedPhoto(null);
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
