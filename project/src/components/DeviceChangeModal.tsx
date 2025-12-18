import { useState } from 'react';
import { X, QrCode, AlertTriangle, RefreshCcw, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { DEVICE_CHANGE_REASONS } from '../constants/deviceChangeReasons';
import { QRScanner } from './QRScanner';
import { buscarEquipoEnInventario } from '../services/zohoInventoryService';

interface DeviceChangeModalProps {
  currentESN: string;
  workOrderName: string;
  appointmentName: string;
  onConfirm: (nuevoESN: string, motivo: string, descripcion: string) => void;
  onClose: () => void;
}

interface CRMData {
  id: string;
  model: string;
  IMEI: string;
  linea: string;
}

export function DeviceChangeModal({
  currentESN,
  workOrderName,
  appointmentName,
  onConfirm,
  onClose
}: DeviceChangeModalProps) {
  const [nuevoESN, setNuevoESN] = useState('');
  const [motivo, setMotivo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [mostrarQRScanner, setMostrarQRScanner] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState('');
  
  const [consultandoCRM, setConsultandoCRM] = useState(false);
  const [crmConsultado, setCrmConsultado] = useState(false);
  const [datosCRM, setDatosCRM] = useState<CRMData | null>(null);
  const [errorCRM, setErrorCRM] = useState<string | null>(null);

  const handleQRScanSuccess = (decodedText: string) => {
    setNuevoESN(decodedText);
    setMostrarQRScanner(false);
    setCrmConsultado(false);
    setDatosCRM(null);
    setErrorCRM(null);
  };

  const handleESNChange = (value: string) => {
    setNuevoESN(value);
    setCrmConsultado(false);
    setDatosCRM(null);
    setErrorCRM(null);
  };

  const validarFormularioParaConsulta = (): boolean => {
    if (!nuevoESN.trim()) {
      setErrorValidacion('Debe ingresar el nuevo ESN');
      return false;
    }

    if (nuevoESN.trim() === currentESN) {
      setErrorValidacion('El nuevo ESN debe ser diferente al actual');
      return false;
    }

    return true;
  };

  const validarFormularioCompleto = (): boolean => {
    if (!validarFormularioParaConsulta()) return false;

    if (!motivo) {
      setErrorValidacion('Debe seleccionar un motivo para el cambio');
      return false;
    }

    if (motivo === 'otro' && !descripcion.trim()) {
      setErrorValidacion('Debe proporcionar una descripción cuando selecciona "Otro motivo"');
      return false;
    }

    return true;
  };

  const handleConsultarCRM = async () => {
    setErrorValidacion('');

    if (!validarFormularioParaConsulta()) {
      return;
    }

    setConsultandoCRM(true);
    setDatosCRM(null);
    setErrorCRM(null);

    try {
      const resultado = await buscarEquipoEnInventario(nuevoESN.trim());
      
      if (resultado.success && resultado.data) {
        setDatosCRM(resultado.data);
        setCrmConsultado(true);
      } else {
        setErrorCRM(resultado.error || 'No se encontró información del equipo');
        setCrmConsultado(true);
      }
    } catch (error) {
      setErrorCRM('Error al consultar el CRM');
      setCrmConsultado(true);
    } finally {
      setConsultandoCRM(false);
    }
  };

  const handleConfirmar = () => {
    setErrorValidacion('');

    if (!validarFormularioCompleto()) {
      return;
    }

    const motivoLabel = DEVICE_CHANGE_REASONS.find(r => r.value === motivo)?.label || motivo;
    onConfirm(nuevoESN.trim(), motivoLabel, descripcion.trim());
  };

  const requiereDescripcion = motivo === 'otro';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCcw className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Cambio de Dispositivo</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Advertencia importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Se consultará el CRM para obtener los datos del nuevo dispositivo</li>
                  <li>Todas las pruebas pasivas se reiniciarán completamente</li>
                  <li>Los datos del dispositivo anterior se preservarán en el historial</li>
                  <li>El contexto del servicio se reiniciará como si fuera una primera captura</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Servicio:</span>
                <span className="text-sm text-gray-900">{workOrderName} - {appointmentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">ESN Actual:</span>
                <span className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded">{currentESN}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo ESN *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoESN}
                  onChange={(e) => handleESNChange(e.target.value)}
                  placeholder="Ingresa o escanea el nuevo ESN"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setMostrarQRScanner(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <QrCode className="w-5 h-5" />
                  QR
                </button>
                <button
                  onClick={handleConsultarCRM}
                  disabled={consultandoCRM || !nuevoESN.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {consultandoCRM ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Verificar
                </button>
              </div>
            </div>

            {crmConsultado && (
              <div className={`rounded-lg p-4 border-2 ${datosCRM ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {datosCRM ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Dispositivo encontrado en CRM</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <span className="font-semibold text-amber-800">Dispositivo no encontrado en CRM</span>
                    </>
                  )}
                </div>
                
                {datosCRM ? (
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">ID Zoho:</span>
                        <span className="ml-2 text-gray-900">{datosCRM.id}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Modelo:</span>
                        <span className="ml-2 text-gray-900 font-semibold">{datosCRM.model}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">IMEI:</span>
                        <span className="ml-2 text-gray-900 font-mono">{datosCRM.IMEI}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Línea SIM:</span>
                        <span className="ml-2 text-gray-900">{datosCRM.linea}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-700">
                    {errorCRM || 'El ESN no fue encontrado en el inventario de Zoho. Puede continuar pero sin datos automáticos del CRM.'}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del cambio *
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona un motivo...</option>
                {DEVICE_CHANGE_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción adicional {requiereDescripcion && '*'}
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={requiereDescripcion ? "Describe el motivo del cambio..." : "Información adicional (opcional)"}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {errorValidacion && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{errorValidacion}</p>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!crmConsultado}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw className="w-5 h-5" />
              Confirmar Cambio
            </button>
          </div>
        </div>
      </div>

      {mostrarQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setMostrarQRScanner(false)}
        />
      )}
    </>
  );
}
