import { useState } from 'react';
import { Navigation, CheckCircle, XCircle, Loader2, X, AlertTriangle } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { isWithinGeofence, Coordinates } from '../utils/haversine';
import { ExpedienteServicio, CheckInAttempt } from '../types';
import { supabase } from '../supabaseClient';
import { MapView } from './MapView';

const GEOFENCE_RADIUS = 200;

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicio: ExpedienteServicio;
  onCheckInSuccess: (servicio: ExpedienteServicio) => void;
}

type CheckInState = 'idle' | 'requesting' | 'success' | 'denied' | 'error' | 'no_coords';

export function CheckInModal({ isOpen, onClose, servicio, onCheckInSuccess }: CheckInModalProps) {
  const { getCurrentLocation, status: gpsStatus, error: gpsError, resetState } = useGeolocation();
  const [checkInState, setCheckInState] = useState<CheckInState>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  if (!isOpen) return null;

  const servicePoint: Coordinates | null = 
    servicio.service_latitude && servicio.service_longitude
      ? { latitude: servicio.service_latitude, longitude: servicio.service_longitude }
      : null;

  const saveCheckInAttempt = async (
    appointmentName: string,
    latitude: number,
    longitude: number,
    distanceMeters: number,
    wasSuccessful: boolean
  ): Promise<boolean> => {
    const attempt: Omit<CheckInAttempt, 'id' | 'attempt_timestamp'> = {
      appointment_name: appointmentName,
      latitude,
      longitude,
      distance_meters: distanceMeters,
      was_successful: wasSuccessful,
      geofence_radius: GEOFENCE_RADIUS
    };

    const { error } = await supabase
      .from('check_in_attempts')
      .insert(attempt);

    if (error) {
      console.error('Error saving check-in attempt:', error);
      return false;
    }
    return true;
  };

  const isTestService = servicio.appointment_name?.startsWith('AP-TEST') || 
                         servicio.is_test_service === true;

  const handleCheckIn = async () => {
    if (!servicePoint && !isTestService) {
      setCheckInState('no_coords');
      return;
    }

    if (!servicio.appointment_name) {
      console.error('No appointment_name available');
      setCheckInState('error');
      return;
    }

    setCheckInState('requesting');
    
    try {
      let location: Coordinates;
      let result: { isWithin: boolean; distance: number };

      if (isTestService) {
        console.log('🧪 [CHECK-IN] Servicio de prueba detectado - bypass de geocerca');
        if (servicePoint) {
          location = servicePoint;
          result = { isWithin: true, distance: 0 };
        } else {
          location = { latitude: 19.4326, longitude: -99.1332 };
          result = { isWithin: true, distance: 0 };
          console.log('⚠️ [CHECK-IN] Usando coordenadas por defecto (CDMX) - servicio sin coordenadas');
        }
        setUserLocation(location);
        setDistance(0);
      } else {
        location = await getCurrentLocation();
        setUserLocation(location);
        result = isWithinGeofence(location, servicePoint!, GEOFENCE_RADIUS);
        setDistance(result.distance);
      }

      await saveCheckInAttempt(
        servicio.appointment_name,
        location.latitude,
        location.longitude,
        result.distance,
        result.isWithin
      );

      if (result.isWithin) {
        setSaving(true);
        
        const { error } = await supabase
          .from('expedientes_servicio')
          .update({
            check_in_timestamp: new Date().toISOString(),
            check_in_latitude: location.latitude,
            check_in_longitude: location.longitude,
            check_in_distance: result.distance
          })
          .eq('id', servicio.id);

        if (error) {
          console.error('Error saving check-in:', error);
          setCheckInState('error');
          setSaving(false);
          return;
        }

        setSaving(false);
        setCheckInState('success');
        
        const updatedServicio = {
          ...servicio,
          check_in_timestamp: new Date().toISOString(),
          check_in_latitude: location.latitude,
          check_in_longitude: location.longitude,
          check_in_distance: result.distance
        };
        
        setTimeout(() => {
          onCheckInSuccess(updatedServicio);
          handleClose();
        }, 2000);
      } else {
        setCheckInState('denied');
      }
    } catch (err) {
      console.error('Error getting location:', err);
      setCheckInState('error');
    }
  };

  const handleClose = () => {
    setCheckInState('idle');
    setDistance(null);
    setUserLocation(null);
    resetState();
    onClose();
  };

  const handleRetry = () => {
    setCheckInState('idle');
    setDistance(null);
    setUserLocation(null);
    resetState();
  };

  const renderContent = () => {
    if (checkInState === 'no_coords') {
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sin coordenadas de servicio
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Este servicio no tiene registradas las coordenadas del punto de servicio.
            Contacta al administrador para actualizar la información.
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      );
    }

    if (checkInState === 'requesting' || gpsStatus === 'requesting' || saving) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {saving ? 'Guardando check-in...' : 'Obteniendo tu ubicación...'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Asegúrate de tener el GPS activado
          </p>
        </div>
      );
    }

    if (checkInState === 'success') {
      return (
        <div className="py-4">
          <div className="text-center mb-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-1">
              Check-In Exitoso
            </h3>
            <p className="text-green-600 text-sm">
              Tu llegada ha sido registrada correctamente.
            </p>
          </div>
          {servicePoint && userLocation && (
            <div className="mb-4">
              <MapView 
                servicePoint={servicePoint} 
                userLocation={userLocation}
                distance={distance}
              />
            </div>
          )}
        </div>
      );
    }

    if (checkInState === 'denied') {
      return (
        <div className="py-4">
          <div className="text-center mb-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-red-800 mb-1">
              Check-In Denegado
            </h3>
            <p className="text-gray-500 text-sm">
              Acércate más al punto de servicio para hacer check-in.
            </p>
          </div>
          {servicePoint && userLocation && (
            <div className="mb-4">
              <MapView 
                servicePoint={servicePoint} 
                userLocation={userLocation}
                distance={distance}
              />
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Intentar de nuevo
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      );
    }

    if (checkInState === 'error' || gpsStatus === 'error' || gpsStatus === 'denied') {
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error de ubicación
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {gpsError || 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado y que hayas permitido el acceso.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="py-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Confirmar llegada al servicio
          </h3>
          <p className="text-gray-600 text-sm">
            Se verificará tu ubicación respecto al punto de servicio.
          </p>
        </div>

        {servicePoint && (
          <>
            <div className="mb-4">
              <MapView 
                servicePoint={servicePoint} 
                userLocation={userLocation}
                distance={distance}
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Punto de servicio:</p>
              <p className="text-sm font-medium text-gray-800">
                {servicio.service_street || 'Dirección no especificada'}
              </p>
              {servicio.service_city && (
                <p className="text-xs text-gray-600">
                  {servicio.service_city}, {servicio.service_state}
                </p>
              )}
            </div>
          </>
        )}

        <button
          onClick={handleCheckIn}
          className="w-full py-3 bg-[#0F1C3F] text-white rounded-lg font-semibold hover:bg-[#1A2B52] transition-colors flex items-center justify-center gap-2"
        >
          <Navigation className="w-5 h-5" />
          Hacer Check-In
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Check-In</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
