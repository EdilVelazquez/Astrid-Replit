import { useState } from 'react';
import { ExpedienteServicio } from '../types';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, Lock, List, Filter, Building2, MapPin, FileText, ClipboardList } from 'lucide-react';

function formatearFechaLocal(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface CalendarioTecnicoProps {
  servicios: ExpedienteServicio[];
  onSeleccionarServicio: (servicio: ExpedienteServicio) => void;
  servicioActual: ExpedienteServicio | null;
}

type VistaCalendario = 'dia' | 'semana' | 'mes';
type FiltroEstado = 'todos' | 'pendiente' | 'en_curso' | 'completado';

type EstadoServicio = {
  estado: 'completado' | 'en_curso' | 'pendiente' | 'bloqueado';
  color: string;
  colorTexto: string;
  icono: JSX.Element;
  colorEvento: string;
  colorTextoEvento: string;
};

export default function CalendarioTecnico({
  servicios,
  onSeleccionarServicio,
  servicioActual
}: CalendarioTecnicoProps) {
  const [vistaActual, setVistaActual] = useState<VistaCalendario>('dia');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  const esHoy = (fecha: Date): boolean => {
    const hoy = new Date();
    return formatearFechaLocal(fecha) === formatearFechaLocal(hoy);
  };

  const esFuturo = (fecha: Date): boolean => {
    const hoy = new Date();
    return formatearFechaLocal(fecha) > formatearFechaLocal(hoy);
  };

  const esPasado = (fecha: Date): boolean => {
    const hoy = new Date();
    return formatearFechaLocal(fecha) < formatearFechaLocal(hoy);
  };

  const obtenerEstadoServicio = (servicio: ExpedienteServicio): EstadoServicio => {
    const fechaServicio = servicio.scheduled_start_time
      ? new Date(servicio.scheduled_start_time)
      : null;

    if (fechaServicio && esFuturo(fechaServicio)) {
      return {
        estado: 'bloqueado',
        color: 'bg-gray-100',
        colorTexto: 'text-gray-600',
        icono: <Lock className="w-4 h-4" />,
        colorEvento: 'bg-gray-400',
        colorTextoEvento: 'text-gray-900'
      };
    }

    if (servicio.validation_final_status === 'COMPLETADO') {
      return {
        estado: 'completado',
        color: 'bg-green-100',
        colorTexto: 'text-green-800',
        icono: <CheckCircle2 className="w-4 h-4" />,
        colorEvento: 'bg-green-500',
        colorTextoEvento: 'text-white'
      };
    }

    if (servicio.validation_start_timestamp && !servicio.validation_end_timestamp) {
      return {
        estado: 'en_curso',
        color: 'bg-blue-100',
        colorTexto: 'text-blue-800',
        icono: <Clock className="w-4 h-4" />,
        colorEvento: 'bg-blue-500',
        colorTextoEvento: 'text-white'
      };
    }

    return {
      estado: 'pendiente',
      color: 'bg-yellow-100',
      colorTexto: 'text-yellow-800',
      icono: <AlertCircle className="w-4 h-4" />,
      colorEvento: 'bg-yellow-500',
      colorTextoEvento: 'text-gray-900'
    };
  };

  const puedeIniciarServicio = (servicio: ExpedienteServicio): boolean => {
    if (!servicio.scheduled_start_time) return false;

    const fechaServicio = new Date(servicio.scheduled_start_time);
    return esHoy(fechaServicio) && servicio.validation_final_status !== 'COMPLETADO';
  };

  const serviciosFiltrados = servicios.filter(servicio => {
    if (filtroEstado === 'todos') return true;

    const { estado } = obtenerEstadoServicio(servicio);
    if (filtroEstado === 'pendiente') return estado === 'pendiente';
    if (filtroEstado === 'en_curso') return estado === 'en_curso';
    if (filtroEstado === 'completado') return estado === 'completado';

    return true;
  });

  const obtenerServiciosEnRango = (): ExpedienteServicio[] => {
    const inicio = new Date(fechaSeleccionada);
    const fin = new Date(fechaSeleccionada);

    if (vistaActual === 'dia') {
      inicio.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
    } else if (vistaActual === 'semana') {
      const diaSemana = inicio.getDay();
      inicio.setDate(inicio.getDate() - diaSemana);
      inicio.setHours(0, 0, 0, 0);
      fin.setDate(inicio.getDate() + 6);
      fin.setHours(23, 59, 59, 999);
    } else if (vistaActual === 'mes') {
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      fin.setMonth(fin.getMonth() + 1);
      fin.setDate(0);
      fin.setHours(23, 59, 59, 999);
    }

    return serviciosFiltrados.filter(servicio => {
      if (!servicio.scheduled_start_time) return false;
      const fecha = new Date(servicio.scheduled_start_time);
      return fecha >= inicio && fecha <= fin;
    });
  };

  const serviciosOrdenados = (() => {
    const serviciosEnRango = obtenerServiciosEnRango();

    const pendientes = serviciosEnRango.filter(s => {
      const { estado } = obtenerEstadoServicio(s);
      return estado !== 'completado';
    }).sort((a, b) => {
      const fechaA = new Date(a.scheduled_start_time || 0);
      const fechaB = new Date(b.scheduled_start_time || 0);
      return fechaA.getTime() - fechaB.getTime();
    });

    const completados = serviciosEnRango.filter(s => {
      const { estado } = obtenerEstadoServicio(s);
      return estado === 'completado';
    }).sort((a, b) => {
      const fechaA = new Date(a.scheduled_start_time || 0);
      const fechaB = new Date(b.scheduled_start_time || 0);
      return fechaB.getTime() - fechaA.getTime();
    });

    return [...pendientes, ...completados];
  })();

  const cambiarFecha = (direccion: 'anterior' | 'siguiente') => {
    const nueva = new Date(fechaSeleccionada);

    if (vistaActual === 'dia') {
      nueva.setDate(nueva.getDate() + (direccion === 'siguiente' ? 1 : -1));
    } else if (vistaActual === 'semana') {
      nueva.setDate(nueva.getDate() + (direccion === 'siguiente' ? 7 : -7));
    } else if (vistaActual === 'mes') {
      nueva.setMonth(nueva.getMonth() + (direccion === 'siguiente' ? 1 : -1));
    }

    setFechaSeleccionada(nueva);
  };

  const irHoy = () => {
    setFechaSeleccionada(new Date());
  };

  const seleccionarDia = (fecha: Date) => {
    setFechaSeleccionada(new Date(fecha));
    setVistaActual('dia');
  };

  const formatearRangoFecha = (): string => {
    if (vistaActual === 'dia') {
      return fechaSeleccionada.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (vistaActual === 'semana') {
      const inicio = new Date(fechaSeleccionada);
      const diaSemana = inicio.getDay();
      inicio.setDate(inicio.getDate() - diaSemana);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 6);

      const hoy = new Date();
      const inicioHoy = new Date(hoy);
      inicioHoy.setDate(inicioHoy.getDate() - inicioHoy.getDay());
      const esEstaSemanaBool = formatearFechaLocal(inicio) === formatearFechaLocal(inicioHoy);

      if (esEstaSemanaBool) {
        return 'Esta semana';
      }

      return `${inicio.getDate()} - ${fin.getDate()} ${fin.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
    } else {
      const hoy = new Date();
      const esEsteMesBool = fechaSeleccionada.getMonth() === hoy.getMonth() &&
                           fechaSeleccionada.getFullYear() === hoy.getFullYear();

      if (esEsteMesBool) {
        return 'Este mes';
      }

      return fechaSeleccionada.toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const formatearHora = (fechaISO: string): string => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const obtenerResumenEstados = () => {
    const serviciosRango = obtenerServiciosEnRango();

    const completados = serviciosRango.filter(s => {
      const { estado } = obtenerEstadoServicio(s);
      return estado === 'completado';
    }).length;

    const enCurso = serviciosRango.filter(s => {
      const { estado } = obtenerEstadoServicio(s);
      return estado === 'en_curso';
    }).length;

    const pendientes = serviciosRango.filter(s => {
      const { estado } = obtenerEstadoServicio(s);
      return estado === 'pendiente';
    }).length;

    const bloqueados = serviciosRango.filter(s => {
      const { estado } = obtenerEstadoServicio(s);
      return estado === 'bloqueado';
    }).length;

    return { completados, enCurso, pendientes, bloqueados, total: serviciosRango.length };
  };

  const resumen = obtenerResumenEstados();

  const renderVistaCalendario = () => {
    if (vistaActual === 'dia') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Servicios del día</h3>
              <div className="space-y-3">
                {serviciosOrdenados.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay servicios para esta fecha</p>
                  </div>
                ) : (
                  serviciosOrdenados.map(servicio => (
                    <TarjetaServicio
                      key={servicio.id}
                      servicio={servicio}
                      estado={obtenerEstadoServicio(servicio)}
                      puedeIniciar={puedeIniciarServicio(servicio)}
                      esActual={servicioActual?.id === servicio.id}
                      onSeleccionar={onSeleccionarServicio}
                      formatearHora={formatearHora}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <ListaCompactaServicios
              servicios={serviciosOrdenados}
              obtenerEstadoServicio={obtenerEstadoServicio}
              formatearHora={formatearHora}
              onSeleccionar={onSeleccionarServicio}
              servicioActual={servicioActual}
              puedeIniciarServicio={puedeIniciarServicio}
            />
          </div>
        </div>
      );
    } else if (vistaActual === 'semana') {
      return (
        <div className="grid grid-cols-1 gap-6">
          <VistaCalendarioSemana
            servicios={serviciosOrdenados}
            fechaSeleccionada={fechaSeleccionada}
            obtenerEstadoServicio={obtenerEstadoServicio}
            formatearHora={formatearHora}
            onSeleccionar={onSeleccionarServicio}
            servicioActual={servicioActual}
            puedeIniciarServicio={puedeIniciarServicio}
            esHoy={esHoy}
            onSeleccionarDia={seleccionarDia}
          />
          <ListaCompactaServicios
            servicios={serviciosOrdenados}
            obtenerEstadoServicio={obtenerEstadoServicio}
            formatearHora={formatearHora}
            onSeleccionar={onSeleccionarServicio}
            servicioActual={servicioActual}
            puedeIniciarServicio={puedeIniciarServicio}
          />
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-1 gap-6">
          <VistaCalendarioMes
            servicios={serviciosOrdenados}
            fechaSeleccionada={fechaSeleccionada}
            obtenerEstadoServicio={obtenerEstadoServicio}
            onSeleccionar={onSeleccionarServicio}
            servicioActual={servicioActual}
            puedeIniciarServicio={puedeIniciarServicio}
            esHoy={esHoy}
            onSeleccionarDia={seleccionarDia}
          />
          <ListaCompactaServicios
            servicios={serviciosOrdenados}
            obtenerEstadoServicio={obtenerEstadoServicio}
            formatearHora={formatearHora}
            onSeleccionar={onSeleccionarServicio}
            servicioActual={servicioActual}
            puedeIniciarServicio={puedeIniciarServicio}
          />
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Mi Agenda</h1>
                  <p className="text-sm text-gray-500">Calendario de servicios</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => cambiarFecha('anterior')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={irHoy}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Hoy
                </button>
                <button
                  onClick={() => cambiarFecha('siguiente')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Siguiente"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 capitalize">
                {formatearRangoFecha()}
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVistaActual('dia')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    vistaActual === 'dia'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => setVistaActual('semana')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    vistaActual === 'semana'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setVistaActual('mes')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    vistaActual === 'mes'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Mes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <List className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{resumen.total}</div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Pendientes</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{resumen.pendientes}</div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">En Curso</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{resumen.enCurso}</div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Completados</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{resumen.completados}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Futuros</span>
                </div>
                <div className="text-2xl font-bold text-gray-600">{resumen.bloqueados}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtrar por estado:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltroEstado('todos')}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    filtroEstado === 'todos'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroEstado('pendiente')}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    filtroEstado === 'pendiente'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                  }`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setFiltroEstado('en_curso')}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    filtroEstado === 'en_curso'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  En Curso
                </button>
                <button
                  onClick={() => setFiltroEstado('completado')}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    filtroEstado === 'completado'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  Completados
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {renderVistaCalendario()}
          </div>
        </div>
      </div>
    </div>
  );
}

function TarjetaServicio({
  servicio,
  estado,
  puedeIniciar,
  esActual,
  onSeleccionar,
  formatearHora
}: {
  servicio: ExpedienteServicio;
  estado: EstadoServicio;
  puedeIniciar: boolean;
  esActual: boolean;
  onSeleccionar: (servicio: ExpedienteServicio) => void;
  formatearHora: (fecha: string) => string;
}) {
  const getBorderColor = () => {
    if (estado.estado === 'completado') return 'border-green-300';
    if (estado.estado === 'en_curso') return 'border-blue-300';
    if (estado.estado === 'pendiente') return 'border-yellow-300';
    return 'border-gray-300';
  };

  return (
    <div
      className={`border-2 rounded-lg p-4 transition-all ${estado.color} ${getBorderColor()} ${
        esActual ? 'ring-4 ring-blue-400' : ''
      } ${
        puedeIniciar
          ? 'cursor-pointer hover:shadow-md'
          : 'cursor-not-allowed opacity-75'
      }`}
      onClick={() => puedeIniciar && onSeleccionar(servicio)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`${estado.colorTexto}`}>
              {estado.icono}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900">
                  {servicio.appointment_name || 'Sin número de cita'}
                </span>
                {servicio.is_test_service && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded border border-purple-300">
                    🧪 PRUEBAS
                  </span>
                )}
                {servicio.scheduled_start_time && (
                  <span className="text-sm text-gray-600 font-medium">
                    {formatearHora(servicio.scheduled_start_time)}
                  </span>
                )}
                {estado.estado === 'bloqueado' && (
                  <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded">
                    BLOQUEADO
                  </span>
                )}
                {estado.estado === 'completado' && (
                  <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded">
                    COMPLETADO
                  </span>
                )}
                {estado.estado === 'en_curso' && (
                  <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded">
                    EN CURSO
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {servicio.work_order_name || 'Sin orden de trabajo'}
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Cliente:</span>
                <div className="font-medium text-gray-900">
                  {servicio.client_name || 'No especificado'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Vehículo:</span>
                <div className="font-medium text-gray-900">
                  {servicio.asset_name || 'No especificado'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Tipo de servicio:</span>
                <div className="font-medium text-gray-900">
                  {servicio.service_type || 'No especificado'}
                </div>
              </div>
              {servicio.device_esn && (
                <div>
                  <span className="text-gray-500">Dispositivo:</span>
                  <div className="font-mono font-medium text-gray-900">
                    {servicio.device_esn}
                  </div>
                </div>
              )}
              {servicio.status && (
                <div>
                  <span className="text-gray-500">Estado TCV:</span>
                  <div className="font-medium text-gray-900">
                    {servicio.status}
                  </div>
                </div>
              )}
              {servicio.tipo_de_acta && (
                <div>
                  <span className="text-gray-500">Tipo de acta:</span>
                  <div className="font-medium text-gray-900">
                    {servicio.tipo_de_acta}
                  </div>
                </div>
              )}
            </div>

            {servicio.company_name && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-start gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-gray-500 block">Empresa:</span>
                    <div className="font-medium text-gray-900">{servicio.company_name}</div>
                  </div>
                </div>
              </div>
            )}

            {(servicio.service_street || servicio.service_city || servicio.service_state) && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-gray-500 block">Ubicación del servicio:</span>
                    <div className="font-medium text-gray-900">
                      {[
                        servicio.service_street,
                        servicio.service_city,
                        servicio.service_state,
                        servicio.service_zip_code
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {servicio.installation_details && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-gray-500 block">Detalles de instalación:</span>
                    <div className="font-medium text-gray-900">{servicio.installation_details}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {estado.estado === 'bloqueado' && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="w-4 h-4" />
            <span>Este servicio solo puede iniciarse el día programado</span>
          </div>
        </div>
      )}

      {puedeIniciar && !esActual && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Iniciar servicio
          </button>
        </div>
      )}

      {esActual && (
        <div className="mt-3 pt-3 border-t border-blue-300">
          <div className="flex items-center gap-2 text-blue-700 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            <span>Servicio actualmente seleccionado</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ListaCompactaServicios({
  servicios,
  obtenerEstadoServicio,
  formatearHora,
  onSeleccionar,
  servicioActual,
  puedeIniciarServicio
}: {
  servicios: ExpedienteServicio[];
  obtenerEstadoServicio: (s: ExpedienteServicio) => EstadoServicio;
  formatearHora: (f: string) => string;
  onSeleccionar: (s: ExpedienteServicio) => void;
  servicioActual: ExpedienteServicio | null;
  puedeIniciarServicio: (s: ExpedienteServicio) => boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Mi Agenda</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {servicios.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No hay servicios en este rango
          </div>
        ) : (
          servicios.map(servicio => {
            const estado = obtenerEstadoServicio(servicio);
            const puedeIniciar = puedeIniciarServicio(servicio);
            const esActual = servicioActual?.id === servicio.id;

            return (
              <div
                key={servicio.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  esActual ? 'ring-2 ring-blue-400 border-blue-400' : ''
                } ${
                  estado.estado === 'completado' ? 'bg-green-50 border-green-300' :
                  estado.estado === 'en_curso' ? 'bg-blue-50 border-blue-300' :
                  estado.estado === 'pendiente' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-gray-50 border-gray-300'
                } ${
                  puedeIniciar ? 'cursor-pointer hover:shadow-sm' : 'cursor-not-allowed opacity-75'
                }`}
                onClick={() => puedeIniciar && onSeleccionar(servicio)}
              >
                <div className="flex items-start gap-2">
                  <div className={estado.colorTexto}>
                    {estado.icono}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">
                      {servicio.appointment_name || 'Sin cita'}
                    </div>
                    {servicio.scheduled_start_time && (
                      <div className="text-xs text-gray-600 font-medium">
                        {formatearHora(servicio.scheduled_start_time)}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 truncate">
                      {servicio.client_name || 'Cliente no especificado'}
                    </div>
                    {servicio.service_type && (
                      <div className="text-xs text-gray-600 truncate mt-1">
                        <span className="font-medium">Tipo:</span> {servicio.service_type}
                      </div>
                    )}
                    {servicio.company_name && (
                      <div className="text-xs text-gray-600 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{servicio.company_name}</span>
                      </div>
                    )}
                    {servicio.service_city && (
                      <div className="text-xs text-gray-600 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{servicio.service_city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function VistaCalendarioSemana({
  servicios,
  fechaSeleccionada,
  obtenerEstadoServicio,
  formatearHora,
  onSeleccionar,
  servicioActual,
  puedeIniciarServicio,
  esHoy,
  onSeleccionarDia
}: {
  servicios: ExpedienteServicio[];
  fechaSeleccionada: Date;
  obtenerEstadoServicio: (s: ExpedienteServicio) => EstadoServicio;
  formatearHora: (f: string) => string;
  onSeleccionar: (s: ExpedienteServicio) => void;
  servicioActual: ExpedienteServicio | null;
  puedeIniciarServicio: (s: ExpedienteServicio) => boolean;
  esHoy: (f: Date) => boolean;
  onSeleccionarDia: (fecha: Date) => void;
}) {
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const inicioSemana = new Date(fechaSeleccionada);
  const diaSemana = inicioSemana.getDay();
  const ajuste = diaSemana === 0 ? 6 : diaSemana - 1;
  inicioSemana.setDate(inicioSemana.getDate() - ajuste);

  const diasArray = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemana);
    dia.setDate(dia.getDate() + i);
    return dia;
  });

  const serviciosPorDia = diasArray.map(dia => {
    const diaStr = formatearFechaLocal(dia);
    return servicios.filter(servicio => {
      if (!servicio.scheduled_start_time) return false;
      const servicioFecha = formatearFechaLocal(new Date(servicio.scheduled_start_time));
      return servicioFecha === diaStr;
    }).sort((a, b) => {
      const fechaA = new Date(a.scheduled_start_time || 0);
      const fechaB = new Date(b.scheduled_start_time || 0);
      return fechaA.getTime() - fechaB.getTime();
    });
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {diasArray.map((dia, idx) => {
          const esHoyDia = esHoy(dia);
          return (
            <div
              key={idx}
              className={`p-3 text-center border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-blue-100 transition-colors ${
                esHoyDia ? 'bg-blue-50' : ''
              }`}
              onClick={() => onSeleccionarDia(dia)}
              title="Click para ver el detalle del día"
            >
              <div className={`text-sm font-semibold ${esHoyDia ? 'text-blue-600' : 'text-gray-700'}`}>
                {diasSemana[idx]}
              </div>
              <div className={`text-2xl font-bold ${esHoyDia ? 'text-blue-600' : 'text-gray-900'}`}>
                {dia.getDate()}
              </div>
              {esHoyDia && (
                <div className="text-xs text-blue-600 font-medium">Hoy</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7">
        {serviciosPorDia.map((serviciosDia, idx) => {
          const dia = diasArray[idx];
          const esHoyDia = esHoy(dia);

          return (
            <div
              key={idx}
              className={`min-h-[200px] p-2 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-blue-100 transition-colors ${
                esHoyDia ? 'bg-blue-50' : ''
              }`}
              onClick={() => onSeleccionarDia(dia)}
              title="Click para ver el detalle del día"
            >
              <div className="space-y-1">
                {serviciosDia.map(servicio => {
                  const estado = obtenerEstadoServicio(servicio);
                  const puedeIniciar = puedeIniciarServicio(servicio);
                  const esActual = servicioActual?.id === servicio.id;

                  return (
                    <div
                      key={servicio.id}
                      className={`p-2 rounded text-xs ${estado.colorEvento} ${estado.colorTextoEvento} ${
                        esActual ? 'ring-2 ring-blue-600' : ''
                      } ${
                        puedeIniciar ? 'hover:opacity-90' : 'opacity-75'
                      }`}
                      onClick={(e) => {
                        if (puedeIniciar) {
                          e.stopPropagation();
                          onSeleccionar(servicio);
                        }
                      }}
                      title={`${servicio.appointment_name || 'Sin cita'} - ${servicio.client_name || 'Sin cliente'}`}
                    >
                      <div className="font-semibold truncate">
                        {servicio.scheduled_start_time && formatearHora(servicio.scheduled_start_time)}
                      </div>
                      <div className="truncate font-medium">
                        {servicio.appointment_name || 'Sin cita'}
                      </div>
                      {servicio.service_type && (
                        <div className="truncate text-[10px] opacity-80 mt-0.5">
                          {servicio.service_type}
                        </div>
                      )}
                      {servicio.company_name && (
                        <div className="truncate text-[10px] opacity-80 flex items-center gap-1">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span>{servicio.company_name}</span>
                        </div>
                      )}
                      {servicio.service_city && (
                        <div className="truncate text-[10px] opacity-80 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span>{servicio.service_city}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VistaCalendarioMes({
  servicios,
  fechaSeleccionada,
  obtenerEstadoServicio,
  onSeleccionar,
  servicioActual,
  puedeIniciarServicio,
  esHoy,
  onSeleccionarDia
}: {
  servicios: ExpedienteServicio[];
  fechaSeleccionada: Date;
  obtenerEstadoServicio: (s: ExpedienteServicio) => EstadoServicio;
  onSeleccionar: (s: ExpedienteServicio) => void;
  servicioActual: ExpedienteServicio | null;
  puedeIniciarServicio: (s: ExpedienteServicio) => boolean;
  esHoy: (f: Date) => boolean;
  onSeleccionarDia: (fecha: Date) => void;
}) {
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const primerDiaMes = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), 1);
  const ultimoDiaMes = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth() + 1, 0);

  const primerDiaSemanaRaw = primerDiaMes.getDay();
  const primerDiaSemana = primerDiaSemanaRaw === 0 ? 6 : primerDiaSemanaRaw - 1;
  const diasEnMes = ultimoDiaMes.getDate();

  const diasArray: (Date | null)[] = [];

  for (let i = 0; i < primerDiaSemana; i++) {
    diasArray.push(null);
  }

  for (let i = 1; i <= diasEnMes; i++) {
    diasArray.push(new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), i));
  }

  const semanas: (Date | null)[][] = [];
  for (let i = 0; i < diasArray.length; i += 7) {
    semanas.push(diasArray.slice(i, i + 7));
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {diasSemana.map(dia => (
          <div key={dia} className="p-3 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
            {dia}
          </div>
        ))}
      </div>

      <div>
        {semanas.map((semana, semanaIdx) => (
          <div key={semanaIdx} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
            {semana.map((dia, diaIdx) => {
              if (!dia) {
                return <div key={diaIdx} className="min-h-[100px] p-2 bg-gray-50 border-r border-gray-200 last:border-r-0" />;
              }

              const esHoyDia = esHoy(dia);
              const diaStr = formatearFechaLocal(dia);
              const serviciosDia = servicios.filter(servicio => {
                if (!servicio.scheduled_start_time) return false;
                const servicioFecha = formatearFechaLocal(new Date(servicio.scheduled_start_time));
                return servicioFecha === diaStr;
              });

              return (
                <div
                  key={diaIdx}
                  className={`min-h-[100px] p-2 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-blue-100 transition-colors ${
                    esHoyDia ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onSeleccionarDia(dia)}
                  title="Click para ver el detalle del día"
                >
                  <div className={`text-sm font-semibold mb-1 ${esHoyDia ? 'text-blue-600' : 'text-gray-700'}`}>
                    {dia.getDate()}
                  </div>
                  <div className="space-y-1">
                    {serviciosDia.slice(0, 3).map(servicio => {
                      const estado = obtenerEstadoServicio(servicio);
                      const puedeIniciar = puedeIniciarServicio(servicio);
                      const esActual = servicioActual?.id === servicio.id;

                      const tooltipInfo = [
                        servicio.appointment_name || 'Sin cita',
                        servicio.service_type,
                        servicio.company_name,
                        servicio.service_city
                      ].filter(Boolean).join(' • ');

                      return (
                        <div
                          key={servicio.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${estado.colorEvento} ${estado.colorTextoEvento} ${
                            esActual ? 'ring-1 ring-blue-600' : ''
                          } ${
                            puedeIniciar ? 'hover:opacity-90' : 'opacity-75'
                          }`}
                          onClick={(e) => {
                            if (puedeIniciar) {
                              e.stopPropagation();
                              onSeleccionar(servicio);
                            }
                          }}
                          title={tooltipInfo}
                        >
                          <div className="truncate font-medium">
                            {servicio.appointment_name || 'Sin cita'}
                          </div>
                          {(servicio.service_type || servicio.company_name) && (
                            <div className="truncate text-[9px] opacity-70 mt-0.5 flex items-center gap-1">
                              {servicio.service_type && (
                                <span>{servicio.service_type.substring(0, 15)}{servicio.service_type.length > 15 ? '...' : ''}</span>
                              )}
                              {servicio.company_name && servicio.service_type && <span>•</span>}
                              {servicio.company_name && (
                                <span className="flex items-center gap-0.5">
                                  <Building2 className="w-2.5 h-2.5" />
                                  {servicio.company_name.substring(0, 12)}{servicio.company_name.length > 12 ? '...' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {serviciosDia.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium px-1.5">
                        +{serviciosDia.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
