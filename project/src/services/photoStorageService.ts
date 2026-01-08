import { supabase } from '../supabaseClient';

const STORAGE_BUCKET = 'prefolio-photos';

export function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

export function sanitizeServiceId(appointmentName: string): string {
  return appointmentName
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

export function buildPhotoPath(
  appointmentName: string,
  tipo: string,
  detalle?: string
): string {
  const serviceId = sanitizeServiceId(appointmentName || 'unknown');
  const timestamp = formatTimestamp();
  const extension = 'jpg';
  
  const detalleClean = detalle ? `_${sanitizeFileName(detalle)}` : '';
  const fileName = `${serviceId}_${tipo}${detalleClean}_${timestamp}.${extension}`;
  
  return `servicios/${serviceId}/${fileName}`;
}

export async function subirFotoUnificada(
  appointmentName: string,
  archivo: File,
  tipo: string,
  detalle?: string
): Promise<{ success: boolean; filePath?: string; publicUrl?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        error: 'Usuario no autenticado. Por favor inicia sesión nuevamente.',
      };
    }

    const filePath = buildPhotoPath(appointmentName, tipo, detalle);
    
    console.log(`📤 Subiendo foto: ${filePath}`);

    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, archivo, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error al subir foto:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    console.log(`✅ Foto subida: ${filePath}`);
    
    return {
      success: true,
      filePath: data.path,
      publicUrl: urlData.publicUrl,
    };
  } catch (err) {
    console.error('❌ Error inesperado al subir foto:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
  }
}

export async function eliminarFotosServicio(
  appointmentName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const folderPath = `servicios/${appointmentName}`;
    
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folderPath);

    if (listError) {
      console.error('❌ Error listando archivos:', listError);
      return { success: false, error: listError.message };
    }

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${folderPath}/${f.name}`);
      
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filePaths);

      if (removeError) {
        console.error('❌ Error eliminando archivos:', removeError);
        return { success: false, error: removeError.message };
      }
      
      console.log(`✅ Eliminados ${files.length} archivos de ${folderPath}`);
    }

    return { success: true };
  } catch (err) {
    console.error('❌ Error inesperado al eliminar fotos:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
  }
}

export { STORAGE_BUCKET };
