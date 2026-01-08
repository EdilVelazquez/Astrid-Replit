import { supabase } from '../supabaseClient';
import { subirFotoUnificada } from './photoStorageService';

export interface CierreDatos {
  tipo_corte: string;
  nombre_recibe: string;
  firma_data_url: string;
}

export interface FotoObligatoriaCierre {
  id: string;
  label: string;
  file: File;
}

export interface FotoAdicionalCierre {
  descripcion: string;
  fotos: File[];
}

const TIPO_FOTO_MAP: Record<string, { tipo: string; detalle: string }> = {
  'instalacion': { tipo: 'instalacion', detalle: 'equipo' },
  'corriente': { tipo: 'conexion', detalle: 'corriente' },
  'tierra': { tipo: 'conexion', detalle: 'tierra' },
  'ignicion': { tipo: 'conexion', detalle: 'ignicion' },
  'ignicionCorte': { tipo: 'conexion', detalle: 'ignicion_corte' },
  'botonPanico': { tipo: 'boton', detalle: 'panico' },
};

function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function guardarCierreDatosParciales(
  expedienteId: number,
  appointmentName: string,
  datos: CierreDatos
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 [CIERRE] Guardando datos parciales de cierre...', { expedienteId, appointmentName, datos });

    let firmaUrl = datos.firma_data_url;
    
    if (datos.firma_data_url && datos.firma_data_url.startsWith('data:')) {
      const blob = dataURLtoBlob(datos.firma_data_url);
      const file = new File([blob], 'firma.png', { type: 'image/png' });
      
      const result = await subirFotoUnificada(
        appointmentName,
        file,
        'firma',
        'cliente'
      );
      
      if (result.success && result.publicUrl) {
        firmaUrl = result.publicUrl;
        console.log('✅ [CIERRE] Firma subida al storage:', firmaUrl);
      } else {
        console.warn('⚠️ [CIERRE] No se pudo subir la firma al storage, guardando como data URL');
      }
    }

    const cierreData = {
      expediente_id: expedienteId,
      tipo_corte: datos.tipo_corte,
      nombre_recibe: datos.nombre_recibe,
      firma_url: firmaUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('cierre_data')
      .upsert(cierreData, { onConflict: 'expediente_id' });

    if (error) {
      console.error('❌ [CIERRE] Error al guardar datos parciales:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [CIERRE] Datos parciales guardados');
    return { success: true };
  } catch (err) {
    console.error('❌ [CIERRE] Error inesperado:', err);
    return { success: false, error: 'Error inesperado al guardar datos' };
  }
}

export async function marcarCierreCompletado(
  expedienteId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('✅ [CIERRE] Marcando cierre como completado...', { expedienteId });

    const { error: cierreError } = await supabase
      .from('cierre_data')
      .upsert({
        expediente_id: expedienteId,
        completado: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'expediente_id' });

    if (cierreError) {
      console.error('❌ [CIERRE] Error al marcar cierre_data completado:', cierreError);
      return { success: false, error: cierreError.message };
    }

    const { error: expedienteError } = await supabase
      .from('expedientes_servicio')
      .update({
        cierre_realizado: true,
        validation_final_status: 'COMPLETADO',
        validation_end_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', expedienteId);

    if (expedienteError) {
      console.warn('⚠️ [CIERRE] Error al actualizar expedientes_servicio (puede no tener las columnas):', expedienteError);
    }

    console.log('✅ [CIERRE] Cierre completado exitosamente');
    return { success: true };
  } catch (err) {
    console.error('❌ [CIERRE] Error inesperado:', err);
    return { success: false, error: 'Error inesperado al marcar completado' };
  }
}

export async function guardarCierreFotos(
  expedienteId: number,
  appointmentName: string,
  fotosObligatorias: FotoObligatoriaCierre[],
  fotosAdicionales: FotoAdicionalCierre[],
  fotoPersonaRecibe: File | null
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📷 [CIERRE] Subiendo fotos de cierre...', { expedienteId, appointmentName });

    const urlsFotosObligatorias: Record<string, string> = {};
    const urlsFotosAdicionales: Array<{ descripcion: string; urls: string[] }> = [];
    const errores: string[] = [];

    for (const foto of fotosObligatorias) {
      if (foto.file) {
        const mapping = TIPO_FOTO_MAP[foto.id] || { tipo: foto.id, detalle: '' };
        const result = await subirFotoUnificada(
          appointmentName,
          foto.file,
          mapping.tipo,
          mapping.detalle
        );
        if (result.success && result.publicUrl) {
          urlsFotosObligatorias[foto.id] = result.publicUrl;
        } else {
          errores.push(`Error al subir foto: ${foto.label}`);
        }
      }
    }

    if (errores.length > 0) {
      return { success: false, error: errores.join(', ') };
    }

    for (let i = 0; i < fotosAdicionales.length; i++) {
      const bloque = fotosAdicionales[i];
      const urlsBloque: string[] = [];

      for (let j = 0; j < bloque.fotos.length; j++) {
        const result = await subirFotoUnificada(
          appointmentName,
          bloque.fotos[j],
          'adicional',
          `${bloque.descripcion.toLowerCase().replace(/\s+/g, '_')}_${j + 1}`
        );
        if (result.success && result.publicUrl) {
          urlsBloque.push(result.publicUrl);
        } else {
          errores.push(`Error al subir foto adicional ${i + 1}-${j + 1}`);
        }
      }

      if (urlsBloque.length > 0) {
        urlsFotosAdicionales.push({
          descripcion: bloque.descripcion,
          urls: urlsBloque,
        });
      }
    }

    if (errores.length > 0) {
      return { success: false, error: errores.join(', ') };
    }

    let urlFotoPersona: string | null = null;
    if (fotoPersonaRecibe) {
      const result = await subirFotoUnificada(
        appointmentName,
        fotoPersonaRecibe,
        'receptor',
        'cliente_foto'
      );
      if (!result.success || !result.publicUrl) {
        return { success: false, error: 'Error al subir foto de persona que recibe' };
      }
      urlFotoPersona = result.publicUrl;
    }

    const updates: Record<string, any> = {
      expediente_id: expedienteId,
      fotos_obligatorias: urlsFotosObligatorias,
      fotos_adicionales: urlsFotosAdicionales,
      updated_at: new Date().toISOString(),
    };

    if (urlFotoPersona) {
      updates.foto_persona_recibe = urlFotoPersona;
    }

    const { error } = await supabase
      .from('cierre_data')
      .upsert(updates, { onConflict: 'expediente_id' });

    if (error) {
      console.error('❌ [CIERRE] Error al guardar URLs de fotos:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [CIERRE] Fotos subidas y guardadas exitosamente');
    return { success: true };
  } catch (err) {
    console.error('❌ [CIERRE] Error inesperado al subir fotos:', err);
    return { success: false, error: 'Error inesperado al subir fotos' };
  }
}

export interface CierreDataRecord {
  id: number;
  expediente_id: number;
  tipo_corte: string | null;
  nombre_recibe: string | null;
  firma_url: string | null;
  fotos_obligatorias: Record<string, string> | null;
  fotos_adicionales: Array<{ descripcion: string; urls: string[] }> | null;
  foto_persona_recibe: string | null;
  completado: boolean;
  created_at: string;
  updated_at: string;
}

export async function obtenerDatosCierre(
  expedienteId: number
): Promise<CierreDataRecord | null> {
  try {
    console.log('🔍 [CIERRE] Buscando datos de cierre para expediente:', expedienteId);
    
    const { data, error } = await supabase
      .from('cierre_data')
      .select('*')
      .eq('expediente_id', expedienteId)
      .maybeSingle();

    if (error) {
      console.error('❌ [CIERRE] Error al obtener datos de cierre:', error);
      return null;
    }

    console.log('🔍 [CIERRE] Datos encontrados:', data ? 'SÍ' : 'NO', data);
    return data as CierreDataRecord | null;
  } catch (err) {
    console.error('❌ [CIERRE] Error inesperado al obtener datos de cierre:', err);
    return null;
  }
}

/**
 * Marca que el servicio avanzó a la etapa de Documentación final.
 * Crea un registro inicial en cierre_data para persistir el checkpoint.
 * Esto permite restaurar correctamente el estado al reanudar el servicio.
 */
export async function marcarAvanceACierre(
  expedienteId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📌 [CIERRE] Marcando avance a etapa de cierre...', { expedienteId });

    // Verificar si ya existe un registro
    const { data: existente } = await supabase
      .from('cierre_data')
      .select('id')
      .eq('expediente_id', expedienteId)
      .maybeSingle();

    if (existente) {
      console.log('✅ [CIERRE] Ya existe registro de cierre, no se crea nuevo');
      return { success: true };
    }

    // Crear registro inicial
    const { error } = await supabase
      .from('cierre_data')
      .insert({
        expediente_id: expedienteId,
        completado: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ [CIERRE] Error al crear registro inicial:', error);
      return { success: false, error: error.message };
    }

    // También actualizar expedientes_servicio para marcar que las pruebas fueron completadas
    const { error: expError } = await supabase
      .from('expedientes_servicio')
      .update({
        pruebas_completadas: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expedienteId);

    if (expError) {
      console.warn('⚠️ [CIERRE] No se pudo actualizar pruebas_completadas en expedientes_servicio:', expError);
      // No fallar por esto, el registro en cierre_data es suficiente
    }

    console.log('✅ [CIERRE] Avance a etapa de cierre marcado exitosamente');
    return { success: true };
  } catch (err) {
    console.error('❌ [CIERRE] Error inesperado:', err);
    return { success: false, error: 'Error inesperado al marcar avance' };
  }
}

/**
 * Elimina los datos de cierre de un expediente (usado al cambiar dispositivo)
 * Esto invalida el checkpoint de Documentación final
 */
export async function eliminarDatosCierre(expedienteId: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ [CIERRE] Eliminando datos de cierre para expediente:', expedienteId);
    
    const { error } = await supabase
      .from('cierre_data')
      .delete()
      .eq('expediente_id', expedienteId);
    
    if (error) {
      console.error('❌ [CIERRE] Error al eliminar datos de cierre:', error);
      return { success: false, error: error.message };
    }
    
    // También resetear flag de pruebas completadas en expedientes_servicio
    const { error: expError } = await supabase
      .from('expedientes_servicio')
      .update({
        pruebas_completadas: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expedienteId);
    
    if (expError) {
      console.warn('⚠️ [CIERRE] No se pudo resetear pruebas_completadas:', expError);
    }
    
    console.log('✅ [CIERRE] Datos de cierre eliminados exitosamente');
    return { success: true };
  } catch (err) {
    console.error('❌ [CIERRE] Error inesperado al eliminar datos de cierre:', err);
    return { success: false, error: 'Error inesperado' };
  }
}
