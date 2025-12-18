import { MapPin, Calendar, User, Building, Truck, Server } from 'lucide-react';
import { ExpedienteServicio } from '../types';
import { traducirPruebasDesdeInstallationDetails, formatearFecha } from '../utils';

interface DetallesServicioProps {
  expediente: ExpedienteServicio;
}

export function DetallesServicio({ expediente }: DetallesServicioProps) {
  const pruebasRequeridas = traducirPruebasDesdeInstallationDetails(
    expediente.installation_details || ''
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Información del servicio</h2>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-600 font-medium mb-1">AP ACTIVO</p>
        <p className="text-base font-bold text-blue-900">{expediente.appointment_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Tipo de servicio</p>
            <p className="text-sm font-medium text-gray-800">{expediente.service_type}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Unidad</p>
            <p className="text-sm font-medium text-gray-800">{expediente.asset_name}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">VIN</p>
            <p className="text-sm font-medium text-gray-800 font-mono">
              {expediente.vehicle_vin || expediente.asset_vin || 'Pendiente de captura'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Color del vehículo</p>
            <p className="text-sm font-medium text-gray-800">{expediente.asset_color || 'No especificado'}</p>
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
          </div>
        </div>

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
              {expediente.scheduled_start_time && formatearFecha(expediente.scheduled_start_time)} - {expediente.scheduled_end_time && formatearFecha(expediente.scheduled_end_time).split(' ')[1]}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Pruebas requeridas</p>
        <div className="flex flex-wrap gap-2">
          {pruebasRequeridas.map(prueba => (
            <span
              key={prueba}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
            >
              {prueba}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
