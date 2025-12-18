import { useState } from 'react';
import { ArrowLeft, FileText, CheckCircle, Clock, Receipt } from 'lucide-react';
import { mockServicios, ServicioHistorial } from './mockServices';
import { SubirFacturaModal } from './SubirFacturaModal';

interface MisServiciosProps {
  onVolver: () => void;
}

export function MisServicios({ onVolver }: MisServiciosProps) {
  const [mostrarModal, setMostrarModal] = useState(false);

  const serviciosOrdenados = [...mockServicios].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const totalPendiente = serviciosOrdenados
    .filter(s => s.estatusPago === 'Pendiente')
    .reduce((sum, s) => sum + s.monto, 0);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onVolver}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Mis Servicios</h1>
          <div className="w-20"></div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total pendiente de pago</p>
              <p className="text-3xl font-bold">
                ${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </p>
            </div>
            <button
              onClick={() => setMostrarModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md"
            >
              <Receipt className="w-5 h-5" />
              Subir Factura
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">Historial de Servicios</h2>
            <p className="text-sm text-gray-500">Servicios realizados ordenados por fecha</p>
          </div>

          <div className="divide-y divide-gray-100">
            {serviciosOrdenados.map(servicio => (
              <div
                key={servicio.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {servicio.workOrder} - {servicio.appointment}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500">
                          {formatearFecha(servicio.fecha)}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {servicio.tipoServicio}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      ${servicio.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      servicio.estatusPago === 'Pagado'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {servicio.estatusPago === 'Pagado' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {servicio.estatusPago}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Mostrando {serviciosOrdenados.length} servicios
        </p>
      </div>

      {mostrarModal && (
        <SubirFacturaModal
          servicios={mockServicios}
          onClose={() => setMostrarModal(false)}
        />
      )}
    </div>
  );
}
