import { useState, useEffect, useCallback, useRef } from 'react';
import { EstatusGralResponse, EstatusGralDevice } from '../types';
import { esFechaValidaVentana2h, convertirFechaAISO } from '../utils';
import {
  obtenerSesionPorExpediente,
  guardarOActualizarSesion,
  actualizarIntentosRealizados,
  actualizarEstadoPrueba
} from '../services/testSessionService';

interface UseDevicePassiveStatusParams {
  esn: string;
  esperandoComandoActivo: boolean;
  ignicionExitosa: boolean;
  botonExitoso: boolean;
  ubicacionExitosa: boolean;
  botonFechaPreguntada: string | null;
  ubicacionFechaPreguntada: string | null;
  pruebasRequeridas: string[];
  expedienteId: string;
  onErrorPanel?: (error: string) => void;
  onLogConsola?: (mensaje: string) => void;
}

interface PreguntaPendiente {
  tipo: 'boton' | 'ubicacion';
  fecha: string;
  fechaISO: string;
  ubicacionMapsUrl?: string;
  latitud?: string;
  longitud?: string;
}

interface PassiveStatusState {
  ultimoEstatus: EstatusGralDevice | null;
  consultando: boolean;
  error: string | null;
  preguntasPendientes: PreguntaPendiente[];
  consultasDetenidas: boolean;
  detencionManual: boolean;
}

interface UseDevicePassiveStatusResult extends PassiveStatusState {
  confirmarPreguntaPendiente: (tipo: 'boton' | 'ubicacion', confirmado: boolean) => void;
  forzarConsulta: () => void;
  detenerConsultasManual: () => void;
  reanudarConsultas: () => void;
  intentosRealizados: number;
}

