import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle } from 'lucide-react';
import { ServicioParaCobro } from './MisServicios';

interface SubirFacturaModalProps {
  servicios: ServicioParaCobro[];
  servicioPreseleccionado?: ServicioParaCobro | null;
  onClose: () => void;
}

export function SubirFacturaModal({ servicios, servicioPreseleccionado, onClose }: SubirFacturaModalProps) {
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([]);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (servicioPreseleccionado) {
      setServiciosSeleccionados([servicioPreseleccionado.id]);
    }
  }, [servicioPreseleccionado]);

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivoSeleccionado(e.target.files[0]);
    }
  };

  const toggleServicio = (id: string) => {
    setServiciosSeleccionados(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const totalSeleccionado = servicios
    .filter(s => serviciosSeleccionados.includes(s.id))
    .reduce((sum, s) => sum + s.monto, 0);

  const handleEnviar = () => {
    setEnviado(true);
  };

  if (enviado) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Factura Enviada</h3>
          <p className="text-gray-600 mb-6">
            Tu factura ha sido enviada correctamente. Recibirás una confirmación cuando sea procesada.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Subir Factura</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo de Factura
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                {archivoSeleccionado ? (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">{archivoSeleccionado.name}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold text-blue-600">Haz clic para seleccionar</span> o arrastra un archivo
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF, XML o imagen (max. 10MB)</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".pdf,.xml,image/*"
                onChange={handleArchivoChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecciona los servicios a facturar
            </label>
            {servicios.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4 bg-gray-50 rounded-lg">
                No hay servicios disponibles para cobro
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {servicios.map(servicio => (
                  <label
                    key={servicio.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      serviciosSeleccionados.includes(servicio.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={serviciosSeleccionados.includes(servicio.id)}
                        onChange={() => toggleServicio(servicio.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {servicio.workOrder} / {servicio.appointment}
                        </p>
                        <p className="text-sm text-gray-500">
                          {servicio.tipoServicio} - {new Date(servicio.fecha).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">
                      ${servicio.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">Total seleccionado:</span>
            <span className="text-2xl font-bold text-green-600">
              ${totalSeleccionado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              disabled={!archivoSeleccionado || serviciosSeleccionados.length === 0}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Enviar Factura
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
