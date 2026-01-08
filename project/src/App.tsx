import { useState, useEffect } from 'react';
import { useAppStore } from './store';
import { QRScanner } from './components/QRScanner';
import { CompletionMessage } from './components/CompletionMessage';
import { DeviceChangeModal } from './components/DeviceChangeModal';
import { AppRouter } from './components/AppRouter';
import CalendarioTecnico from './components/CalendarioTecnico';
import { ServiceFlow } from './components/ServiceFlow';
import { traducirPruebasDesdeInstallationDetails, requierePrueba } from './utils';
import { actualizarExpediente, finalizarValidacionConExito, obtenerExpedienteCompleto, registrarCambioDispositivo, obtenerTodosLosServiciosPorEmailTecnico } from './services/expedienteService';
import { generarExpedienteId, obtenerSesionPorExpediente, reiniciarSesion, crearSesion } from './services/testSessionService';
import { enviarDatosFinalesWebhook } from './services/webhookService';
import { reiniciarServicioDePruebas, esServicioDePruebas } from './services/testServiceService';
import { buscarEquipoEnInventario } from './services/zohoInventoryService';
import { obtenerDatosCierre, marcarAvanceACierre, eliminarDatosCierre } from './services/cierreService';
import { useAuth } from './contexts/AuthContext';
import { X } from 'lucide-react';
import { Header } from './components/Header';
import { ConfirmModal } from './components/ui/Modal';
import { ValidationSummaryJSON, ExpedienteServicio } from './types';
import { supabase, supabaseConfigured, supabaseError } from './supabaseClient';
import { MisServicios } from './components/misServicios/MisServicios';

