import { useState, useEffect } from 'react';
import { ExpedienteServicio } from '../../types';
import { supabase } from '../../supabaseClient';
import { Activity, CheckCircle2, Clock, AlertCircle, User, Calendar, RefreshCw, Phone, Mail, Building, FileText, AlertTriangle } from 'lucide-react';
import { ExpedienteDetail } from './ExpedienteDetail';

interface ServicioConSesion extends ExpedienteServicio {
  session_data?: any;
}

export function ServiceMonitoring() {
  const [servicios, setServicios] = useState<ServicioConSesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedExpedienteId, setSelectedExpedienteId] = useState<number | null>(null);

  useEffect(() => {
    loadServicios();

    if (autoRefresh) {
      const interval = setInterval(loadServicios, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadServicios = async () => {
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
    const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

    const { data: expedientes, error } = await supabase
      .from('expedientes_servicio')
      .select('*')
      .gte('scheduled_start_time', inicioDelDia.toISOString())
      .lte('scheduled_start_time', finDelDia.toISOString())
      .order('scheduled_start_time', { ascending: true });

    if (error) {
      console.error('Error loading servicios:', error);
      setLoading(false);
      return;
    }

    const serviciosConSesion = await Promise.all(
      (expedientes || []).map(async (exp) => {
        const expedienteId = `${exp.work_order_name}_${exp.appointment_name}`;
        const { data: session } = await supabase
          .from('device_test_sessions')
          .select('*')
          .eq('expediente_id', expedienteId)
          .maybeSingle();

        return {
          ...exp,
          session_data: session,
        };
      })
    );

    setServicios(serviciosConSesion);
    setLoading(false);
  };

  const getStatusBadge = (servicio: ServicioConSesion) => {
    if (servicio.validation_final_status === 'COMPLETADO') {
      return {
        text: 'Completado',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    }

    if (servicio.device_esn && servicio.session_data) {
      return {
        text: 'En Proceso',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Activity className="w-4 h-4" />,
      };
    }

    return {
      text: 'Pendiente',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: <Clock className="w-4 h-4" />,
    };
  };

  const getPruebasCompletadas = (session: any) => {
    if (!session) return { completadas: 0, total: 7 };

    let completadas = 0;
    if (session.ignicion_exitosa) completadas++;
    if (session.boton_exitoso) completadas++;
    if (session.ubicacion_exitosa) completadas++;
    if (session.bloqueo_exitoso) completadas++;
    if (session.desbloqueo_exitoso) completadas++;
    if (session.buzzer_exitoso) completadas++;
    if (session.buzzer_off_exitoso) completadas++;

    return { completadas, total: 7 };
  };

  const agruparPorTecnico = () => {
    const grupos: {
      [key: string]: {
        servicios: ServicioConSesion[];
        nombre: string;
        telefono: string;
      }
    } = {};

    servicios.forEach((servicio) => {
      const tecnico = servicio.email_tecnico || 'Sin asignar';
      if (!grupos[tecnico]) {
        grupos[tecnico] = {
          servicios: [],
          nombre: servicio.technician_name || 'N/A',
          telefono: servicio.technician_phone || 'N/A',
        };
      }
      grupos[tecnico].servicios.push(servicio);
    });

    return grupos;
  };

  const formatearHora = (fechaISO: string | null) => {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  if (selectedExpedienteId) {
    return (
      <ExpedienteDetail
        expedienteId={selectedExpedienteId}
        onBack={() => setSelectedExpedienteId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const gruposPorTecnico = agruparPorTecnico();
  const totalServicios = servicios.length;
  const completados = servicios.filter((s) => s.validation_final_status === 'COMPLETADO').length;
  const enProceso = servicios.filter((s) => s.device_esn && s.validation_final_status !== 'COMPLETADO').length;
  const pendientes = servicios.filter((s) => !s.device_esn && s.validation_final_status !== 'COMPLETADO').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-3xl font-bold text-gray-900">{totalServicios}</p>
            </div>
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-3xl font-bold text-amber-600">{pendientes}</p>
            </div>
            <Clock className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Proceso</p>
              <p className="text-3xl font-bold text-blue-600">{enProceso}</p>
            </div>
            <Activity className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completados</p>
              <p className="text-3xl font-bold text-green-600">{completados}</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Servicios del Día</h2>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              autoRefresh
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(gruposPorTecnico).map(([tecnico, dataTecnico]) => (
            <div key={tecnico} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <User className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{dataTecnico.nombre}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <span>{tecnico}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{dataTecnico.telefono}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {dataTecnico.servicios.length} servicios
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {dataTecnico.servicios.map((servicio) => {
                  const status = getStatusBadge(servicio);
                  const pruebas = getPruebasCompletadas(servicio.session_data);

                  return (
                    <div
                      key={servicio.id}
                      onClick={() => setSelectedExpedienteId(servicio.id)}
                      className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-400 transition-colors shadow-sm cursor-pointer hover:shadow-md"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-900 text-lg">
                              {servicio.appointment_name} - {servicio.work_order_name}
                            </h4>
                            <span
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}
                            >
                              {status.icon}
                              {status.text}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Hora: {formatearHora(servicio.scheduled_start_time)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Building className="w-4 h-4" />
                              <span>Compañía: {servicio.company_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <FileText className="w-4 h-4" />
                              <span>Tipo: {servicio.service_type || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <FileText className="w-4 h-4" />
                              <span>Acta: {servicio.tipo_de_acta || 'N/A'}</span>
                            </div>
                            {servicio.device_esn && (
                              <div className="flex items-center gap-2 text-blue-700 font-semibold col-span-full">
                                <Activity className="w-4 h-4" />
                                <span>ESN: {servicio.device_esn}</span>
                                {servicio.device_esn_cambio_cantidad > 0 && (
                                  <span
                                    className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-medium rounded-full flex items-center gap-1"
                                    title={`Motivo: ${servicio.device_esn_cambio_motivo || 'N/A'}`}
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                    Cambiado {servicio.device_esn_cambio_cantidad}x
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {servicio.session_data && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progreso de pruebas:</span>
                            <span className="font-semibold text-gray-900">
                              {pruebas.completadas} / {pruebas.total}
                            </span>
                          </div>
                          <div className="mt-2 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(pruebas.completadas / pruebas.total) * 100}%` }}
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {[
                              { label: 'Ignición', value: servicio.session_data.ignicion_exitosa },
                              { label: 'Botón', value: servicio.session_data.boton_exitoso },
                              { label: 'Ubicación', value: servicio.session_data.ubicacion_exitosa },
                              { label: 'Bloqueo', value: servicio.session_data.bloqueo_exitoso },
                              { label: 'Desbloqueo', value: servicio.session_data.desbloqueo_exitoso },
                              { label: 'Buzzer ON', value: servicio.session_data.buzzer_exitoso },
                              { label: 'Buzzer OFF', value: servicio.session_data.buzzer_off_exitoso },
                            ].map((prueba) => (
                              <div
                                key={prueba.label}
                                className={`px-2 py-1 rounded ${
                                  prueba.value
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {prueba.label}: {prueba.value ? '✓' : '○'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {servicios.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay servicios programados para hoy</p>
          </div>
        )}
      </div>
    </div>
  );
}
