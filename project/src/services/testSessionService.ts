import { supabase } from '../supabaseClient';

export interface DeviceTestSession {
  id?: number;
  expediente_id: string;
  esn: string | null;
  ignicion_exitosa: boolean;
  boton_exitoso: boolean;
  ubicacion_exitosa: boolean;
  bloqueo_exitoso: boolean;
  desbloqueo_exitoso: boolean;
  buzzer_exitoso: boolean;
  buzzer_off_exitoso: boolean;
  boton_fecha_preguntada: string | null;
  ubicacion_fecha_preguntada: string | null;
  url_ubicacion: string | null;
  intentos_realizados: number;
  session_active: boolean;
  last_query_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export function generarExpedienteId(workOrderName: string | null, appointmentName: string | null): string {
  const wo = workOrderName || 'UNKNOWN';
  const ap = appointmentName || 'UNKNOWN';
  return `${wo}-${ap}`;
}

export async function obtenerSesionPorExpediente(
  expedienteId: string
): Promise<DeviceTestSession | null> {
  try {
    const { data, error } = await supabase
      .from('device_test_sessions')
      .select('*')
      .eq('expediente_id', expedienteId)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo sesión de pruebas:', error);
      return null;
    }

    return data as DeviceTestSession | null;
  } catch (error) {
    console.error('Error inesperado obteniendo sesión:', error);
    return null;
  }
}

export async function crearSesion(
  sesion: Omit<DeviceTestSession, 'id' | 'created_at' | 'updated_at'>
): Promise<DeviceTestSession | null> {
  try {
    const { data, error } = await supabase
      .from('device_test_sessions')
      .insert({
        ...sesion,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando sesión de pruebas:', error);
      return null;
    }

    return data as DeviceTestSession;
  } catch (error) {
    console.error('Error inesperado creando sesión:', error);
    return null;
  }
}

export async function actualizarSesion(
  expedienteId: string,
  updates: Partial<DeviceTestSession>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('device_test_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('expediente_id', expedienteId);

    if (error) {
      console.error('Error actualizando sesión de pruebas:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado actualizando sesión:', error);
    return false;
  }
}

export async function guardarOActualizarSesion(
  sesion: Omit<DeviceTestSession, 'id' | 'created_at' | 'updated_at'>
): Promise<DeviceTestSession | null> {
  try {
    const existente = await obtenerSesionPorExpediente(sesion.expediente_id);

    if (existente) {
      const exito = await actualizarSesion(sesion.expediente_id, sesion);
      if (exito) {
        return { ...existente, ...sesion };
      }
      return null;
    } else {
      return await crearSesion(sesion);
    }
  } catch (error) {
    console.error('Error en guardarOActualizarSesion:', error);
    return null;
  }
}

export async function actualizarIntentosRealizados(
  expedienteId: string,
  intentos: number
): Promise<boolean> {
  return await actualizarSesion(expedienteId, {
    intentos_realizados: intentos,
    last_query_at: new Date().toISOString()
  });
}

export async function actualizarEstadoPrueba(
  expedienteId: string,
  tipoPrueba: 'ignicion' | 'boton' | 'ubicacion' | 'bloqueo' | 'desbloqueo' | 'buzzer' | 'buzzer_off',
  exitoso: boolean,
  fechaPreguntada?: string,
  urlUbicacion?: string
): Promise<boolean> {
  const updates: Partial<DeviceTestSession> = {};

  switch (tipoPrueba) {
    case 'ignicion':
      updates.ignicion_exitosa = exitoso;
      break;
    case 'boton':
      updates.boton_exitoso = exitoso;
      if (fechaPreguntada) {
        updates.boton_fecha_preguntada = fechaPreguntada;
      }
      break;
    case 'ubicacion':
      updates.ubicacion_exitosa = exitoso;
      if (fechaPreguntada) {
        updates.ubicacion_fecha_preguntada = fechaPreguntada;
      }
      if (urlUbicacion) {
        updates.url_ubicacion = urlUbicacion;
      }
      break;
    case 'bloqueo':
      updates.bloqueo_exitoso = exitoso;
      break;
    case 'desbloqueo':
      updates.desbloqueo_exitoso = exitoso;
      break;
    case 'buzzer':
      updates.buzzer_exitoso = exitoso;
      break;
    case 'buzzer_off':
      updates.buzzer_off_exitoso = exitoso;
      break;
  }

  return await actualizarSesion(expedienteId, updates);
}

export async function reiniciarSesion(
  expedienteId: string,
  nuevoESN?: string
): Promise<boolean> {
  const updates: Partial<DeviceTestSession> = {
    ignicion_exitosa: false,
    boton_exitoso: false,
    ubicacion_exitosa: false,
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
  };

  if (nuevoESN) {
    updates.esn = nuevoESN;
  }

  return await actualizarSesion(expedienteId, updates);
}

export async function desactivarSesion(expedienteId: string): Promise<boolean> {
  return await actualizarSesion(expedienteId, {
    session_active: false
  });
}

export async function limpiarSesionesAntiguas(diasInactividad: number = 7): Promise<boolean> {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasInactividad);

    const { error } = await supabase
      .from('device_test_sessions')
      .delete()
      .lt('updated_at', fechaLimite.toISOString());

    if (error) {
      console.error('Error limpiando sesiones antiguas:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado limpiando sesiones:', error);
    return false;
  }
}
