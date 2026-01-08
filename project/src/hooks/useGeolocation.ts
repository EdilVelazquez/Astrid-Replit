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
      
      console.log('📍 [GPS] Solicitando ubicación con alta precisión...');

      const handleSuccess = (position: GeolocationPosition) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        console.log('📍 [GPS] Ubicación obtenida:', coords, 'Precisión:', position.coords.accuracy, 'm');
        setState({
          location: coords,
          status: 'success',
          error: null,
        });
        resolve(coords);
      };

      const handleError = (error: GeolocationPositionError, isRetry = false) => {
        console.error('📍 [GPS] Error:', error.code, error.message, isRetry ? '(reintento)' : '');
        
        if (!isRetry && error.code === error.TIMEOUT) {
          console.log('📍 [GPS] Timeout con alta precisión, intentando sin alta precisión...');
          navigator.geolocation.getCurrentPosition(
            handleSuccess,
            (retryError) => handleError(retryError, true),
            {
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: 30000,
            }
          );
          return;
        }

        let errorMessage = 'Error al obtener ubicación';
        let status: GPSStatus = 'error';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Verifica que hayas permitido el acceso a tu ubicación en el navegador.';
            status = 'denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible. Verifica que el GPS esté activado en tu dispositivo.';
            break;
          case error.TIMEOUT:
            errorMessage = 'No se pudo obtener la ubicación a tiempo. Verifica tu conexión y que el GPS esté activado.';
            break;
        }

        setState({
          location: null,
          status,
          error: errorMessage,
        });
        reject(new Error(errorMessage));
      };

      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (error) => handleError(error, false),
        {
          enableHighAccuracy: true,
          timeout: 20000,
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