function formatearFechaLocal(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function TechnicianApp() {
  const [state, dispatch] = useAppStore();
  const { user, signOut } = useAuth();
  const [serviciosCargados, setServiciosCargados] = useState(false);
  const [errorPanel, setErrorPanel] = useState<string>('');
  const [esnTemporal, setEsnTemporal] = useState('');
  const [guardandoESN, setGuardandoESN] = useState(false);
  const [ultimoGuardadoESNTimestamp, setUltimoGuardadoESNTimestamp] = useState(0);
  const [bloqueadoPorCooldown, setBloqueadoPorCooldown] = useState(false);
  const [consolaMonitoreo, setConsolaMonitoreo] = useState<string[]>([]);
  const [mostrarConsola, setMostrarConsola] = useState(false);
  const [contadorRequests, setContadorRequests] = useState(0);
  const [mostrarQRScanner, setMostrarQRScanner] = useState(false);
  const [servicioFinalizado, setServicioFinalizado] = useState(false);
  const [consolaDesbloqueada, setConsolaDesbloqueada] = useState(false);
  const [mostrarPromptPassword, setMostrarPromptPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [validationSummary, setValidationSummary] = useState<ValidationSummaryJSON | null>(null);
  const [mostrarModalCambioDispositivo, setMostrarModalCambioDispositivo] = useState(false);
  const [cambiandoDispositivo, setCambiandoDispositivo] = useState(false);
  const [prefolioCompletado, setPrefolioCompletado] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(true);
  const [todosLosServicios, setTodosLosServicios] = useState<ExpedienteServicio[]>([]);
  const [pruebasCompletadas, setPruebasCompletadas] = useState(false);
  const [mostrarFormularioCierre, setMostrarFormularioCierre] = useState(false);
  const [pruebasBloqueadas, setPruebasBloqueadas] = useState(false);
  const [mostrarMisServicios, setMostrarMisServicios] = useState(false);
  const [mostrarModalReiniciarServicio, setMostrarModalReiniciarServicio] = useState(false);
  const [pendingEsnDuplicado, setPendingEsnDuplicado] = useState<{ esn: string; woInfo: string; callback: () => void } | null>(null);
  const [serviciosConCheckIn, setServiciosConCheckIn] = useState<Set<number>>(new Set());
  const [pendingCambioDispositivo, setPendingCambioDispositivo] = useState<{ nuevoESN: string; motivo: string; descripcion: string; woInfo: string } | null>(null);


  const handleQRScanSuccess = (decodedText: string) => {
    setEsnTemporal(decodedText);
    setMostrarQRScanner(false);
    agregarLogConsola(`📷 ESN escaneado: ${decodedText}`);
  };

  const iniciarPruebasConESN = async (esn: string, skipDuplicateCheck: boolean = false) => {
    if (!esn.trim() || !state.expediente_actual) {
      agregarLogConsola(`⚠️ Faltan datos: ESN o expediente no disponible`);
      return false;
    }

    // MODO ESPECIAL: ESN de prueba "000000000000000"
    const esModoEspecial = esn === '000000000000000';

    if (esModoEspecial) {
      agregarLogConsola(`🧪 MODO ESPECIAL DETECTADO: ESN de prueba`);
      agregarLogConsola(`✨ Todas las pruebas se marcarán como exitosas automáticamente`);
    }

    // Verificar duplicados (excepto si viene del prefolio que ya lo validó)
    if (!skipDuplicateCheck && !esModoEspecial) {
      agregarLogConsola(`🔍 Verificando si el ESN ${esn} ya fue utilizado...`);

      try {
        const { data: expedientesConESN, error: errorBusqueda } = await supabase
          .from('expedientes_servicio')
          .select('work_order_name, appointment_name, id')
          .eq('device_esn', esn)
          .neq('id', state.expediente_actual.id);

        if (errorBusqueda) {
          console.error('Error al buscar ESN:', errorBusqueda);
        } else if (expedientesConESN && expedientesConESN.length > 0) {
          const expedientePrevio = expedientesConESN[0];
          const woInfo = `WO: ${expedientePrevio.work_order_name}, AP: ${expedientePrevio.appointment_name}`;

          agregarLogConsola(`⚠️ ESN ${esn} encontrado en ${woInfo}`);
          
          setPendingEsnDuplicado({
            esn,
            woInfo,
            callback: () => {
              agregarLogConsola(`✓ Usuario confirmó el uso del ESN duplicado`);
              iniciarPruebasConESN(esn, true);
            }
          });
          return false;
        } else {
          agregarLogConsola(`✓ ESN no ha sido utilizado previamente`);
        }
      } catch (error) {
        console.error('Error al verificar ESN:', error);
      }
    }

    agregarLogConsola(`💾 Guardando ESN: ${esn}`);

    try {
      if (!state.expediente_actual?.id) {
        throw new Error('ID de expediente no válido');
      }

      const exito = await actualizarExpediente(state.expediente_actual.id, {
        device_esn: esn,
        validation_start_timestamp: new Date().toISOString(),
        validation_final_status: 'PRUEBAS EN CURSO',
        status: 'Pruebas en curso'
      });

      if (exito) {
        agregarLogConsola(`✅ ESN guardado exitosamente en la base de datos`);
        agregarLogConsola(`⏱️ Inicio de validación registrado`);
        agregarLogConsola(`🔄 Status: Pruebas en curso`);

        if (esModoEspecial) {
          // En modo especial: flujo manual pero sin espera de servidor
          agregarLogConsola(`🧪 MODO ESPECIAL: ESN de prueba detectado`);
          agregarLogConsola(`📋 Las pruebas se ejecutarán paso a paso manualmente`);
          agregarLogConsola(`⏭️ Sin espera de servidor - resultados positivos garantizados`);

          dispatch({ type: 'SET_ESN', payload: esn });

          const expedienteId = generarExpedienteId(
            state.expediente_actual.work_order_name,
            state.expediente_actual.appointment_name
          );

          // Crear sesión inicial con todo en false para permitir avance manual
          await crearSesion({
            expediente_id: expedienteId,
            esn: esn,
            ignicion_exitosa: false,
            ubicacion_exitosa: false,
            boton_exitoso: false,
            bloqueo_exitoso: false,
            desbloqueo_exitoso: false,
            buzzer_exitoso: false,
            buzzer_off_exitoso: false,
            boton_fecha_preguntada: null,
            ubicacion_fecha_preguntada: null,
            url_ubicacion: null,
            intentos_realizados: 0,
            session_active: true,
            last_query_at: null
          });

          agregarLogConsola(`🟢 Sesión de pruebas creada - avance manual habilitado`);
          agregarLogConsola(`📝 Ejecuta cada prueba para marcarla como completada`);

        } else {
          // Flujo normal: iniciar polling de pruebas pasivas
          setTimeout(() => {
            dispatch({ type: 'SET_ESN', payload: esn });
            agregarLogConsola(`🟢 Iniciando consulta inmediata y polling automático (60s, máx 10 intentos)`);
          }, 100);
        }

        return true;
      } else {
        agregarLogConsola(`❌ Error al guardar ESN en la base de datos`);
        setErrorPanel('Error al guardar ESN. Por favor, verifica la conexión y vuelve a intentar.');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      agregarLogConsola(`❌ Error: ${errorMessage}`);
      setErrorPanel(`Error al guardar ESN: ${errorMessage}`);
      console.error('Error en iniciarPruebasConESN:', error);
      return false;
    }
  };

  const handleEnviarESN = async () => {
    if (!esnTemporal.trim() || !state.expediente_actual) {
      agregarLogConsola(`⚠️ Faltan datos: ESN o expediente no disponible`);
      return;
    }

    const ahora = Date.now();
    const tiempoDesdeUltimoGuardado = ahora - ultimoGuardadoESNTimestamp;
    const COOLDOWN_GUARDADO_MS = 15000;

    if (ultimoGuardadoESNTimestamp > 0 && tiempoDesdeUltimoGuardado < COOLDOWN_GUARDADO_MS) {
      setBloqueadoPorCooldown(true);
      const segundosRestantes = Math.ceil((COOLDOWN_GUARDADO_MS - tiempoDesdeUltimoGuardado) / 1000);
      agregarLogConsola(`⚠️ BLOQUEADO: Espera ${segundosRestantes}s antes de guardar otro ESN`);
      setTimeout(() => setBloqueadoPorCooldown(false), COOLDOWN_GUARDADO_MS - tiempoDesdeUltimoGuardado);
      return;
    }

    if (state.esn && state.esn === esnTemporal) {
      agregarLogConsola(`⚠️ El ESN ${esnTemporal} ya está guardado`);
      return;
    }

    setGuardandoESN(true);
    setUltimoGuardadoESNTimestamp(ahora);

    const exito = await iniciarPruebasConESN(esnTemporal, false);

    setGuardandoESN(false);
  };

  const continuarCambioDispositivoConfirmado = async (nuevoESN: string, motivo: string, descripcion: string) => {
    if (!state.expediente_actual || !state.esn) {
      agregarLogConsola('❌ Error: No hay expediente o ESN actual');
      return;
    }

    setCambiandoDispositivo(true);
    agregarLogConsola('✓ Usuario confirmó el uso del ESN duplicado');

    try {
      agregarLogConsola('🔍 Consultando CRM/Zoho Inventory para el nuevo dispositivo...');
      const resultadoZoho = await buscarEquipoEnInventario(nuevoESN);

      let zohoInventoryId: string | undefined;
      let modeloDispositivo: string | undefined;
      let imei: string | undefined;
      let telefonoSim: string | undefined;

      if (resultadoZoho.success && resultadoZoho.data) {
        agregarLogConsola('✅ Equipo encontrado en CRM:');
        agregarLogConsola(`   📦 ID: ${resultadoZoho.data.id}`);
        agregarLogConsola(`   📱 Modelo: ${resultadoZoho.data.model}`);
        agregarLogConsola(`   🔢 IMEI: ${resultadoZoho.data.IMEI}`);
        agregarLogConsola(`   📞 Línea: ${resultadoZoho.data.linea}`);

        zohoInventoryId = resultadoZoho.data.id;
        modeloDispositivo = resultadoZoho.data.model;
        imei = resultadoZoho.data.IMEI;
        telefonoSim = resultadoZoho.data.linea;
      } else {
        agregarLogConsola(`⚠️ No se encontró el equipo en CRM: ${resultadoZoho.error || 'Sin información'}`);
        agregarLogConsola('ℹ️ Se continuará sin datos de CRM');
      }

      const expedienteId = generarExpedienteId(
        state.expediente_actual.work_order_name,
        state.expediente_actual.appointment_name
      );

      agregarLogConsola('🗑️ Reseteando sesión de pruebas pasivas...');
      const exitoReset = await reiniciarSesion(expedienteId, nuevoESN);

      if (!exitoReset) {
        throw new Error('Error al resetear sesión de pruebas');
      }

      agregarLogConsola('✅ Sesión de pruebas reseteada correctamente');
      
      // CRÍTICO: Eliminar datos de cierre si existen (invalida checkpoint de Documentación final)
      agregarLogConsola('🗑️ Eliminando datos de cierre (si existen)...');
      await eliminarDatosCierre(state.expediente_actual.id);
      
      agregarLogConsola('💾 Actualizando expediente con nuevo dispositivo y datos de CRM...');

      const exitoRegistro = await registrarCambioDispositivo(
        state.expediente_actual.id,
        state.esn,
        nuevoESN,
        motivo,
        descripcion,
        state.expediente_actual.device_esn_cambio_cantidad || 0,
        zohoInventoryId,
        modeloDispositivo,
        imei,
        telefonoSim
      );

      if (!exitoRegistro) {
        throw new Error('Error al registrar cambio de dispositivo');
      }

      agregarLogConsola('✅ Expediente actualizado con datos del nuevo dispositivo');
      agregarLogConsola('🔄 Reiniciando contexto - TODAS las pruebas deben repetirse...');

      dispatch({ type: 'RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO' });
      setPruebasCompletadas(false);
      setMostrarFormularioCierre(false);
      setPruebasBloqueadas(false);

      const esNuevoEsnDePrueba = nuevoESN === '000000000000000';

      setTimeout(() => {
        dispatch({ type: 'SET_ESN', payload: nuevoESN });
        agregarLogConsola('✅ Contexto del servicio reiniciado completamente');
        agregarLogConsola('🚀 Listo para iniciar pruebas con el nuevo dispositivo');
        
        if (esNuevoEsnDePrueba) {
          agregarLogConsola('🧪 ESN de prueba detectado - avance manual habilitado');
          agregarLogConsola('📝 Use los botones de marcado manual para completar cada prueba');
        } else {
          agregarLogConsola('🟢 Iniciando consulta inmediata y polling automático (60s, máx 10 intentos)');
        }
        
        agregarLogConsola('✅ Cambio de dispositivo completado exitosamente');
      }, 100);

      setEsnTemporal('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      agregarLogConsola(`❌ Error al cambiar dispositivo: ${errorMessage}`);
      setErrorPanel(`Error al cambiar dispositivo: ${errorMessage}`);
      console.error('Error en continuarCambioDispositivoConfirmado:', error);
    } finally {
      setCambiandoDispositivo(false);
    }
  };

  const handleCambiarDispositivo = async (nuevoESN: string, motivo: string, descripcion: string) => {
    if (!state.expediente_actual || !state.esn) {
      agregarLogConsola('❌ Error: No hay expediente o ESN actual');
      return;
    }

    setCambiandoDispositivo(true);
    agregarLogConsola('🔄 Iniciando cambio de dispositivo...');
    agregarLogConsola(`📋 ESN actual: ${state.esn}`);
    agregarLogConsola(`📋 Nuevo ESN: ${nuevoESN}`);
    agregarLogConsola(`📝 Motivo: ${motivo}`);

    try {
      agregarLogConsola('🔍 Verificando si el nuevo ESN ya fue utilizado...');

      const { data: expedientesConESN, error: errorBusqueda } = await supabase
        .from('expedientes_servicio')
        .select('work_order_name, appointment_name, id')
        .eq('device_esn', nuevoESN)
        .neq('id', state.expediente_actual.id);

      if (errorBusqueda) {
        console.error('Error al buscar ESN:', errorBusqueda);
      } else if (expedientesConESN && expedientesConESN.length > 0) {
        const expedientePrevio = expedientesConESN[0];
        const woInfo = `WO: ${expedientePrevio.work_order_name}, AP: ${expedientePrevio.appointment_name}`;

        agregarLogConsola(`⚠️ ESN ${nuevoESN} encontrado en ${woInfo}`);

        setPendingCambioDispositivo({ nuevoESN, motivo, descripcion, woInfo });
        setCambiandoDispositivo(false);
        setMostrarModalCambioDispositivo(false);
        return;
      } else {
        agregarLogConsola(`✓ ESN disponible`);
      }

      agregarLogConsola('🔍 Consultando CRM/Zoho Inventory para el nuevo dispositivo...');
      const resultadoZoho = await buscarEquipoEnInventario(nuevoESN);

      let zohoInventoryId: string | undefined;
      let modeloDispositivo: string | undefined;
      let imei: string | undefined;
      let telefonoSim: string | undefined;

      if (resultadoZoho.success && resultadoZoho.data) {
        agregarLogConsola('✅ Equipo encontrado en CRM:');
        agregarLogConsola(`   📦 ID: ${resultadoZoho.data.id}`);
        agregarLogConsola(`   📱 Modelo: ${resultadoZoho.data.model}`);
        agregarLogConsola(`   🔢 IMEI: ${resultadoZoho.data.IMEI}`);
        agregarLogConsola(`   📞 Línea: ${resultadoZoho.data.linea}`);

        zohoInventoryId = resultadoZoho.data.id;
        modeloDispositivo = resultadoZoho.data.model;
        imei = resultadoZoho.data.IMEI;
        telefonoSim = resultadoZoho.data.linea;
      } else {
        agregarLogConsola(`⚠️ No se encontró el equipo en CRM: ${resultadoZoho.error || 'Sin información'}`);
        agregarLogConsola('ℹ️ Se continuará sin datos de CRM');
      }

      const expedienteId = generarExpedienteId(
        state.expediente_actual.work_order_name,
        state.expediente_actual.appointment_name
      );

      agregarLogConsola('🗑️ Reseteando sesión de pruebas pasivas...');
      const exitoReset = await reiniciarSesion(expedienteId, nuevoESN);

      if (!exitoReset) {
        throw new Error('Error al resetear sesión de pruebas');
      }

      agregarLogConsola('✅ Sesión de pruebas reseteada correctamente');
      
      // CRÍTICO: Eliminar datos de cierre si existen (invalida checkpoint de Documentación final)
      agregarLogConsola('🗑️ Eliminando datos de cierre (si existen)...');
      await eliminarDatosCierre(state.expediente_actual.id);
      
      agregarLogConsola('💾 Actualizando expediente con nuevo dispositivo y datos de CRM...');

      const exitoRegistro = await registrarCambioDispositivo(
        state.expediente_actual.id,
        state.esn,
        nuevoESN,
        motivo,
        descripcion,
        state.expediente_actual.device_esn_cambio_cantidad || 0,
        zohoInventoryId,
        modeloDispositivo,
        imei,
        telefonoSim
      );

      if (!exitoRegistro) {
        throw new Error('Error al registrar cambio de dispositivo');
      }

      agregarLogConsola('✅ Expediente actualizado con datos del nuevo dispositivo');
      agregarLogConsola('🔄 Reiniciando contexto - TODAS las pruebas deben repetirse...');

      dispatch({ type: 'RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO' });
      setPruebasCompletadas(false);
      setMostrarFormularioCierre(false);
      setPruebasBloqueadas(false);

      const esNuevoEsnDePrueba = nuevoESN === '000000000000000';

      setTimeout(() => {
        dispatch({ type: 'SET_ESN', payload: nuevoESN });
        agregarLogConsola('✅ Contexto del servicio reiniciado completamente');
        agregarLogConsola('🚀 Listo para iniciar pruebas con el nuevo dispositivo');
        
        if (esNuevoEsnDePrueba) {
          agregarLogConsola('🧪 ESN de prueba detectado - avance manual habilitado');
          agregarLogConsola('📝 Use los botones de marcado manual para completar cada prueba');
        } else {
          agregarLogConsola('🟢 Iniciando consulta inmediata y polling automático (60s, máx 10 intentos)');
        }
        
        agregarLogConsola('✅ Cambio de dispositivo completado exitosamente');
      }, 100);

      setMostrarModalCambioDispositivo(false);
      setEsnTemporal('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      agregarLogConsola(`❌ Error al cambiar dispositivo: ${errorMessage}`);
      setErrorPanel(`Error al cambiar dispositivo: ${errorMessage}`);
      console.error('Error en handleCambiarDispositivo:', error);
    } finally {
      setCambiandoDispositivo(false);
    }
  };

  const agregarLogConsola = (mensaje: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsolaMonitoreo(prev => [...prev, `[${timestamp}] ${mensaje}`]);

    if (mensaje.includes('Request #')) {
      const match = mensaje.match(/Request #(\d+)/);
      if (match) {
        setContadorRequests(parseInt(match[1], 10));
      }
    }
  };

  const limpiarConsola = () => {
    setConsolaMonitoreo([]);
  };

  const handleSolicitarPassword = () => {
    setMostrarPromptPassword(true);
    setPasswordInput('');
  };

  const handleVerificarPassword = () => {
    if (passwordInput === '0258') {
      setConsolaDesbloqueada(true);
      setMostrarConsola(true);
      setMostrarPromptPassword(false);
      setPasswordInput('');
      agregarLogConsola('🔓 Consola de monitoreo desbloqueada');
    } else {
      setPasswordInput('');
      alert('Contraseña incorrecta');
    }
  };

  const handleCancelarPassword = () => {
    setMostrarPromptPassword(false);
    setPasswordInput('');
  };

  const handleCerrarServicio = async () => {
    if (!state.expediente_actual) return;

    agregarLogConsola('🔄 Cerrando servicio y reiniciando...');

    const { eliminarPrefolioCompleto } = await import('./services/prefolioService');
    const resultado = await eliminarPrefolioCompleto(state.expediente_actual.id);

    if (resultado.success) {
      agregarLogConsola('✅ Servicio reiniciado correctamente');
      
      // RESET COMPLETO DE TODOS LOS ESTADOS
      setPrefolioCompletado(false);
      setPruebasCompletadas(false);
      setMostrarFormularioCierre(false);
      setPruebasBloqueadas(false);
      setServicioFinalizado(false);
      setValidationSummary(null);
      setEsnTemporal('');
      setErrorPanel('');
      setMostrarQRScanner(false);
      
      dispatch({ type: 'RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO' });
      dispatch({ type: 'SET_EXPEDIENTE', payload: null as any });

      if (user?.email) {
        const servicios = await obtenerTodosLosServiciosPorEmailTecnico(user.email);
        setTodosLosServicios(servicios);
      }

      setMostrarCalendario(true);
    } else {
      setErrorPanel(`Error al reiniciar servicio: ${resultado.error}`);
      agregarLogConsola(`❌ Error al reiniciar servicio: ${resultado.error}`);
    }
  };

  const handleSeleccionarServicioDesdeCalendario = async (servicio: ExpedienteServicio) => {
    if (servicio.status === 'vuelta_en_falso') {
      alert('Este servicio fue marcado como "Vuelta en falso" y no puede continuarse. Solo se podrá continuar cuando se genere un nuevo registro.');
      return;
    }

    const fechaServicio = servicio.scheduled_start_time
      ? formatearFechaLocal(new Date(servicio.scheduled_start_time))
      : '';
    const hoy = formatearFechaLocal(new Date());

    if (fechaServicio !== hoy) {
      alert('Solo puedes iniciar servicios programados para el día de hoy.');
      return;
    }

    if (servicio.validation_final_status === 'COMPLETADO') {
      alert('Este servicio ya fue completado.');
      return;
    }

    // La restauración del estado se maneja en el useEffect que observa state.expediente_actual
    // Solo necesitamos establecer el expediente y ocultar el calendario
    dispatch({ type: 'SET_EXPEDIENTE', payload: servicio });
    setMostrarCalendario(false);
  };

  const handleServicioActualizado = (servicioActualizado: ExpedienteServicio) => {
    setTodosLosServicios(prev => 
      prev.map(s => s.id === servicioActualizado.id ? servicioActualizado : s)
    );
    
    if (state.expediente_actual?.id === servicioActualizado.id) {
      dispatch({ type: 'SET_EXPEDIENTE', payload: servicioActualizado });
    }
    
    agregarLogConsola(`📋 Servicio actualizado: ${servicioActualizado.appointment_name} - Estado: ${servicioActualizado.status}`);
  };

  const handlePrefolioCompleted = async () => {
    agregarLogConsola('✅ Información guardada exitosamente');
    setPrefolioCompletado(true);

    if (state.expediente_actual) {
      const expedienteActualizado = await obtenerExpedienteCompleto(state.expediente_actual.id);
      if (expedienteActualizado) {
        dispatch({ type: 'SET_EXPEDIENTE', payload: expedienteActualizado });

        if (expedienteActualizado.device_esn) {
          agregarLogConsola(`📋 ESN cargado: ${expedienteActualizado.device_esn}`);
          setEsnTemporal(expedienteActualizado.device_esn);

          // INICIAR AUTOMÁTICAMENTE EL FLUJO DE PRUEBAS
          agregarLogConsola('🚀 Iniciando pruebas automáticamente con ESN...');

          // Ya se validaron duplicados en el formulario
          const exito = await iniciarPruebasConESN(expedienteActualizado.device_esn, true);

          if (exito) {
            agregarLogConsola('✅ Flujo de pruebas iniciado correctamente');
          } else {
            agregarLogConsola('❌ Error al iniciar flujo de pruebas');
            setErrorPanel('Error al iniciar las pruebas. Verifica el ESN e intenta nuevamente.');
          }
        } else {
          agregarLogConsola('⚠️ Información completada pero sin ESN - esto no debería ocurrir');
          setErrorPanel('Error: No se encontró un ESN válido');
        }
      }
    }
  };

  const handleFormularioCierreCompletado = () => {
    agregarLogConsola('✅ Formulario de cierre completado');
    agregarLogConsola('🚀 Finalizando servicio...');
    setMostrarFormularioCierre(false);
    finalizarServicioAutomaticamente();
  };

  useEffect(() => {
    const cargarServiciosAutomaticamente = async () => {
      if (!user?.email || serviciosCargados) return;

      dispatch({ type: 'SET_EMAIL_TECNICO', payload: user.email });
      setServiciosCargados(true);

      const servicios = await obtenerTodosLosServiciosPorEmailTecnico(user.email);
      setTodosLosServicios(servicios);
    };

    cargarServiciosAutomaticamente();
  }, [user, serviciosCargados]);

  useEffect(() => {
    // RESET COMPLETO al cambiar de expediente
    setEsnTemporal('');
    setServicioFinalizado(false);
    setValidationSummary(null);
    setMostrarQRScanner(false);
    setErrorPanel('');
    setPrefolioCompletado(false);
    setPruebasCompletadas(false);
    setMostrarFormularioCierre(false);
    
    // Reset del store de pruebas
    dispatch({ type: 'RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO' });

    const cargarEstadoGuardado = async () => {
      if (!state.expediente_actual) return;

      agregarLogConsola(`📋 Expediente seleccionado: ${state.expediente_actual.work_order_name} - ${state.expediente_actual.appointment_name}`);
      agregarLogConsola(`🔍 Estado del servicio: ${state.expediente_actual.prefolio_realizado ? 'INFORMACIÓN COMPLETADA' : 'INFORMACIÓN PENDIENTE'}`);

      if (state.expediente_actual.prefolio_realizado) {
        agregarLogConsola(`✅ Información ya completada previamente`);
        setPrefolioCompletado(true);
        
        // VERIFICAR SI YA AVANZÓ A DOCUMENTACIÓN FINAL
        const datosCierre = await obtenerDatosCierre(state.expediente_actual.id);
        
        if (datosCierre) {
          agregarLogConsola(`📄 Datos de cierre encontrados - Restaurando a Documentación final`);
          setMostrarFormularioCierre(true);
          setPruebasCompletadas(true);
          setPruebasBloqueadas(true);
          
          // Restaurar ESN si existe
          if (state.expediente_actual.device_esn) {
            dispatch({ type: 'SET_ESN', payload: state.expediente_actual.device_esn });
            setEsnTemporal(state.expediente_actual.device_esn);
          }
        } else {
          agregarLogConsola(`🔧 Sin datos de cierre - Mostrando pruebas del dispositivo`);
        }
      } else {
        agregarLogConsola(`📝 Información pendiente - Mostrando formulario`);
      }

      if (state.expediente_actual.validation_final_status === 'COMPLETADO') {
        agregarLogConsola(`✅ Servicio completado previamente`);
        console.log('🔍 DEBUG - Expediente completado:', {
          status: state.expediente_actual.validation_final_status,
          hasJSON: !!state.expediente_actual.validation_summary_json,
          jsonType: typeof state.expediente_actual.validation_summary_json
        });

        if (state.expediente_actual.validation_summary_json) {
          agregarLogConsola(`📄 Cargando resumen de validación guardado...`);

          let summaryData = state.expediente_actual.validation_summary_json;
          if (typeof summaryData === 'string') {
            try {
              summaryData = JSON.parse(summaryData);
              agregarLogConsola(`✅ JSON parseado correctamente`);
            } catch (e) {
              console.error('Error parsing validation_summary_json:', e);
              agregarLogConsola(`❌ Error al parsear resumen de validación`);
            }
          }

          console.log('🔍 DEBUG - Summary data:', summaryData);
          setValidationSummary(summaryData);
          setServicioFinalizado(true);
          agregarLogConsola(`✅ Estados establecidos - Mostrando resumen completo`);
        } else {
          agregarLogConsola(`⚠️ Servicio marcado como completado pero sin resumen JSON`);
          setServicioFinalizado(true);
        }
        return;
      }

      const expedienteId = generarExpedienteId(
        state.expediente_actual.work_order_name,
        state.expediente_actual.appointment_name
      );

      const sesionGuardada = await obtenerSesionPorExpediente(expedienteId);

      if (sesionGuardada) {
        agregarLogConsola(`💾 Estado guardado recuperado para ESTE expediente - ESN: ${sesionGuardada.esn}`);

        dispatch({
          type: 'LOAD_SAVED_SESSION',
          payload: {
            esn: sesionGuardada.esn || '',
            ignicion_exitosa: sesionGuardada.ignicion_exitosa,
            boton_exitoso: sesionGuardada.boton_exitoso,
            ubicacion_exitosa: sesionGuardada.ubicacion_exitosa,
            bloqueo_exitoso: sesionGuardada.bloqueo_exitoso,
            desbloqueo_exitoso: sesionGuardada.desbloqueo_exitoso,
            buzzer_exitoso: sesionGuardada.buzzer_exitoso,
            buzzer_off_exitoso: sesionGuardada.buzzer_off_exitoso,
            boton_fecha_preguntada: sesionGuardada.boton_fecha_preguntada,
            ubicacion_fecha_preguntada: sesionGuardada.ubicacion_fecha_preguntada
          }
        });

        if (sesionGuardada.esn) {
          setEsnTemporal(sesionGuardada.esn);
        }
      } else {
        agregarLogConsola(`🆕 No hay estado guardado para este expediente. Iniciando nuevo servicio.`);
      }
    };

    cargarEstadoGuardado();
  }, [state.expediente_actual]);

  const finalizarServicioAutomaticamente = async () => {
    if (!state.expediente_actual) {
      agregarLogConsola('❌ No hay expediente actual');
      return;
    }

    agregarLogConsola('📋 Iniciando proceso de cierre de servicio...');
    agregarLogConsola('✓ Datos del vehículo ya registrados en el sistema');

    const expedienteId = generarExpedienteId(
      state.expediente_actual.work_order_name,
      state.expediente_actual.appointment_name
    );

    const testSession = await obtenerSesionPorExpediente(expedienteId);

    if (!testSession) {
      setErrorPanel('Error al obtener sesión de pruebas');
      agregarLogConsola('❌ Error al obtener sesión de pruebas');
      return;
    }

    const installationDetails = state.expediente_actual.installation_details || '';
    const requiereBloqueo = requierePrueba(installationDetails, 'bloqueo');
    const requiereBuzzer = requierePrueba(installationDetails, 'buzzer');
    const requiereBoton = requierePrueba(installationDetails, 'boton');

    const validationJSON: ValidationSummaryJSON = {
      status: 'completado',
      work_order_name: state.expediente_actual.work_order_name || '',
      appointment_name: state.expediente_actual.appointment_name || '',
      technician_name: state.expediente_actual.technician_name || '',
      device_esn: state.expediente_actual.device_esn || '',
      pruebas: {
        boton_panico: requiereBoton ? (testSession.boton_exitoso ? 'exitoso' : 'fallido') : 'no requerida',
        bloqueo: requiereBloqueo ? (testSession.bloqueo_exitoso ? 'exitoso' : 'fallido') : 'no requerida',
        desbloqueo: requiereBloqueo ? (testSession.desbloqueo_exitoso ? 'exitoso' : 'fallido') : 'no requerida',
        buzzer_activacion: requiereBuzzer ? (testSession.buzzer_exitoso ? 'exitoso' : 'fallido') : 'no requerida',
        buzzer_desactivacion: requiereBuzzer ? (testSession.buzzer_off_exitoso ? 'exitoso' : 'fallido') : 'no requerida',
        ignicion: testSession.ignicion_exitosa ? 'exitoso' : 'fallido',
        ubicacion: testSession.ubicacion_exitosa ? 'exitoso' : 'fallido',
      },
      detalles_vehiculo: {
        marca: state.expediente_actual.asset_marca || '',
        modelo: state.expediente_actual.asset_submarca || '',
        year: state.expediente_actual.vehicle_year || '',
        color: state.expediente_actual.asset_color || '',
        serie: state.expediente_actual.asset_vin || '',
        placas: state.expediente_actual.asset_placas || '',
        nombre_economico: state.expediente_actual.asset_economico || state.expediente_actual.asset_vin || '',
        odometro: state.expediente_actual.vehicle_odometer?.toString() || '0',
      },
      ubicacion_final: {
        ubicacion_confirmada: testSession.ubicacion_exitosa,
        fecha_ultimo_reporte: testSession.ubicacion_fecha_preguntada || new Date().toISOString(),
        url_ubicacion: `https://www.google.com.mx/maps/place/${state.expediente_actual.service_latitude || 0},${state.expediente_actual.service_longitude || 0}`,
      },
      timestamp_completado: new Date().toISOString(),
      resumen: 'Todas las pruebas se completaron exitosamente.',
    };

    agregarLogConsola('📝 Generando resumen de validación...');

    const exitoFinalizacion = await finalizarValidacionConExito(state.expediente_actual.id, validationJSON);

    if (!exitoFinalizacion) {
      setErrorPanel('Error al finalizar validación');
      agregarLogConsola('❌ Error al finalizar validación');
      return;
    }

    agregarLogConsola('✅ Validación finalizada con éxito');
    agregarLogConsola('📤 Enviando datos al webhook...');

    const expedienteCompleto = await obtenerExpedienteCompleto(state.expediente_actual.id);

    if (!expedienteCompleto) {
      setErrorPanel('Error al obtener datos para el webhook');
      agregarLogConsola('❌ Error al obtener datos completos');
      return;
    }

    const resultadoWebhook = await enviarDatosFinalesWebhook(expedienteCompleto, testSession);

    if (!resultadoWebhook.success) {
      setErrorPanel(`Error al enviar webhook: ${resultadoWebhook.error}`);
      agregarLogConsola(`❌ Error al enviar webhook: ${resultadoWebhook.error}`);
      return;
    }

    agregarLogConsola('✅ Datos enviados exitosamente al webhook');
    agregarLogConsola('🎉 Servicio finalizado correctamente');

    setValidationSummary(validationJSON);
    setServicioFinalizado(true);

    // Verificar si es un servicio de pruebas para reiniciarlo automáticamente
    if (esServicioDePruebas(state.expediente_actual)) {
      agregarLogConsola('🧪 Servicio de pruebas detectado - reiniciando automáticamente...');

      setTimeout(async () => {
        const exitoReinicio = await reiniciarServicioDePruebas(state.expediente_actual!.id);

        if (exitoReinicio) {
          agregarLogConsola('✅ Servicio de pruebas reiniciado - listo para nueva ejecución');
          agregarLogConsola('🔄 El servicio está disponible nuevamente en el día de hoy');
          agregarLogConsola('📋 Regresando al calendario para nueva selección...');

          // RESET COMPLETO de estados locales
          setPrefolioCompletado(false);
          setPruebasCompletadas(false);
          setMostrarFormularioCierre(false);
          setServicioFinalizado(false);
          setValidationSummary(null);
          setEsnTemporal('');
          setErrorPanel('');
          
          dispatch({ type: 'RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO' });
          dispatch({ type: 'SET_EXPEDIENTE', payload: null as any });

          // Actualizar la lista de servicios para reflejar el reinicio
          if (user?.email) {
            const servicios = await obtenerTodosLosServiciosPorEmailTecnico(user.email);
            setTodosLosServicios(servicios);
          }
          
          // Regresar al calendario
          setMostrarCalendario(true);
        } else {
          agregarLogConsola('❌ Error al reiniciar servicio de pruebas');
        }
      }, 3000);
    }

    if (user?.email) {
      agregarLogConsola('🔄 Actualizando lista de servicios...');
      setTimeout(async () => {
        const servicios = await obtenerTodosLosServiciosPorEmailTecnico(user.email);
        setTodosLosServicios(servicios);
      }, 1000);
    }
  };

  useEffect(() => {
    if (!state.expediente_actual || !state.esn || servicioFinalizado) {
      return;
    }

    const pruebasActuales = traducirPruebasDesdeInstallationDetails(
      state.expediente_actual.installation_details || ''
    );

    const requiereIgnicionCheck = pruebasActuales.some(p =>
      p.toLowerCase().includes('ignición') || p.toLowerCase().includes('ignicion')
    );
    const requiereBotonCheck = pruebasActuales.some(p =>
      p.toLowerCase().includes('botón') || p.toLowerCase().includes('boton') || p.toLowerCase().includes('pánico') || p.toLowerCase().includes('panico')
    );
    const requiereBloqueoCheck = pruebasActuales.some(p =>
      p.toLowerCase().includes('bloqueo') || p.toLowerCase().includes('paro de motor')
    );
    const requiereBuzzerCheck = pruebasActuales.some(p =>
      p.toLowerCase().includes('buzzer')
    );
    const requiereUbicacionCheck = pruebasActuales.some(p =>
      p.toLowerCase().includes('ubicación') || p.toLowerCase().includes('ubicacion')
    );

    const ignicionOK = !requiereIgnicionCheck || state.ignicion_exitosa;
    const ubicacionOK = !requiereUbicacionCheck || state.ubicacion_exitosa;
    const botonOK = !requiereBotonCheck || state.boton_exitoso;
    const pruebasBloqueoOK = !requiereBloqueoCheck || (state.bloqueo_exitoso && state.desbloqueo_exitoso);
    const pruebasBuzzerOK = !requiereBuzzerCheck || (state.buzzer_exitoso && state.buzzer_off_exitoso);

    if (ignicionOK && ubicacionOK && botonOK && pruebasBloqueoOK && pruebasBuzzerOK) {
      if (!pruebasCompletadas) {
        agregarLogConsola('🎯 Todas las pruebas requeridas completadas exitosamente');
        agregarLogConsola('✅ Presione "Confirmar pruebas" para continuar al formulario de cierre');
        setPruebasCompletadas(true);
      }
    }
  }, [
    state.ignicion_exitosa,
    state.boton_exitoso,
    state.ubicacion_exitosa,
    state.bloqueo_exitoso,
    state.desbloqueo_exitoso,
    state.buzzer_exitoso,
    state.buzzer_off_exitoso,
    state.expediente_actual,
    state.esn,
    servicioFinalizado,
    pruebasCompletadas,
    mostrarFormularioCierre
  ]);



  const pruebasRequeridas = state.expediente_actual
    ? traducirPruebasDesdeInstallationDetails(state.expediente_actual.installation_details || '')
    : [];

  const requiereBoton = pruebasRequeridas.some(p =>
    p.toLowerCase().includes('botón') || p.toLowerCase().includes('boton') || p.toLowerCase().includes('pánico') || p.toLowerCase().includes('panico')
  );
  const requiereBloqueo = pruebasRequeridas.some(p =>
    p.toLowerCase().includes('bloqueo') || p.toLowerCase().includes('paro de motor')
  );
  const requiereBuzzer = pruebasRequeridas.some(p =>
    p.toLowerCase().includes('buzzer')
  );

  const obtenerModuloActivo = (): 'agenda' | 'servicio' | 'historial' | null => {
    if (mostrarMisServicios) return 'historial';
    if (mostrarCalendario) return 'agenda';
    if (state.expediente_actual) return 'servicio';
    return 'agenda';
  };

  const handleNavegar = async (modulo: 'agenda' | 'servicio' | 'historial' | null) => {
    if (modulo === 'agenda') {
      if (user?.email) {
        const servicios = await obtenerTodosLosServiciosPorEmailTecnico(user.email);
        setTodosLosServicios(servicios);
      }
      setMostrarCalendario(true);
      setMostrarMisServicios(false);
    } else if (modulo === 'historial') {
      setMostrarMisServicios(true);
      setMostrarCalendario(false);
    } else if (modulo === 'servicio' && state.expediente_actual) {
      setMostrarCalendario(false);
      setMostrarMisServicios(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        moduloActivo={obtenerModuloActivo()}
        onNavegar={handleNavegar}
        onCerrarSesion={signOut}
        mostrarAgenda={true}
        mostrarServicio={!!state.expediente_actual}
        mostrarHistorial={true}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">

        {mostrarMisServicios ? (
          <MisServicios
            onVolver={() => {
              setMostrarMisServicios(false);
              setMostrarCalendario(true);
            }}
          />
        ) : mostrarCalendario ? (
          <CalendarioTecnico
            servicios={todosLosServicios}
            onSeleccionarServicio={handleSeleccionarServicioDesdeCalendario}
            servicioActual={state.expediente_actual}
            onServicioActualizado={handleServicioActualizado}
            serviciosConCheckIn={serviciosConCheckIn}
            onCheckInSuccess={(servicioId: number) => {
              setServiciosConCheckIn(prev => new Set([...prev, servicioId]));
            }}
            onLogConsola={agregarLogConsola}
          />
        ) : (
          <div className="space-y-6">
          {state.expediente_actual && (
            <>
              {servicioFinalizado && validationSummary ? (
                <CompletionMessage
                  expediente={state.expediente_actual}
                  validationSummary={validationSummary}
                />
              ) : (
                <ServiceFlow
                  expediente={state.expediente_actual}
                  esn={state.esn}
                  prefolioCompletado={prefolioCompletado}
                  pruebasCompletadas={pruebasCompletadas}
                  mostrarFormularioCierre={mostrarFormularioCierre}
                  ignicionExitosa={state.ignicion_exitosa}
                  botonExitoso={state.boton_exitoso}
                  ubicacionExitosa={state.ubicacion_exitosa}
                  bloqueoExitoso={state.bloqueo_exitoso}
                  desbloqueoExitoso={state.desbloqueo_exitoso}
                  buzzerExitoso={state.buzzer_exitoso}
                  buzzerOffExitoso={state.buzzer_off_exitoso}
                  botonFechaPreguntada={state.boton_fecha_preguntada}
                  ubicacionFechaPreguntada={state.ubicacion_fecha_preguntada}
                  esperandoComandoActivo={state.esperando_respuesta_comando_activo}
                  onPrefolioCompleted={handlePrefolioCompleted}
                  onClose={() => setMostrarModalReiniciarServicio(true)}
                  onCambiarDispositivo={() => setMostrarModalCambioDispositivo(true)}
                  onSetIgnicionExitosa={(val) => dispatch({ type: 'SET_IGNICION_EXITOSA', payload: val })}
                  onSetBotonExitoso={(val) => dispatch({ type: 'SET_BOTON_EXITOSO', payload: val })}
                  onSetUbicacionExitosa={(val) => dispatch({ type: 'SET_UBICACION_EXITOSA', payload: val })}
                  onSetBloqueoExitoso={(val) => dispatch({ type: 'SET_BLOQUEO_EXITOSO', payload: val })}
                  onSetDesbloqueoExitoso={(val) => dispatch({ type: 'SET_DESBLOQUEO_EXITOSO', payload: val })}
                  onSetBuzzerExitoso={(val) => dispatch({ type: 'SET_BUZZER_EXITOSO', payload: val })}
                  onSetBuzzerOffExitoso={(val) => dispatch({ type: 'SET_BUZZER_OFF_EXITOSO', payload: val })}
                  onSetBotonFechaPreguntada={(fecha) => dispatch({ type: 'SET_BOTON_FECHA_PREGUNTADA', payload: fecha })}
                  onSetUbicacionFechaPreguntada={(fecha) => dispatch({ type: 'SET_UBICACION_FECHA_PREGUNTADA', payload: fecha })}
                  onErrorPanel={setErrorPanel}
                  onLogConsola={agregarLogConsola}
                  pruebasBloqueadas={pruebasBloqueadas}
                  onPruebasCompletadas={async () => {
                    agregarLogConsola('✅ Técnico confirmó pruebas - avanzando a formulario de cierre');
                    
                    // Persistir el avance a cierre en la base de datos
                    if (state.expediente_actual?.id) {
                      const resultado = await marcarAvanceACierre(state.expediente_actual.id);
                      if (resultado.success) {
                        agregarLogConsola('📌 Checkpoint guardado: Documentación final');
                      } else {
                        agregarLogConsola(`⚠️ No se pudo guardar checkpoint: ${resultado.error}`);
                      }
                    }
                    
                    setPruebasCompletadas(true);
                    setPruebasBloqueadas(true);
                    setMostrarFormularioCierre(true);
                  }}
                  onFormularioCierreCompletado={handleFormularioCierreCompletado}
                  onCancelarCierre={() => setMostrarFormularioCierre(false)}
                />
              )}
            </>
          )}
          </div>
        )}
      </div>

      {mostrarConsola && consolaDesbloqueada && consolaMonitoreo.length > 0 && (
        <div className="fixed bottom-4 left-4 max-w-2xl bg-gray-900 border-2 border-gray-700 rounded-lg shadow-2xl p-4 z-50">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-green-400 font-bold text-sm">Consola de Monitoreo</h3>
            <div className="flex gap-2">
              <button
                onClick={limpiarConsola}
                className="text-gray-400 hover:text-gray-200 transition-colors text-xs"
              >
                Limpiar
              </button>
              <button
                onClick={() => setMostrarConsola(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="bg-black p-3 rounded border border-gray-700 max-h-96 overflow-auto">
            <div className="font-mono text-xs space-y-1">
              {consolaMonitoreo.map((log, idx) => (
                <div key={idx} className="text-green-400">{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!mostrarConsola && consolaDesbloqueada && consolaMonitoreo.length > 0 && (
        <button
          onClick={() => setMostrarConsola(true)}
          className="fixed bottom-4 left-4 px-3 py-1.5 bg-gray-800 text-gray-500 rounded text-xs hover:bg-gray-700 transition-colors shadow-lg z-50 border border-gray-700 opacity-30 hover:opacity-100"
        >
          •••
        </button>
      )}

      {!consolaDesbloqueada && (
        <button
          onClick={handleSolicitarPassword}
          className="fixed bottom-4 left-4 px-3 py-1.5 bg-gray-800 text-gray-600 rounded text-xs hover:bg-gray-700 transition-colors shadow-lg z-50 border border-gray-700 opacity-20 hover:opacity-60"
          title="Consola de desarrollo"
        >
          •••
        </button>
      )}

      {mostrarPromptPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Acceso a consola de desarrollo</h3>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleVerificarPassword()}
              placeholder="Contraseña"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCancelarPassword}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleVerificarPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Verificar
              </button>
            </div>
          </div>
        </div>
      )}

      {errorPanel && import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 max-w-2xl bg-red-50 border-2 border-red-500 rounded-lg shadow-2xl p-4 z-50">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-red-800 font-bold text-sm">Error de Backend (Dev)</h3>
            <button
              onClick={() => setErrorPanel('')}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <pre className="text-xs text-red-900 overflow-auto max-h-96 bg-white p-3 rounded border border-red-300">
            {errorPanel}
          </pre>
        </div>
      )}

      {mostrarQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setMostrarQRScanner(false)}
        />
      )}

      {mostrarModalCambioDispositivo && state.esn && state.expediente_actual && (
        <DeviceChangeModal
          currentESN={state.esn}
          workOrderName={state.expediente_actual.work_order_name || ''}
          appointmentName={state.expediente_actual.appointment_name || ''}
          onConfirm={handleCambiarDispositivo}
          onClose={() => setMostrarModalCambioDispositivo(false)}
        />
      )}

      <ConfirmModal
        isOpen={mostrarModalReiniciarServicio}
        onClose={() => setMostrarModalReiniciarServicio(false)}
        onConfirm={async () => {
          setMostrarModalReiniciarServicio(false);
          await handleCerrarServicio();
        }}
        title="Reiniciar servicio"
        message="¿Reiniciar el servicio completo? Esta acción eliminará toda la información y las pruebas realizadas. No se puede deshacer."
        confirmText="Reiniciar"
        cancelText="Cancelar"
        variant="warning"
      />

      {pendingEsnDuplicado && (
        <ConfirmModal
          isOpen={!!pendingEsnDuplicado}
          onClose={() => setPendingEsnDuplicado(null)}
          onConfirm={() => {
            const callback = pendingEsnDuplicado.callback;
            setPendingEsnDuplicado(null);
            callback();
          }}
          title="ESN ya utilizado"
          message={`El ESN "${pendingEsnDuplicado.esn}" ya fue utilizado en: ${pendingEsnDuplicado.woInfo}. ¿Estás seguro de que quieres usar este ESN en el servicio actual?`}
          confirmText="Usar ESN"
          cancelText="Cancelar"
          variant="warning"
        />
      )}

      {pendingCambioDispositivo && (
        <ConfirmModal
          isOpen={!!pendingCambioDispositivo}
          onClose={() => setPendingCambioDispositivo(null)}
          onConfirm={async () => {
            const { nuevoESN, motivo, descripcion } = pendingCambioDispositivo;
            setPendingCambioDispositivo(null);
            await continuarCambioDispositivoConfirmado(nuevoESN, motivo, descripcion);
          }}
          title="ESN ya utilizado"
          message={`El ESN "${pendingCambioDispositivo.nuevoESN}" ya fue utilizado en: ${pendingCambioDispositivo.woInfo}. ¿Estás seguro de que quieres usar este ESN para el cambio de dispositivo?`}
          confirmText="Usar ESN"
          cancelText="Cancelar"
          variant="warning"
        />
      )}
    </div>
  );
}

function ConfigurationError() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Error de Configuración</h1>
        <p className="text-gray-600 mb-4">{supabaseError}</p>
        <p className="text-sm text-gray-500">Contacta al administrador del sistema.</p>
      </div>
    </div>
  );
}

function App() {
  if (!supabaseConfigured) {
    return <ConfigurationError />;
  }

  return (
    <AppRouter>
      <TechnicianApp />
    </AppRouter>
  );
}

export default App;
