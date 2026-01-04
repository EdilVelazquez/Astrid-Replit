import { useState, useCallback } from 'react';
import { Coordinates } from '../utils/haversine';

export type GPSStatus = 'idle' | 'requesting' | 'success' | 'error' | 'denied';

interface GeolocationState {
  location: Coordinates | null;
  status: GPSStatus;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    status: 'idle',
    error: null,
  });

  const getCurrentLocation = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setState({
          location: null,
          status: 'error',
          error: 'Geolocalización no soportada en este navegador',
        });
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      setState(prev => ({ ...prev, status: 'requesting', error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setState({
            location: coords,
            status: 'success',
            error: null,
          });
          resolve(coords);
        },
        (error) => {
          let errorMessage = 'Error al obtener ubicación';
          let status: GPSStatus = 'error';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permiso de ubicación denegado. Activa el GPS y permite el acceso a tu ubicación.';
              status = 'denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible. Verifica que el GPS esté activado.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado. Intenta de nuevo.';
              break;
          }

          setState({
            location: null,
            status,
            error: errorMessage,
          });
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const resetState = useCallback(() => {
    setState({
      location: null,
      status: 'idle',
      error: null,
    });
  }, []);

  return {
    ...state,
    getCurrentLocation,
    resetState,
  };
}
