import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, CheckCircle, Clock, Receipt, CreditCard, Building2, Loader2, AlertCircle } from 'lucide-react';
import { SubirFacturaModal } from './SubirFacturaModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';

interface ExpedienteServicio {
  id: string;
  work_order_name: string;
  appointment_name: string;
  service_type: string;
  validation_final_status: string | null;
  costo_instalacion: number | null;
  costo_revision: number | null;
  costo_desinstalacion: number | null;
  costo_falso: number | null;
  created_at: string;
  email_tecnico: string;
}

export interface ServicioParaCobro {
  id: string;
  workOrder: string;
  appointment: string;
  fecha: string;
  tipoServicio: string;
  monto: number;
  estatusCobro: 'Disponible' | 'En proceso';
  validationStatus: string | null;
}

interface MisServiciosProps {
  onVolver: () => void;
}

function calcularMonto(expediente: ExpedienteServicio): number {
  const serviceType = expediente.service_type?.toLowerCase() || '';
  
  if (serviceType === 'installation') {
    return expediente.costo_instalacion ?? expediente.costo_falso ?? 0;
  }
  if (serviceType.includes('revisión') || serviceType === 'revisión (no genera suscripción)') {
    return expediente.costo_revision ?? expediente.costo_falso ?? 0;
  }
  if (serviceType.includes('desinstalación') || serviceType.includes('desinstalacion')) {
    return expediente.costo_desinstalacion ?? expediente.costo_falso ?? 0;
  }
  return expediente.costo_falso ?? 0;
}

function mapearTipoServicio(serviceType: string): string {
  const tipo = serviceType?.toLowerCase() || '';
  if (tipo === 'installation') return 'Instalación';
  if (tipo.includes('revisión')) return 'Revisión';
  if (tipo.includes('desinstalación') || tipo.includes('desinstalacion')) return 'Desinstalación';
  return serviceType || 'Otro';
}

export function MisServicios({ onVolver }: MisServiciosProps) {
  const { user } = useAuth();
  const [servicios, setServicios] = useState<ServicioParaCobro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<ServicioParaCobro | null>(null);

  useEffect(() => {
    cargarServicios();
  }, [user]);

  const cargarServicios = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('expedientes_servicio')
        .select('id, work_order_name, appointment_name, service_type, validation_final_status, costo_instalacion, costo_revision, costo_desinstalacion, costo_falso, created_at, email_tecnico')
        .eq('email_tecnico', user.email)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const serviciosMapeados: ServicioParaCobro[] = (data || []).map((exp: ExpedienteServicio) => ({
        id: exp.id,
        workOrder: exp.work_order_name || '',
        appointment: exp.appointment_name || '',
        fecha: exp.created_at,
        tipoServicio: mapearTipoServicio(exp.service_type),
        monto: calcularMonto(exp),
        estatusCobro: exp.validation_final_status === 'COMPLETADO' ? 'Disponible' : 'En proceso',
        validationStatus: exp.validation_final_status
      }));

      setServicios(serviciosMapeados);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
      setError('No se pudieron cargar los servicios. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const serviciosDisponibles = servicios.filter(s => s.estatusCobro === 'Disponible');
  const totalDisponible = serviciosDisponibles.reduce((sum, s) => sum + s.monto, 0);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleCobrar = (servicio: ServicioParaCobro) => {
    setServicioSeleccionado(servicio);
    setMostrarModal(true);
  };

  const handleSubirFacturaGeneral = () => {
    setServicioSeleccionado(null);
    setMostrarModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-600">Cargando servicios...</p>
        </div>
      </div>
    );
  }

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

        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-5 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-300 text-sm">Mis Datos de Depósito</p>
              <p className="text-lg font-semibold">Cuenta para Pagos</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <Building2 className="w-3 h-3" />
                <span>Banco</span>
              </div>
              <p className="font-medium">BBVA México</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <CreditCard className="w-3 h-3" />
                <span>Cuenta CLABE</span>
              </div>
              <p className="font-medium font-mono text-sm">012 180 0123 4567 8901</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Esta información será configurable próximamente
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total disponible para cobro</p>
              <p className="text-3xl font-bold">
                ${totalDisponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </p>
              <p className="text-blue-200 text-xs mt-1">
                {serviciosDisponibles.length} servicio(s) con estatus COMPLETADO
              </p>
            </div>
            <button
              onClick={handleSubirFacturaGeneral}
              disabled={serviciosDisponibles.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <Receipt className="w-5 h-5" />
              Subir Factura
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={cargarServicios}
              className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">Historial de Servicios</h2>
            <p className="text-sm text-gray-500">Servicios asignados ordenados por fecha</p>
          </div>

          {servicios.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Sin servicios registrados</p>
              <p className="text-gray-400 text-sm mt-1">
                No tienes servicios asignados a tu correo ({user?.email})
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {servicios.map(servicio => (
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
                          {servicio.workOrder} / {servicio.appointment}
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

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ${servicio.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          servicio.estatusCobro === 'Disponible'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {servicio.estatusCobro === 'Disponible' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {servicio.estatusCobro}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCobrar(servicio)}
                        disabled={servicio.estatusCobro !== 'Disponible'}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          servicio.estatusCobro === 'Disponible'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Mostrando {servicios.length} servicio(s)
        </p>
      </div>

      {mostrarModal && (
        <SubirFacturaModal
          servicios={serviciosDisponibles}
          servicioPreseleccionado={servicioSeleccionado}
          onClose={() => {
            setMostrarModal(false);
            setServicioSeleccionado(null);
          }}
        />
      )}
    </div>
  );
}
