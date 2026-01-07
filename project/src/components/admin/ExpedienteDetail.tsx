import { useState, useEffect } from 'react';
import { ExpedienteServicio } from '../../types';
import { supabase } from '../../supabaseClient';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Building,
  Truck,
  Server,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  RefreshCcw,
  Webhook,
  Send
} from 'lucide-react';
import { obtenerLogsWebhook, formatearTimestamp, getActionLabel, getActionColor, WebhookLogEntry } from '../../services/webhookLogService';

interface ExpedienteDetailProps {
  expedienteId: number;
  onBack: () => void;
}

interface TestSession {
  esn: string;
  ignicion_exitosa: boolean;
  boton_exitoso: boolean;
  ubicacion_exitosa: boolean;
  bloqueo_exitoso: boolean;
  desbloqueo_exitoso: boolean;
  buzzer_exitoso: boolean;
  buzzer_off_exitoso: boolean;
  boton_fecha_preguntada: string | null;
  ubicacion_fecha_preguntada: string | null;
  url_ubicacion: string | null;
  intentos_realizados: number;
  session_active: boolean;
  last_query_at: string | null;
  created_at: string;
  updated_at: string;
}

export function ExpedienteDetail({ expedienteId, onBack }: ExpedienteDetailProps) {
  const [expediente, setExpediente] = useState<ExpedienteServicio | null>(null);
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadExpedienteDetail();
  }, [expedienteId]);

  useEffect(() => {
    if (expedienteId) {
      loadWebhookLogs();
    }
  }, [expedienteId]);

  const loadWebhookLogs = async () => {
    setLoadingLogs(true);
    const logs = await obtenerLogsWebhook(expedienteId);
    setWebhookLogs(logs);
    setLoadingLogs(false);
  };

  const loadExpedienteDetail = async () => {
    setLoading(true);

    const { data: expData, error: expError } = await supabase
      .from('expedientes_servicio')
      .select('*')
      .eq('id', expedienteId)
      .maybeSingle();

    if (expError || !expData) {
      console.error('Error loading expediente:', expError);
      setLoading(false);
      return;
    }

    setExpediente(expData as ExpedienteServicio);

    const expedienteUniqueId = `${expData.work_order_name}_${expData.appointment_name}`;
    const { data: sessionData } = await supabase
      .from('device_test_sessions')
      .select('*')
      .eq('expediente_id', expedienteUniqueId)
      .maybeSingle();

    if (sessionData) {
      setTestSession(sessionData as TestSession);
    }

    setLoading(false);
  };

  const formatearFecha = (fechaISO: string | null) => {
    if (!fechaISO) return 'N/A';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    if (!expediente) return null;

    if (expediente.validation_final_status === 'COMPLETADO') {
      return {
        text: 'Completado',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle2 className="w-5 h-5" />,
      };
    }

    if (expediente.device_esn && testSession) {
      return {
        text: 'En Proceso',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <Activity className="w-5 h-5" />,
      };
    }

    return {
      text: 'Pendiente',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: <Clock className="w-5 h-5" />,
    };
  };

  const getPruebaIcon = (exitosa: boolean) => {
    return exitosa ? (
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-gray-400" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!expediente) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No se encontró el expediente</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const status = getStatusBadge();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Detalles del Expediente
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {expediente.appointment_name} - {expediente.work_order_name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">ID: {expediente.id}</p>
          </div>
          {status && (
            <span className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold ${status.color}`}>
              {status.icon}
              {status.text}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Tipo de servicio</p>
                <p className="text-sm font-medium text-gray-800">{expediente.service_type}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Empresa</p>
                <p className="text-sm font-medium text-gray-800">{expediente.company_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="text-sm font-medium text-gray-800">{expediente.client_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Técnico</p>
                <p className="text-sm font-medium text-gray-800">{expediente.technician_name}</p>
                <p className="text-xs text-gray-500">{expediente.technician_phone}</p>
                <p className="text-xs text-gray-500">{expediente.email_tecnico}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Server className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Servidor / Plataforma</p>
                <p className="text-sm font-medium text-gray-800">
                  {expediente.server_name} / {expediente.platform_number}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Dirección</p>
                <p className="text-sm font-medium text-gray-800">
                  {expediente.service_street}, {expediente.service_city}
                </p>
                <p className="text-xs text-gray-500">
                  {expediente.service_state}, {expediente.service_zip_code}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Horario programado</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatearFecha(expediente.scheduled_start_time)} - {formatearFecha(expediente.scheduled_end_time).split(' ')[1]}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Tipo de acta</p>
                <p className="text-sm font-medium text-gray-800">{expediente.tipo_de_acta || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {expediente.device_esn && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Dispositivo</h3>
              {expediente.device_esn_cambio_cantidad > 0 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Cambiado {expediente.device_esn_cambio_cantidad} {expediente.device_esn_cambio_cantidad === 1 ? 'vez' : 'veces'}
                </span>
              )}
            </div>
            <p className="text-sm">
              <span className="text-gray-600">ESN:</span>{' '}
              <span className="font-mono font-semibold text-blue-700">{expediente.device_esn}</span>
            </p>

            {expediente.device_esn_cambio_cantidad > 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <RefreshCcw className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-orange-900 mb-2">Historial de Cambios de Dispositivo</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-700 font-medium">ESN Anterior:</span>
                        <span className="font-mono text-orange-900">{expediente.device_esn_anterior || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700 font-medium">ESN Actual:</span>
                        <span className="font-mono text-orange-900">{expediente.device_esn}</span>
                      </div>
                      {expediente.device_esn_cambio_motivo && (
                        <div className="pt-2 border-t border-orange-200">
                          <p className="text-orange-700 font-medium mb-1">Motivo del cambio:</p>
                          <p className="text-orange-900">{expediente.device_esn_cambio_motivo}</p>
                        </div>
                      )}
                      {expediente.device_esn_cambio_descripcion && (
                        <div className="pt-2 border-t border-orange-200">
                          <p className="text-orange-700 font-medium mb-1">Descripción adicional:</p>
                          <p className="text-orange-900">{expediente.device_esn_cambio_descripcion}</p>
                        </div>
                      )}
                      {expediente.device_esn_cambio_timestamp && (
                        <div className="pt-2 border-t border-orange-200">
                          <p className="text-orange-700 font-medium mb-1">Fecha del cambio:</p>
                          <p className="text-orange-900">{formatearFecha(expediente.device_esn_cambio_timestamp)}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t border-orange-200">
                        <p className="text-orange-700 font-medium mb-1">Técnico responsable:</p>
                        <p className="text-orange-900">{expediente.technician_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {expediente.device_esn_cambio_cantidad > 2 && (
                  <div className="mt-3 pt-3 border-t border-orange-300 flex items-center gap-2 text-xs text-orange-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Advertencia: Este servicio ha tenido múltiples cambios de dispositivo</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {testSession && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Estado de Pruebas</h3>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {[testSession.ignicion_exitosa, testSession.boton_exitoso, testSession.ubicacion_exitosa,
                  testSession.bloqueo_exitoso, testSession.desbloqueo_exitoso, testSession.buzzer_exitoso,
                  testSession.buzzer_off_exitoso].filter(Boolean).length} / 7 completadas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-l-4 border-l-transparent hover:border-l-blue-500 transition-colors">
              {getPruebaIcon(testSession.ignicion_exitosa)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">Ignición</p>
                <p className="text-xs text-gray-500 mt-1">
                  {testSession.ignicion_exitosa ? 'Exitosa' : 'Pendiente'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-l-4 border-l-transparent hover:border-l-blue-500 transition-colors">
              {getPruebaIcon(testSession.boton_exitoso)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">Botón de Pánico</p>
                <p className="text-xs text-gray-500 mt-1">
                  {testSession.boton_exitoso ? 'Exitosa' : 'Pendiente'}
                </p>
                {testSession.boton_fecha_preguntada && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-400">
                      <span className="font-medium">Consultado:</span> {formatearFecha(testSession.boton_fecha_preguntada)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-l-4 border-l-transparent hover:border-l-blue-500 transition-colors">
              {getPruebaIcon(testSession.ubicacion_exitosa)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">Ubicación</p>
                <p className="text-xs text-gray-500 mt-1">
                  {testSession.ubicacion_exitosa ? 'Exitosa' : 'Pendiente'}
                </p>
                {testSession.ubicacion_fecha_preguntada && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-400">
                      <span className="font-medium">Consultado:</span> {formatearFecha(testSession.ubicacion_fecha_preguntada)}
                    </p>
                  </div>
                )}
                {testSession.url_ubicacion && (
                  <a
                    href={testSession.url_ubicacion}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <MapPin className="w-3 h-3" />
                    Ver en Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-l-4 border-l-transparent hover:border-l-blue-500 transition-colors">
              {getPruebaIcon(testSession.bloqueo_exitoso)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">Bloqueo de Motor</p>
                <p className="text-xs text-gray-500 mt-1">
                  {testSession.bloqueo_exitoso ? 'Exitosa' : 'Pendiente'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-l-4 border-l-transparent hover:border-l-blue-500 transition-colors">
              {getPruebaIcon(testSession.desbloqueo_exitoso)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">Desbloqueo de Motor</p>
                <p className="text-xs text-gray-500 mt-1">
                  {testSession.desbloqueo_exitoso ? 'Exitosa' : 'Pendiente'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-l-4 border-l-transparent hover:border-l-blue-500 transition-colors">
              {getPruebaIcon(testSession.buzzer_exitoso)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">Buzzer ON</p>
                <p className="text-xs text-gray-500 mt-1">
                  {testSession.buzzer_exitoso ? 'Exitosa' : 'Pendiente'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-l-4 border-l-transparent hover:border-l-blue-500 transition-colors">
              {getPruebaIcon(testSession.buzzer_off_exitoso)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">Buzzer OFF</p>
                <p className="text-xs text-gray-500 mt-1">
                  {testSession.buzzer_off_exitoso ? 'Exitosa' : 'Pendiente'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Sesión creada</p>
              <p className="text-sm font-medium text-gray-800">{formatearFecha(testSession.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Última actualización</p>
              <p className="text-sm font-medium text-gray-800">{formatearFecha(testSession.updated_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Última consulta</p>
              <p className="text-sm font-medium text-gray-800">
                {testSession.last_query_at ? formatearFecha(testSession.last_query_at) : 'N/A'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Intentos: <span className="font-semibold text-gray-900">{testSession.intentos_realizados}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${testSession.session_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-600">
                  {testSession.session_active ? 'Sesión activa' : 'Sesión finalizada'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {expediente.validation_final_status === 'COMPLETADO' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Truck className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Datos del Vehículo</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Marca</p>
              <p className="text-sm font-medium text-gray-800">{expediente.asset_marca || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Modelo</p>
              <p className="text-sm font-medium text-gray-800">{expediente.asset_submarca || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Año</p>
              <p className="text-sm font-medium text-gray-800">{expediente.vehicle_year || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Color</p>
              <p className="text-sm font-medium text-gray-800">{expediente.asset_color || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">VIN</p>
              <p className="text-sm font-medium text-gray-800 font-mono">{expediente.asset_vin || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Placas</p>
              <p className="text-sm font-medium text-gray-800">{expediente.asset_placas || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Odómetro</p>
              <p className="text-sm font-medium text-gray-800">
                {expediente.vehicle_odometer ? `${expediente.vehicle_odometer} km` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Send className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Registro de Webhooks</h3>
          </div>
          <button
            onClick={loadWebhookLogs}
            disabled={loadingLogs}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : webhookLogs.length === 0 ? (
          <div className="text-center py-8">
            <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay registros de webhooks para este servicio</p>
            <p className="text-sm text-gray-400 mt-1">Los webhooks se registrarán cuando se envíen desde la app</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhookLogs.map((log, index) => (
              <div
                key={log.id || index}
                className={`border rounded-lg p-4 ${
                  log.success
                    ? 'border-gray-200 bg-white'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                    {log.success ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Exitoso
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <XCircle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {formatearTimestamp(log.timestamp)}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  {log.payload_summary}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {log.duration_ms && (
                    <span>Duración: {log.duration_ms}ms</span>
                  )}
                  {log.response_status && (
                    <span>HTTP: {log.response_status}</span>
                  )}
                </div>

                {log.error_message && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                    <strong>Error:</strong> {log.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
