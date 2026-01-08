import { useState, useCallback, useRef } from 'react';
import { Coordinates } from '../utils/haversine';

export type GPSStatus = 'idle' | 'requesting' | 'success' | 'error' | 'denied' | 'low_accuracy';

export interface ExtendedCoordinates extends Coordinates {
  accuracy: number;
  timestamp: number;
  altitudeAccuracy: number | null;
  method: 'gps' | 'wifi' | 'cell' | 'ip' | 'unknown';
}

interface GeolocationState {
  location: ExtendedCoordinates | null;
  status: GPSStatus;
  error: string | null;
  attempts: number;
}

const MAX_ACCEPTABLE_ACCURACY = 100;
const GOOD_ACCURACY_THRESHOLD = 50;
const MAX_ATTEMPTS = 5;
const WATCH_TIMEOUT = 30000;
const SINGLE_TIMEOUT = 15000;

function estimateLocationMethod(accuracy: number): ExtendedCoordinates['method'] {
  if (accuracy <= 10) return 'gps';
  if (accuracy <= 50) return 'wifi';
  if (accuracy <= 500) return 'cell';
  if (accuracy > 1000) return 'ip';
  return 'unknown';
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    status: 'idle',
    error: null,
    attempts: 0,
  });
  
  const watchIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestPositionRef = useRef<ExtendedCoordinates | null>(null);
  const attemptCountRef = useRef<number>(0);

  const clearWatcher = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      console.log('📍 [GPS] Watcher detenido');
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const getCurrentLocation = useCallback((): Promise<ExtendedCoordinates> => {
    return new Promise((resolve, reject) => {
      console.log('═══════════════════════════════════════════');
      console.log('📍 [GPS] INICIANDO OBTENCIÓN DE UBICACIÓN');
      console.log('═══════════════════════════════════════════');
      console.log('📍 [GPS] Protocolo:', window.location.protocol);
      console.log('📍 [GPS] Navegador soporta geolocation:', !!navigator.geolocation);
      console.log('📍 [GPS] Configuración:');
      console.log('   - Precisión máxima aceptable:', MAX_ACCEPTABLE_ACCURACY, 'm');
      console.log('   - Precisión buena:', GOOD_ACCURACY_THRESHOLD, 'm');
      console.log('   - Máximo intentos:', MAX_ATTEMPTS);
      console.log('   - Timeout total:', WATCH_TIMEOUT, 'ms');

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.error('📍 [GPS] ERROR: Requiere HTTPS para geolocalización');
      }

      if (!navigator.geolocation) {
        const error = 'Geolocalización no soportada en este navegador';
        console.error('📍 [GPS] ERROR:', error);
        setState({
          location: null,
          status: 'error',
          error,
          attempts: 0,
        });
        reject(new Error(error));
        return;
      }

      setState(prev => ({ ...prev, status: 'requesting', error: null, attempts: 0 }));
      bestPositionRef.current = null;
      attemptCountRef.current = 0;

      const finishWithBestPosition = (reason: string) => {
        clearWatcher();
        
        if (bestPositionRef.current) {
          const pos = bestPositionRef.current;
          console.log('═══════════════════════════════════════════');
          console.log('📍 [GPS] UBICACIÓN FINAL SELECCIONADA');
          console.log('   - Razón:', reason);
          console.log('   - Latitud:', pos.latitude);
          console.log('   - Longitud:', pos.longitude);
          console.log('   - Precisión:', pos.accuracy, 'm');
          console.log('   - Método estimado:', pos.method);
          console.log('   - Intentos realizados:', attemptCountRef.current);
          console.log('   - Timestamp:', new Date(pos.timestamp).toISOString());
          console.log('═══════════════════════════════════════════');

          if (pos.accuracy > MAX_ACCEPTABLE_ACCURACY) {
            console.warn('📍 [GPS] ⚠️ ADVERTENCIA: Precisión por encima del umbral máximo');
            setState({
              location: pos,
              status: 'low_accuracy',
              error: `Precisión baja: ${Math.round(pos.accuracy)}m. La ubicación puede no ser exacta.`,
              attempts: attemptCountRef.current,
            });
          } else {
            setState({
              location: pos,
              status: 'success',
              error: null,
              attempts: attemptCountRef.current,
            });
          }
          resolve(pos);
        } else {
          const errorMsg = 'No se pudo obtener ninguna lectura de ubicación';
          console.error('📍 [GPS] ERROR:', errorMsg);
          setState({
            location: null,
            status: 'error',
            error: errorMsg,
            attempts: attemptCountRef.current,
          });
          reject(new Error(errorMsg));
        }
      };

      const handlePosition = (position: GeolocationPosition) => {
        attemptCountRef.current++;
        const attempt = attemptCountRef.current;
        
        const coords: ExtendedCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          method: estimateLocationMethod(position.coords.accuracy),
        };

        console.log(`📍 [GPS] Lectura #${attempt}:`);
        console.log(`   - Lat: ${coords.latitude.toFixed(7)}`);
        console.log(`   - Lng: ${coords.longitude.toFixed(7)}`);
        console.log(`   - Precisión: ${coords.accuracy.toFixed(1)}m`);
        console.log(`   - Método: ${coords.method}`);
        console.log(`   - Alt. Accuracy: ${coords.altitudeAccuracy ?? 'N/A'}`);
        console.log(`   - Timestamp: ${new Date(coords.timestamp).toISOString()}`);

        const isBetter = !bestPositionRef.current || coords.accuracy < bestPositionRef.current.accuracy;
        
        if (isBetter) {
          console.log(`📍 [GPS] ✓ Nueva mejor posición (mejora de ${bestPositionRef.current ? (bestPositionRef.current.accuracy - coords.accuracy).toFixed(1) : 'N/A'}m)`);
          bestPositionRef.current = coords;
          setState(prev => ({ ...prev, attempts: attempt }));
        } else {
          console.log(`📍 [GPS] ✗ Descartada (precisión peor que la actual: ${bestPositionRef.current?.accuracy.toFixed(1)}m)`);
        }

        if (coords.accuracy <= GOOD_ACCURACY_THRESHOLD) {
          console.log('📍 [GPS] ★ Precisión excelente alcanzada, finalizando');
          finishWithBestPosition('Precisión excelente alcanzada');
          return;
        }

        if (attempt >= MAX_ATTEMPTS) {
          console.log('📍 [GPS] Máximo de intentos alcanzado');
          finishWithBestPosition('Máximo de intentos alcanzado');
          return;
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        console.error('📍 [GPS] Error en lectura:');
        console.error(`   - Código: ${error.code}`);
        console.error(`   - Mensaje: ${error.message}`);
        
        let errorMessage = 'Error al obtener ubicación';
        let status: GPSStatus = 'error';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Debes permitir el acceso a tu ubicación en la configuración del navegador.';
            status = 'denied';
            console.error('📍 [GPS] PERMISO DENEGADO - El usuario debe:');
            console.error('   1. Hacer clic en el ícono de candado/ubicación en la barra de direcciones');
            console.error('   2. Permitir acceso a ubicación');
            console.error('   3. Recargar la página');
            clearWatcher();
            setState({ location: null, status, error: errorMessage, attempts: attemptCountRef.current });
            reject(new Error(errorMessage));
            return;
            
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible. Verifica que el GPS esté activado en tu dispositivo.';
            console.error('📍 [GPS] POSICIÓN NO DISPONIBLE');
            if (bestPositionRef.current) {
              console.log('📍 [GPS] Usando mejor posición disponible');
              finishWithBestPosition('Posición no disponible, usando mejor lectura');
              return;
            }
            break;
            
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado obteniendo ubicación.';
            console.error('📍 [GPS] TIMEOUT');
            if (bestPositionRef.current) {
              console.log('📍 [GPS] Usando mejor posición disponible');
              finishWithBestPosition('Timeout, usando mejor lectura');
              return;
            }
            break;
        }

        if (!bestPositionRef.current) {
          clearWatcher();
          setState({ location: null, status, error: errorMessage, attempts: attemptCountRef.current });
          reject(new Error(errorMessage));
        }
      };

      console.log('📍 [GPS] Iniciando watchPosition con alta precisión...');
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: SINGLE_TIMEOUT,
          maximumAge: 0,
        }
      );

      console.log('📍 [GPS] Watcher ID:', watchIdRef.current);

      timeoutIdRef.current = setTimeout(() => {
        console.log('📍 [GPS] Timeout global alcanzado (' + WATCH_TIMEOUT + 'ms)');
        
        if (bestPositionRef.current) {
          finishWithBestPosition('Timeout global, usando mejor lectura disponible');
        } else {
          console.log('📍 [GPS] Sin lecturas, intentando getCurrentPosition como fallback...');
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords: ExtendedCoordinates = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                method: estimateLocationMethod(position.coords.accuracy),
              };
              console.log('📍 [GPS] Fallback getCurrentPosition exitoso:', coords);
              bestPositionRef.current = coords;
              finishWithBestPosition('Fallback getCurrentPosition');
            },
            (error) => {
              console.error('📍 [GPS] Fallback getCurrentPosition falló:', error.message);
              clearWatcher();
              setState({
                location: null,
                status: 'error',
                error: 'No se pudo obtener la ubicación. Verifica que el GPS esté activado y hayas dado permiso.',
                attempts: attemptCountRef.current,
              });
              reject(new Error('No se pudo obtener ubicación'));
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        }
      }, WATCH_TIMEOUT);
    });
  }, [clearWatcher]);

  const resetState = useCallback(() => {
    clearWatcher();
    bestPositionRef.current = null;
    attemptCountRef.current = 0;
    setState({
      location: null,
      status: 'idle',
      error: null,
      attempts: 0,
    });
  }, [clearWatcher]);

  return {
    ...state,
    getCurrentLocation,
    resetState,
  };
}