export function useDevicePassiveStatus(
  params: UseDevicePassiveStatusParams
): UseDevicePassiveStatusResult {
  const {
    esn,
    esperandoComandoActivo,
    ignicionExitosa,
    botonExitoso,
    ubicacionExitosa,
    botonFechaPreguntada,
    ubicacionFechaPreguntada,
    pruebasRequeridas,
    expedienteId,
    onErrorPanel,
    onLogConsola,
  } = params;

  const [state, setState] = useState<PassiveStatusState>({
    ultimoEstatus: null,
    consultando: false,
    error: null,
    preguntasPendientes: [],
    consultasDetenidas: false,
    detencionManual: false,
  });

  const intervalRef = useRef<number | null>(null);
  const consultaEnProcesoRef = useRef(false);
  const consultasDetenidasPorCompletadoRef = useRef(false);
  const requestIdRef = useRef<string>('');
  const contadorRequestsRef = useRef<number>(0);
  const esnActivoRef = useRef<string>('');
  const pollingActivoRef = useRef<boolean>(false);
  const pollingCreationCountRef = useRef<number>(0);
  const pollingDestructionCountRef = useRef<number>(0);
  const intentosPollingRef = useRef<number>(0);
  const onLogConsolaRef = useRef(onLogConsola);
  const onErrorPanelRef = useRef(onErrorPanel);
  const procesarEstatusDispositivoRef = useRef<((estatus: EstatusGralDevice) => void) | null>(null);
  const expedienteIdRef = useRef<string>(expedienteId);
  const [intentosRealizados, setIntentosRealizados] = useState<number>(0);

  useEffect(() => {
    onLogConsolaRef.current = onLogConsola;
    onErrorPanelRef.current = onErrorPanel;
  });

  const requiereIgnicion = pruebasRequeridas.includes('Ignición');
  const requiereBoton = pruebasRequeridas.includes('Botón de pánico');
  const requiereUbicacion = true;

  const hayPruebasPendientes = () => {
    const ubicacionPendiente = !ubicacionExitosa;
    const ignicionPendiente = requiereIgnicion && !ignicionExitosa;
    const botonPendiente = requiereBoton && !botonExitoso;

    return ubicacionPendiente || ignicionPendiente || botonPendiente;
  };

  const consultarEstatusRef = useRef<() => Promise<void>>();

  consultarEstatusRef.current = async () => {
    const currentEsn = esnActivoRef.current;

    const todasPruebasCompletadas =
      (!requiereIgnicion || ignicionExitosa) &&
      (!requiereBoton || botonExitoso) &&
      (!requiereUbicacion || ubicacionExitosa);

    if (todasPruebasCompletadas) {
      if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`✅ Todas las pruebas ya están completadas, omitiendo consulta`);
      }
      return;
    }

    if (!currentEsn || consultaEnProcesoRef.current) {
      return;
    }

    consultaEnProcesoRef.current = true;
    requestIdRef.current = crypto.randomUUID().slice(0, 8);
    contadorRequestsRef.current += 1;
    intentosPollingRef.current += 1;

    setState((prev) => ({ ...prev, consultando: true, error: null }));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration. Please check environment variables.');
      }

      if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`[${requestIdRef.current}] Intento #${intentosPollingRef.current}/10 - Request #${contadorRequestsRef.current} - ESN: ${currentEsn}`);
      }

      let estatusData: EstatusGralResponse;

      // Modo de pruebas para ESN especial
      if (currentEsn === '000000000000000') {
        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`🧪 [PRUEBAS] Modo de pruebas activado - simulando respuesta del servidor`);
        }

        // Simular un pequeño delay para hacer más realista
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simular respuesta del servidor con datos de prueba
        const ahora = new Date();
        estatusData = {
          response: [
            {
              ESN: '000000000000000',
              fecha: ahora.toISOString(),
              inputs: {
                ignition: '1',
              },
              latitude: '19.432608',
              longitude: '-99.133209',
            }
          ]
        };

        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`🧪 [PRUEBAS] Datos simulados: ${JSON.stringify(estatusData, null, 2)}`);
        }
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(
          `${supabaseUrl}/functions/v1/estatusgral`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({ esn: currentEsn }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response) {
          throw new Error('No response received from server');
        }

        const data = await response.json().catch((err) => {
          console.error('Failed to parse JSON response:', err);
          return {};
        });

        if (!response.ok) {
          const errorDetails = JSON.stringify(data, null, 2);
          console.error('Error Edge Function:', data, 'Status:', response.status);
          if (onErrorPanelRef.current) {
            onErrorPanelRef.current(errorDetails);
          }
          if (onLogConsolaRef.current) {
            onLogConsolaRef.current(`[${requestIdRef.current}] Error en respuesta: Status ${response.status}`);
          }
          throw new Error('Error consultando estatus del dispositivo');
        }

        estatusData = data;
      }

      if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`[${requestIdRef.current}] Datos: ${estatusData.response?.length || 0} items`);
        onLogConsolaRef.current(`[${requestIdRef.current}] JSON Response: ${JSON.stringify(estatusData, null, 2)}`);
      }

      console.log(`[${requestIdRef.current}] Respuesta completa:`, estatusData);

      if (estatusData.response && Array.isArray(estatusData.response) && estatusData.response.length > 0) {
        const estatus = estatusData.response[0];

        if (!estatus) {
          if (onLogConsolaRef.current) {
            onLogConsolaRef.current(`Respuesta vacía del dispositivo`);
          }
          return;
        }

        setState((prev) => ({ ...prev, ultimoEstatus: estatus }));

        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`Procesando estatus del dispositivo`);
        }

        if (procesarEstatusDispositivoRef.current) {
          procesarEstatusDispositivoRef.current(estatus);
        } else if (procesarEstatusDispositivo) {
          procesarEstatusDispositivo(estatus);
        }

        await actualizarIntentosRealizados(expedienteIdRef.current, intentosPollingRef.current);
        setIntentosRealizados(intentosPollingRef.current);

        if (!hayPruebasPendientes()) {
          if (onLogConsolaRef.current) {
            onLogConsolaRef.current(`✅ Todas las pruebas relevantes completadas. Deteniendo polling.`);
          }
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            pollingActivoRef.current = false;
            pollingDestructionCountRef.current += 1;
            if (onLogConsolaRef.current) {
              onLogConsolaRef.current(`🔴 [POLLING DESTROYED #${pollingDestructionCountRef.current}] ESN: ${esnActivoRef.current} - Pruebas completadas`);
            }
          }
          setState((prev) => ({ ...prev, consultasDetenidas: true }));
          consultasDetenidasPorCompletadoRef.current = true;
        } else if (intentosPollingRef.current >= 10) {
          if (onLogConsolaRef.current) {
            onLogConsolaRef.current(`⚠️ Límite de 10 intentos alcanzado. Deteniendo polling.`);
          }
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            pollingActivoRef.current = false;
            pollingDestructionCountRef.current += 1;
            if (onLogConsolaRef.current) {
              onLogConsolaRef.current(`🔴 [POLLING DESTROYED #${pollingDestructionCountRef.current}] ESN: ${esnActivoRef.current} - Máximo intentos`);
            }
          }
          setState((prev) => ({ ...prev, consultasDetenidas: true }));
        }
      } else if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`No se encontraron datos en la respuesta`);
      }
    } catch (error) {
      const esAbortError = error instanceof Error && error.name === 'AbortError';
      console.error('Error consultando estatus:', error);
      if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`[${requestIdRef.current}] ❌ Error: ${esAbortError ? 'Timeout (30s)' : error instanceof Error ? error.message : 'Error desconocido'}`);
        onLogConsolaRef.current(`⏭️ Esperando siguiente ciclo de polling (no se reintenta inmediatamente)`);
      }
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    } finally {
      consultaEnProcesoRef.current = false;
      setState((prev) => ({ ...prev, consultando: false }));
    }
  };


  const esUbicacionValida = useCallback((latitud: string, longitud: string): boolean => {
    const lat = parseFloat(latitud);
    const lon = parseFloat(longitud);

    if (isNaN(lat) || isNaN(lon)) return false;
    if (Math.abs(lat) < 0.01 && Math.abs(lon) < 0.01) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;

    return true;
  }, []);

  const esFechaEpochInvalida = useCallback((fechaStr: string): boolean => {
    return fechaStr.includes('31/12/1969') || fechaStr.includes('01/01/1970');
  }, []);

  const procesarEstatusDispositivo = useCallback(
    async (estatus: EstatusGralDevice) => {
      const nuevasPreguntas: PreguntaPendiente[] = [];

      if (requiereIgnicion && !ignicionExitosa) {
        if (estatus.IGNICION === 1) {
          if (onLogConsola) {
            onLogConsola(`✓ Ignición detectada automáticamente (IGNICION=1)`);
          }
          await actualizarEstadoPrueba(
            params.expedienteId,
            'ignicion',
            true
          );
          window.dispatchEvent(
            new CustomEvent('passive-test-result', {
              detail: { tipo: 'ignicion', exitoso: true },
            })
          );
        }
      }

      if (
        requiereBoton &&
        !botonExitoso &&
        estatus.BOTON &&
        typeof estatus.BOTON === 'string'
      ) {
        const fechaISO = convertirFechaAISO(estatus.BOTON);

        const botonYaPendiente = state.preguntasPendientes.some(p => p.tipo === 'boton');

        if (
          fechaISO !== botonFechaPreguntada &&
          esFechaValidaVentana2h(estatus.BOTON) &&
          !esFechaEpochInvalida(estatus.BOTON) &&
          !botonYaPendiente
        ) {
          if (onLogConsola) {
            onLogConsola(`Botón de pánico detectado: ${estatus.BOTON}`);
          }
          await actualizarEstadoPrueba(
            params.expedienteId,
            'boton',
            false,
            fechaISO
          );
          nuevasPreguntas.push({
            tipo: 'boton',
            fecha: estatus.BOTON!,
            fechaISO,
          });
        } else if (botonYaPendiente && onLogConsola) {
          onLogConsola(`⌛ Botón de pánico ya detectado - Esperando confirmación del técnico`);
        }
      }

      if (
        requiereUbicacion &&
        !ubicacionExitosa &&
        estatus.FECHA_EVENTO &&
        typeof estatus.FECHA_EVENTO === 'string'
      ) {
        const fechaISO = convertirFechaAISO(estatus.FECHA_EVENTO);
        const ubicacionValida = esUbicacionValida(estatus.LATITUD, estatus.LONGITUD);
        const fechaValida = esFechaValidaVentana2h(estatus.FECHA_EVENTO) && !esFechaEpochInvalida(estatus.FECHA_EVENTO);

        const ubicacionYaPendiente = state.preguntasPendientes.some(p => p.tipo === 'ubicacion');

        if (
          ubicacionValida &&
          fechaValida &&
          fechaISO !== ubicacionFechaPreguntada &&
          !ubicacionYaPendiente
        ) {
          if (onLogConsola) {
            onLogConsola(`Ubicación detectada: ${estatus.LATITUD}, ${estatus.LONGITUD} - Fecha: ${estatus.FECHA_EVENTO}`);
          }
          await actualizarEstadoPrueba(
            params.expedienteId,
            'ubicacion',
            false,
            fechaISO,
            estatus.UBICACIONMAPS || undefined
          );
          nuevasPreguntas.push({
            tipo: 'ubicacion',
            fecha: estatus.FECHA_EVENTO!,
            fechaISO,
            ubicacionMapsUrl: estatus.UBICACIONMAPS,
            latitud: estatus.LATITUD,
            longitud: estatus.LONGITUD,
          });
        } else if (ubicacionYaPendiente && onLogConsola) {
          onLogConsola(`⌛ Ubicación ya detectada - Esperando confirmación del técnico`);
        } else if (onLogConsola && !ubicacionValida) {
          onLogConsola(`Ubicación inválida detectada: ${estatus.LATITUD}, ${estatus.LONGITUD}`);
        } else if (onLogConsola && !fechaValida) {
          onLogConsola(`Fecha de ubicación inválida o fuera de ventana: ${estatus.FECHA_EVENTO}`);
        }
      }

      if (nuevasPreguntas.length > 0) {
        setState((prev) => ({
          ...prev,
          preguntasPendientes: [...prev.preguntasPendientes, ...nuevasPreguntas],
        }));
      }
    },
    [
      state.preguntaPendiente,
      requiereIgnicion,
      requiereBoton,
      requiereUbicacion,
      ignicionExitosa,
      botonExitoso,
      ubicacionExitosa,
      botonFechaPreguntada,
      ubicacionFechaPreguntada,
      esUbicacionValida,
      esFechaEpochInvalida,
      onLogConsola,
    ]
  );

  useEffect(() => {
    procesarEstatusDispositivoRef.current = (estatus: EstatusGralDevice) => {
      procesarEstatusDispositivo(estatus).catch(err => {
        console.error('Error procesando estatus del dispositivo:', err);
      });
    };
  }, [procesarEstatusDispositivo]);

  const confirmarPreguntaPendiente = useCallback(
    async (tipo: 'boton' | 'ubicacion', confirmado: boolean) => {
      const pregunta = state.preguntasPendientes.find(p => p.tipo === tipo);
      if (!pregunta) return;

      const { fechaISO, ubicacionMapsUrl } = pregunta;

      if (confirmado) {
        await actualizarEstadoPrueba(
          expedienteIdRef.current,
          tipo,
          true,
          fechaISO,
          ubicacionMapsUrl
        );
      }

      window.dispatchEvent(
        new CustomEvent('passive-test-result', {
          detail: { tipo, exitoso: confirmado, fechaISO },
        })
      );

      setState((prev) => ({
        ...prev,
        preguntasPendientes: prev.preguntasPendientes.filter(p => p.tipo !== tipo),
      }));
    },
    [state.preguntasPendientes]
  );

  const forzarConsulta = useCallback(() => {
    consultarEstatusRef.current?.();
  }, []);

  const detenerConsultasManual = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      pollingActivoRef.current = false;
      pollingDestructionCountRef.current += 1;
      if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`🔴 [POLLING DESTROYED #${pollingDestructionCountRef.current}] ESN: ${esnActivoRef.current} - Detenido manualmente`);
      }
    }
    setState((prev) => ({ ...prev, consultasDetenidas: true, detencionManual: true }));
    if (onLogConsolaRef.current) {
      onLogConsolaRef.current('🛑 Consultas detenidas manualmente (modo desarrollo)');
    }
  }, []);

  const reanudarConsultas = useCallback(() => {
    intentosPollingRef.current = 0;
    setIntentosRealizados(0);
    setState((prev) => ({ ...prev, consultasDetenidas: false, detencionManual: false }));
    consultasDetenidasPorCompletadoRef.current = false;
    if (onLogConsolaRef.current) {
      onLogConsolaRef.current('▶️ Consultas reanudadas manualmente - Reiniciando contador de intentos');
    }
    consultarEstatusRef.current?.();
  }, []);

  useEffect(() => {
    const esModoEspecial = esn === '000000000000000';

    if (esModoEspecial) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        pollingActivoRef.current = false;
      }
      if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`🧪 ESN especial detectado - Polling desactivado (simulación automática activa)`);
      }
      return;
    }

    const todasPruebasCompletadas =
      (!requiereIgnicion || ignicionExitosa) &&
      (!requiereBoton || botonExitoso) &&
      (!requiereUbicacion || ubicacionExitosa);

    if (todasPruebasCompletadas) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        pollingActivoRef.current = false;
        pollingDestructionCountRef.current += 1;
        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`🔴 [POLLING DESTROYED #${pollingDestructionCountRef.current}] ESN: ${esnActivoRef.current} - Todas las pruebas completadas`);
        }
      }
      return;
    }

    if (esperandoComandoActivo) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        pollingActivoRef.current = false;
        pollingDestructionCountRef.current += 1;
        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`🔴 [POLLING DESTROYED #${pollingDestructionCountRef.current}] ESN: ${esnActivoRef.current} - Comando activo en espera`);
        }
      }
      return;
    }

    if (!esn || state.detencionManual) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        pollingActivoRef.current = false;
        pollingDestructionCountRef.current += 1;
        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`🔴 [POLLING DESTROYED #${pollingDestructionCountRef.current}] ESN: ${esnActivoRef.current} - ${!esn ? 'Sin ESN' : 'Detenido manual'}`);
        }
      }
      return;
    }

    if (pollingActivoRef.current && esnActivoRef.current === esn) {
      if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`⚠️ [POLLING SKIP] Ya existe polling activo para ESN: ${esn}`);
      }
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      pollingDestructionCountRef.current += 1;
      if (onLogConsolaRef.current) {
        onLogConsolaRef.current(`🔴 [POLLING DESTROYED #${pollingDestructionCountRef.current}] ESN anterior: ${esnActivoRef.current} - Cambiando a nuevo ESN`);
      }
    }

    esnActivoRef.current = esn;
    pollingActivoRef.current = true;
    pollingCreationCountRef.current += 1;
    intentosPollingRef.current = 0;

    if (onLogConsolaRef.current) {
      onLogConsolaRef.current(`🟢 [POLLING CREATED #${pollingCreationCountRef.current}] ESN: ${esn} - Iniciando polling`);
      onLogConsolaRef.current(`📊 Estadísticas de sesión: ${pollingCreationCountRef.current} creaciones / ${pollingDestructionCountRef.current} destrucciones`);
      onLogConsolaRef.current(`🎯 Pruebas relevantes: Ubicación (obligatoria)${requiereIgnicion ? ' + Ignición' : ''}${requiereBoton ? ' + Botón' : ''}`);
    }

    consultarEstatusRef.current?.();

    const INTERVALO_MS = 60000;
    if (onLogConsolaRef.current) {
      onLogConsolaRef.current(`⏰ Intervalo fijo: 60s (máx 10 intentos)`);
    }
    intervalRef.current = window.setInterval(() => {
      if (intentosPollingRef.current >= 10) {
        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`🛑 Límite de 10 intentos alcanzado, deteniendo polling`);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          pollingActivoRef.current = false;
        }
        return;
      }

      if (!hayPruebasPendientes()) {
        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`🎉 Todas las pruebas relevantes completadas, deteniendo polling`);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          pollingActivoRef.current = false;
        }
        return;
      }

      consultarEstatusRef.current?.();
    }, INTERVALO_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        pollingActivoRef.current = false;
        pollingDestructionCountRef.current += 1;
        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(`🔴 [POLLING DESTROYED #${pollingDestructionCountRef.current}] ESN: ${esnActivoRef.current} - Componente desmontado`);
        }
      }
    };
  }, [
    esn,
    esperandoComandoActivo,
    state.detencionManual,
    ignicionExitosa,
    botonExitoso,
    ubicacionExitosa,
    requiereIgnicion,
    requiereBoton,
    requiereUbicacion,
  ]);

  useEffect(() => {
    expedienteIdRef.current = expedienteId;
  }, [expedienteId]);

  useEffect(() => {
    const cargarEstadoGuardado = async () => {
      if (!expedienteId || !esn) return;

      const sesionGuardada = await obtenerSesionPorExpediente(expedienteId);
      if (sesionGuardada && sesionGuardada.esn === esn) {
        intentosPollingRef.current = sesionGuardada.intentos_realizados;
        setIntentosRealizados(sesionGuardada.intentos_realizados);

        if (onLogConsolaRef.current) {
          onLogConsolaRef.current(
            `💾 Estado recuperado de la base de datos - Intentos: ${sesionGuardada.intentos_realizados}/10`
          );
        }
      } else if (esn) {
        await guardarOActualizarSesion({
          expediente_id: expedienteId,
          esn,
          ignicion_exitosa: ignicionExitosa,
          boton_exitoso: botonExitoso,
          ubicacion_exitosa: ubicacionExitosa,
          bloqueo_exitoso: false,
          buzzer_exitoso: false,
          boton_fecha_preguntada: botonFechaPreguntada,
          ubicacion_fecha_preguntada: ubicacionFechaPreguntada,
          url_ubicacion: null,
          intentos_realizados: 0,
          session_active: true,
          last_query_at: null
        });

        if (onLogConsolaRef.current) {
          onLogConsolaRef.current('🆕 Nueva sesión creada en la base de datos');
        }
      }
    };

    cargarEstadoGuardado();
  }, [expedienteId, esn]);

  return {
    ...state,
    confirmarPreguntaPendiente,
    forzarConsulta,
    detenerConsultasManual,
    reanudarConsultas,
    intentosRealizados,
  };
}
