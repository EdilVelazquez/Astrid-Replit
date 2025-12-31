import { supabase } from '../supabaseClient';

const STORAGE_BUCKET = 'cierre-photos';

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

async function subirFotoStorage(
  expedienteId: number,
  archivo: File,
  tipo: string
): Promise<string | null> {
  try {
    const extension = archivo.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const nombreArchivo = `${expedienteId}/${tipo}_${timestamp}.${extension}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(nombreArchivo, archivo, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error(`Error al subir foto ${tipo}:`, error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error(`Error inesperado al subir foto ${tipo}:`, err);
    return null;
  }
}

export async function guardarCierreDatosParciales(
  expedienteId: number,
  datos: CierreDatos
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 [CIERRE] Guardando datos parciales de cierre...', { expedienteId, datos });

    const cierreData = {
      expediente_id: expedienteId,
      tipo_corte: datos.tipo_corte,
      nombre_recibe: datos.nombre_recibe,
      firma_url: datos.firma_data_url,
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
  fotosObligatorias: FotoObligatoriaCierre[],
  fotosAdicionales: FotoAdicionalCierre[],
  fotoPersonaRecibe: File | null
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📷 [CIERRE] Subiendo fotos de cierre...', { expedienteId });

    const urlsFotosObligatorias: Record<string, string> = {};
    const urlsFotosAdicionales: Array<{ descripcion: string; urls: string[] }> = [];
    const errores: string[] = [];

    for (const foto of fotosObligatorias) {
      if (foto.file) {
        const url = await subirFotoStorage(expedienteId, foto.file, `obligatoria_${foto.id}`);
        if (url) {
          urlsFotosObligatorias[foto.id] = url;
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
        const url = await subirFotoStorage(
          expedienteId,
          bloque.fotos[j],
          `adicional_${i}_${j}`
        );
        if (url) {
          urlsBloque.push(url);
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
      urlFotoPersona = await subirFotoStorage(expedienteId, fotoPersonaRecibe, 'persona_recibe');
      if (!urlFotoPersona) {
        return { success: false, error: 'Error al subir foto de persona que recibe' };
      }
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
