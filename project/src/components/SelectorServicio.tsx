import { useState, useEffect } from 'react';
import { ChevronDown, Loader2, Mail, Search } from 'lucide-react';
import { ExpedienteServicio } from '../types';
import { obtenerServiciosPorEmailTecnico, buscarServicioPorAppointmentName } from '../services/expedienteService';

interface SelectorServicioProps {
  emailTecnico: string;
  onEmailTecnicoChange: (value: string) => void;
  onExpedienteSelect: (expediente: ExpedienteServicio) => void;
  onRefreshRef?: (refreshFn: () => void) => void;
}

export function SelectorServicio({
  emailTecnico,
  onEmailTecnicoChange,
  onExpedienteSelect,
  onRefreshRef
}: SelectorServicioProps) {
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ExpedienteServicio[]>([]);
  const [servicioSeleccionadoId, setServicioSeleccionadoId] = useState<number | null>(null);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [searchAP, setSearchAP] = useState('');
  const [buscandoAP, setBuscandoAP] = useState(false);
  const [apNoEncontrado, setApNoEncontrado] = useState(false);

  useEffect(() => {
    if (emailTecnico && emailTecnico.includes('@')) {
      cargarServicios();
    } else {
      setServiciosDisponibles([]);
      setServicioSeleccionadoId(null);
    }
  }, [emailTecnico]);

  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef(cargarServicios);
    }
  }, [onRefreshRef]);

  const cargarServicios = async () => {
    setCargandoServicios(true);
    const servicios = await obtenerServiciosPorEmailTecnico(emailTecnico);
    setServiciosDisponibles(servicios);
    setCargandoServicios(false);
  };

  const handleServicioChange = (servicioId: string) => {
    const id = parseInt(servicioId);
    setServicioSeleccionadoId(id);
    const expediente = serviciosDisponibles.find(s => s.id === id);
    if (expediente) {
      onExpedienteSelect(expediente);
    }
  };

  const formatearFechaHora = (fechaISO: string | null) => {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  };

  const obtenerEstadoTexto = (validationStatus: string | null) => {
    if (!validationStatus) return '[Pendiente]';
    if (validationStatus === 'COMPLETADO') return '[✓ Completado]';
    if (validationStatus === 'PRUEBAS EN CURSO') return '[⚙️ En proceso]';
    return '[Pendiente]';
  };

  const handleBuscarAP = async () => {
    if (!searchAP.trim() || !emailTecnico) return;

    setBuscandoAP(true);
    setApNoEncontrado(false);

    const resultado = await buscarServicioPorAppointmentName(searchAP.trim(), emailTecnico);

    if (resultado) {
      setServicioSeleccionadoId(resultado.id);
      onExpedienteSelect(resultado);
      setSearchAP('');
    } else {
      setApNoEncontrado(true);
      setTimeout(() => setApNoEncontrado(false), 3000);
    }

    setBuscandoAP(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Selecciona servicio</h2>

      <div className="space-y-4">
        {emailTecnico && emailTecnico.includes('@') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Servicio
            </label>
            <div className="relative">
              {cargandoServicios ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Cargando servicios...</span>
                </div>
              ) : serviciosDisponibles.length > 0 ? (
                <>
                  <select
                    value={servicioSeleccionadoId || ''}
                    onChange={(e) => handleServicioChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecciona un servicio</option>
                    {serviciosDisponibles.map(servicio => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.is_test_service ? '🧪 PRUEBAS | ' : ''}{servicio.appointment_name} - {servicio.work_order_name} | {formatearFechaHora(servicio.scheduled_start_time)} {obtenerEstadoTexto(servicio.validation_final_status)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    No se encontraron servicios programados para hoy con este correo electrónico
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {emailTecnico && emailTecnico.includes('@') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar por Appointment Name (AP)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchAP}
                  onChange={(e) => setSearchAP(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBuscarAP()}
                  placeholder="Ingresa el número de AP"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleBuscarAP}
                disabled={!searchAP.trim() || buscandoAP}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {buscandoAP ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Buscar
                  </>
                )}
              </button>
            </div>
            {apNoEncontrado && (
              <p className="text-sm text-red-600 mt-2">
                No se encontró ningún servicio con ese AP asignado a tu correo
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
