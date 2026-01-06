import { useState } from 'react';
import { ExpedienteServicio } from '../types';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, Lock, List, MapPin, LayoutGrid, Building2, Car, Wrench, User, Navigation } from 'lucide-react';
import { ConfirmModal } from './ui/Modal';
import { CheckInModal } from './CheckInModal';

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
type ModoVisualizacion = 'lista' | 'tarjeta';

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
  const [modoVisualizacion, setModoVisualizacion] = useState<ModoVisualizacion>('tarjeta');
  const [servicioConfirmacion, setServicioConfirmacion] = useState<ExpedienteServicio | null>(null);
  const [servicioCheckIn, setServicioCheckIn] = useState<ExpedienteServicio | null>(null);
  const [serviciosConCheckIn, setServiciosConCheckIn] = useState<Set<number>>(new Set());

  const handleCheckInSuccess = (servicioActualizado: ExpedienteServicio) => {
    setServiciosConCheckIn(prev => new Set([...prev, servicioActualizado.id]));
  };

  const esHoy = (fecha: Date): boolean => {
    const hoy = new Date();
    return formatearFechaLocal(fecha) === formatearFechaLocal(hoy);
  };

  const esFuturo = (fecha: Date): boolean => {
    const hoy = new Date();
    return formatearFechaLocal(fecha) > formatearFechaLocal(hoy);
  };


  const obtenerEstadoServicio = (servicio: ExpedienteServicio): EstadoServicio => {
    const fechaServicio = servicio.scheduled_start_time
      ? new Date(servicio.scheduled_start_time)
      : null;

    if (fechaServicio && esFuturo(fechaServicio)) {
      return {
        estado: 'bloqueado',
        color: 'bg-gray-50',
        colorTexto: 'text-gray-500',
        icono: <Lock className="w-4 h-4" />,
        colorEvento: 'bg-gray-100 border border-gray-200',
        colorTextoEvento: 'text-gray-500'
      };
    }

    if (servicio.validation_final_status === 'COMPLETADO') {
      return {
        estado: 'completado',
        color: 'bg-emerald-50',
        colorTexto: 'text-emerald-700',
        icono: <CheckCircle2 className="w-4 h-4" />,
        colorEvento: 'bg-emerald-50 border border-emerald-200',
        colorTextoEvento: 'text-emerald-700'
      };
    }

    if (servicio.validation_start_timestamp && !servicio.validation_end_timestamp) {
      return {
        estado: 'en_curso',
        color: 'bg-blue-50',
        colorTexto: 'text-blue-700',
        icono: <Clock className="w-4 h-4" />,
        colorEvento: 'bg-blue-50 border border-blue-200',
        colorTextoEvento: 'text-blue-700'
      };
    }

    return {
      estado: 'pendiente',
      color: 'bg-amber-50',
      colorTexto: 'text-amber-700',
      icono: <AlertCircle className="w-4 h-4" />,
      colorEvento: 'bg-amber-50 border border-amber-200',
      colorTextoEvento: 'text-amber-700'
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

  const renderListaServicios = () => {
    if (serviciosOrdenados.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay servicios para esta fecha</p>
        </div>
      );
    }

    if (modoVisualizacion === 'lista') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {serviciosOrdenados.map(servicio => {
              const estado = obtenerEstadoServicio(servicio);
              const puedeIniciar = puedeIniciarServicio(servicio);
              const esEnCurso = estado.estado === 'en_curso';
              const yaHizoCheckInLista = !!servicio.check_in_timestamp || serviciosConCheckIn.has(servicio.id);

              const handleIniciar = () => {
                if (!puedeIniciar || !yaHizoCheckInLista) return;
                setServicioConfirmacion(servicio);
              };

              const getEstadoIndicator = () => {
                if (estado.estado === 'completado') return { stripe: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
                if (estado.estado === 'en_curso') return { stripe: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border border-blue-200' };
                if (estado.estado === 'pendiente') return { stripe: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border border-amber-200' };
                return { stripe: 'bg-gray-300', badge: 'bg-gray-50 text-gray-500 border border-gray-200' };
              };
              const statusStyles = getEstadoIndicator();

              return (
                <div 
                  key={servicio.id} 
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-1.5 h-8 rounded-full ${statusStyles.stripe}`} />
                  
                  <div className="w-14 text-sm font-medium text-gray-900">
                    {servicio.scheduled_start_time ? formatearHora(servicio.scheduled_start_time) : '--:--'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate block">
                      {servicio.appointment_name || 'Sin AP'}
                    </span>
                  </div>

                  <div className="w-40 text-sm text-gray-600 truncate hidden sm:block">
                    {servicio.client_name || '-'}
                  </div>

                  <div className="w-24 text-right flex items-center justify-end gap-2">
                    {esEnCurso ? (
                      <button
                        onClick={() => onSeleccionarServicio(servicio)}
                        className="px-3 py-1 bg-[#0F1C3F] text-white text-xs font-medium rounded-md hover:bg-[#1A2B52] transition-colors border border-[#0F1C3F]"
                      >
                        Reanudar
                      </button>
                    ) : puedeIniciar && estado.estado === 'pendiente' && yaHizoCheckInLista ? (
                      <button
                        onClick={handleIniciar}
                        className="px-3 py-1 bg-[#0F1C3F] text-white text-xs font-medium rounded-md hover:bg-[#1A2B52] transition-colors border border-[#0F1C3F]"
                      >
                        Iniciar
                      </button>
                    ) : puedeIniciar && estado.estado === 'pendiente' && !yaHizoCheckInLista ? (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                        Check-In
                      </span>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-md ${statusStyles.badge}`}>
                        {estado.estado === 'completado' ? 'Completado' :
                         estado.estado === 'pendiente' ? 'Pendiente' :
                         estado.estado === 'en_curso' ? 'En curso' :
                         'Futuro'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {serviciosOrdenados.map(servicio => (
          <TarjetaServicio
            key={servicio.id}
            servicio={servicio}
            estado={obtenerEstadoServicio(servicio)}
            puedeIniciar={puedeIniciarServicio(servicio)}
            onSeleccionar={onSeleccionarServicio}
            onIniciarServicio={setServicioConfirmacion}
            onCheckIn={setServicioCheckIn}
            checkInRealizado={serviciosConCheckIn.has(servicio.id)}
          />
        ))}
      </div>
    );
  };

  const renderVistaCalendario = () => {
    if (vistaActual === 'dia') {
      return renderListaServicios();
    } else if (vistaActual === 'semana') {
      return (
        <div className="space-y-6">
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
          {renderListaServicios()}
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
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
          {renderListaServicios()}
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => cambiarFecha('anterior')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <span className="text-base font-medium text-gray-800 capitalize min-w-[180px] text-center">
            {formatearRangoFecha()}
          </span>
          <button
            onClick={() => cambiarFecha('siguiente')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={irHoy}
            className="ml-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hoy
          </button>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setVistaActual('dia')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              vistaActual === 'dia'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Día
          </button>
          <button
            onClick={() => setVistaActual('semana')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              vistaActual === 'semana'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setVistaActual('mes')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              vistaActual === 'mes'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {[
            { key: 'todos', label: 'Todos', count: resumen.total },
            { key: 'pendiente', label: 'Pendientes', count: resumen.pendientes },
            { key: 'en_curso', label: 'En curso', count: resumen.enCurso },
            { key: 'completado', label: 'Completados', count: resumen.completados }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key as FiltroEstado)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                filtroEstado === f.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filtroEstado === f.key ? 'bg-gray-100 text-gray-700' : 'bg-gray-200/50 text-gray-500'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setModoVisualizacion('lista')}
            className={`p-2 rounded-md transition-colors ${
              modoVisualizacion === 'lista'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Vista compacta"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setModoVisualizacion('tarjeta')}
            className={`p-2 rounded-md transition-colors ${
              modoVisualizacion === 'tarjeta'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Vista detallada"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        {renderVistaCalendario()}
      </div>

      <ConfirmModal
        isOpen={!!servicioConfirmacion}
        onClose={() => setServicioConfirmacion(null)}
        onConfirm={() => {
          if (servicioConfirmacion) {
            onSeleccionarServicio(servicioConfirmacion);
            setServicioConfirmacion(null);
          }
        }}
        title="Iniciar servicio"
        message={servicioConfirmacion ? `¿Estás seguro de que deseas iniciar el servicio?\n\nCita: ${servicioConfirmacion.appointment_name || 'Sin número'}\nCliente: ${servicioConfirmacion.client_name || 'No especificado'}` : ''}
        confirmText="Iniciar"
        cancelText="Cancelar"
        variant="confirm"
      />

      {servicioCheckIn && (
        <CheckInModal
          isOpen={!!servicioCheckIn}
          onClose={() => setServicioCheckIn(null)}
          servicio={servicioCheckIn}
          onCheckInSuccess={handleCheckInSuccess}
        />
      )}
    </div>
  );
}

function TarjetaServicio({
  servicio,
  estado,
  puedeIniciar,
  onSeleccionar,
  onIniciarServicio,
  onCheckIn,
  checkInRealizado = false
}: {
  servicio: ExpedienteServicio;
  estado: EstadoServicio;
  puedeIniciar: boolean;
  onSeleccionar: (servicio: ExpedienteServicio) => void;
  onIniciarServicio: (servicio: ExpedienteServicio) => void;
  onCheckIn: (servicio: ExpedienteServicio) => void;
  checkInRealizado?: boolean;
}) {
  const handleIniciarServicio = () => {
    if (!puedeIniciar) return;
    onIniciarServicio(servicio);
  };

  const esEnCurso = estado.estado === 'en_curso';
  const yaHizoCheckIn = !!servicio.check_in_timestamp || checkInRealizado;
  const puedeHacerCheckIn = puedeIniciar && estado.estado === 'pendiente' && !yaHizoCheckIn;

  const getStatusIndicator = () => {
    if (estado.estado === 'completado') return { 
      stripe: 'bg-emerald-400', 
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      label: 'Completado' 
    };
    if (estado.estado === 'en_curso') return { 
      stripe: 'bg-blue-500', 
      badge: 'bg-blue-50 text-blue-700 border border-blue-200',
      label: 'En curso' 
    };
    if (estado.estado === 'pendiente') return { 
      stripe: 'bg-amber-400', 
      badge: 'bg-amber-50 text-amber-700 border border-amber-200',
      label: 'Pendiente' 
    };
    return { 
      stripe: 'bg-gray-300', 
      badge: 'bg-gray-50 text-gray-500 border border-gray-200',
      label: 'Futuro' 
    };
  };

  const statusInfo = getStatusIndicator();

  const formatearFechaCompleta = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const vehiculoDisplay = servicio.asset_marca && servicio.asset_submarca 
    ? `${servicio.asset_marca} ${servicio.asset_submarca}` 
    : servicio.asset_name || 'No especificado';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all">
      <div className="flex">
        <div className={`w-1 ${statusInfo.stripe}`} />
        
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {servicio.appointment_name || 'Sin número de cita'}
                </h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${statusInfo.badge}`}>
                  {statusInfo.label}
                </span>
                {servicio.is_test_service && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-md">
                    Test
                  </span>
                )}
              </div>
              
              {servicio.work_order_name && (
                <p className="text-xs text-gray-400 font-mono">
                  WO: {servicio.work_order_name}
                </p>
              )}
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
              {esEnCurso && (
                <button
                  onClick={() => onSeleccionar(servicio)}
                  className="px-4 py-2 bg-[#0F1C3F] text-white text-sm font-medium rounded-lg hover:bg-[#1A2B52] transition-colors border border-[#0F1C3F]"
                >
                  Reanudar
                </button>
              )}
              {puedeHacerCheckIn && (
                <button
                  onClick={() => onCheckIn(servicio)}
                  className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                  title="Confirmar llegada al punto de servicio"
                >
                  <Navigation className="w-4 h-4" />
                  Check-In
                </button>
              )}
              {yaHizoCheckIn && estado.estado === 'pendiente' && (
                <span className="px-3 py-2 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Llegada confirmada
                </span>
              )}
              {puedeIniciar && !esEnCurso && estado.estado === 'pendiente' && yaHizoCheckIn && (
                <button
                  onClick={handleIniciarServicio}
                  className="px-4 py-2 bg-[#0F1C3F] text-white text-sm font-medium rounded-lg hover:bg-[#1A2B52] transition-colors border border-[#0F1C3F]"
                >
                  Iniciar servicio
                </button>
              )}
              {puedeIniciar && !esEnCurso && estado.estado === 'pendiente' && !yaHizoCheckIn && (
                <span className="px-3 py-2 bg-gray-100 text-gray-500 text-sm rounded-lg">
                  Requiere Check-In
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Fecha y hora</p>
                <p className="text-sm text-gray-700">
                  {servicio.scheduled_start_time 
                    ? formatearFechaCompleta(servicio.scheduled_start_time) 
                    : 'No programado'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
                <p className="text-sm text-gray-700 truncate">
                  {servicio.client_name || 'No especificado'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Car className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Vehículo</p>
                <p className="text-sm text-gray-700 truncate">{vehiculoDisplay}</p>
                {servicio.asset_placas && (
                  <p className="text-xs text-gray-500 font-mono">{servicio.asset_placas}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Wrench className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Tipo de servicio</p>
                <p className="text-sm text-gray-700 truncate">
                  {servicio.service_type || 'Instalación'}
                </p>
              </div>
            </div>
          </div>

          {servicio.installation_details && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Detalles de instalación</p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {servicio.installation_details}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Ubicación</p>
                <p className="text-sm text-gray-700 truncate">
                  {servicio.service_city || 'No especificada'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Empresa</p>
                <p className="text-sm text-gray-700 truncate">
                  {servicio.company_name || 'No especificada'}
                </p>
              </div>
            </div>

            {servicio.device_esn && (
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 flex items-center justify-center text-gray-400 mt-0.5 flex-shrink-0">
                  <span className="text-xs font-mono">#</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">ESN</p>
                  <p className="text-sm text-gray-700 font-mono truncate">{servicio.device_esn}</p>
                </div>
              </div>
            )}

            {servicio.prefolio_realizado && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600">Prefolio</span>
                </div>
              </div>
            )}
          </div>

          {estado.estado === 'bloqueado' && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Este servicio solo puede iniciarse el día programado
              </p>
            </div>
          )}
        </div>
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
