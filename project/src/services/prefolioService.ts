import { supabase } from '../supabaseClient';
import { PrefolioDatos, PrefolioFoto } from '../types';
import { subirFotoUnificada, STORAGE_BUCKET } from './photoStorageService';

const PHOTO_FIELD_NAMES = {
  VEHICULO_FRENTE: 'foto_vehiculo_frente',
  VEHICULO_COSTADO_IZQ: 'foto_vehiculo_costado_izquierdo',
  VEHICULO_COSTADO_DER: 'foto_vehiculo_costado_derecho',
  VEHICULO_TRASERA: 'foto_vehiculo_trasera',
  ODOMETRO: 'foto_odometro',
  VIN: 'foto_vin',
  PLACAS: 'foto_placas',
  TABLERO: 'foto_tablero',
} as const;

export async function guardarPrefolioDatos(
  expedienteId: number,
  datos: PrefolioDatos
): Promise<boolean> {
  try {
    if (!expedienteId || typeof expedienteId !== 'number') {
      console.error('❌ Invalid expediente ID:', expedienteId);
      return false;
    }

    const updates: any = {
      prefolio_realizado: datos.prefolio_realizado,
      updated_at: new Date().toISOString(),
    };

    if (datos.asset_marca !== undefined) {
      updates.asset_marca = datos.asset_marca;
    }
    if (datos.asset_submarca !== undefined) {
      updates.asset_submarca = datos.asset_submarca;
    }
    if (datos.asset_vin !== undefined) {
      updates.asset_vin = datos.asset_vin;
    }
    if (datos.vehicle_odometer !== undefined) {
      updates.vehicle_odometer = datos.vehicle_odometer;
    }
    if (datos.asset_placas !== undefined) {
      updates.asset_placas = datos.asset_placas;
    }
    if (datos.asset_color !== undefined) {
      updates.asset_color = datos.asset_color;
    }
    if (datos.asset_economico !== undefined) {
      updates.asset_economico = datos.asset_economico;
    }
    if (datos.vehicle_year !== undefined) {
      updates.vehicle_year = datos.vehicle_year;
    }
    if (datos.service_type !== undefined) {
      updates.service_type = datos.service_type;
    }
    if (datos.prefolio_modelo_dispositivo !== undefined) {
      updates.prefolio_modelo_dispositivo = datos.prefolio_modelo_dispositivo;
    }
    if (datos.device_esn !== undefined) {
      updates.device_esn = datos.device_esn;
    }
    if (datos.prefolio_imei_dispositivo !== undefined) {
      updates.prefolio_imei_dispositivo = datos.prefolio_imei_dispositivo;
    }
    if (datos.prefolio_telefono_sim !== undefined) {
      updates.prefolio_telefono_sim = datos.prefolio_telefono_sim;
    }

    console.log('📝 Guardando datos del prefolio...', { expedienteId, updates });

    const { data, error } = await supabase
      .from('expedientes_servicio')
      .update(updates)
      .eq('id', expedienteId)
      .select();

    if (error) {
      console.error('❌ Error guardando datos de prefolio:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated for expediente ID:', expedienteId);
      return false;
    }

    console.log('✅ Datos del prefolio guardados correctamente');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error in guardarPrefolioDatos:', error);
    return false;
  }
}

export async function subirFotoPrefolio(
  expedienteId: number,
  appointmentName: string,
  campo: string,
  file: File
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    console.log('📸 Subiendo foto:', {
      expedienteId,
      appointmentName,
      campo,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const tipoMap: Record<string, { tipo: string; detalle: string }> = {
      'foto_vehiculo_frente': { tipo: 'vehiculo', detalle: 'frente' },
      'foto_vehiculo_costado_izquierdo': { tipo: 'vehiculo', detalle: 'costado_izq' },
      'foto_vehiculo_costado_derecho': { tipo: 'vehiculo', detalle: 'costado_der' },
      'foto_vehiculo_trasera': { tipo: 'vehiculo', detalle: 'trasera' },
      'foto_odometro': { tipo: 'odometro', detalle: 'lectura' },
      'foto_vin': { tipo: 'vin', detalle: 'ocr' },
      'foto_placas': { tipo: 'placas', detalle: 'ocr' },
      'foto_tablero': { tipo: 'tablero', detalle: 'vista' },
    };

    const mapping = tipoMap[campo] || { tipo: campo, detalle: '' };
    
    const result = await subirFotoUnificada(
      appointmentName,
      file,
      mapping.tipo,
      mapping.detalle
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    console.log('💾 Guardando metadata en base de datos...');

    const { data: insertData, error: dbError } = await supabase
      .from('prefolio_fotos')
      .insert({
        expediente_id: expedienteId,
        campo,
        file_path: result.filePath,
      })
      .select();

    if (dbError) {
      console.error('❌ Error saving photo metadata:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code,
      });

      if (result.filePath) {
        console.log('🗑️ Eliminando archivo del storage debido al error...');
        await supabase.storage.from(STORAGE_BUCKET).remove([result.filePath]);
      }

      return { success: false, error: dbError.message };
    }

    console.log('✅ Metadata guardada correctamente:', insertData);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('❌ Unexpected error in subirFotoPrefolio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

interface FotoAdicionalParaSubir {
  descripcion: string;
  fotos: File[];
}

export async function guardarPrefolioFotos(
  expedienteId: number,
  appointmentName: string,
  fotosVehiculo: File[],
  fotoOdometro: File | null,
  fotoVin: File | null,
  fotoPlacas: File | null,
  fotoTablero: File | null,
  fotosAdicionales: FotoAdicionalParaSubir[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📸 Iniciando guardado de todas las fotos:', {
      expedienteId,
      appointmentName,
      numFotosVehiculo: fotosVehiculo.length,
      tieneFotoOdometro: !!fotoOdometro,
      tieneFotoVin: !!fotoVin,
      tieneFotoPlacas: !!fotoPlacas,
      tieneFotoTablero: !!fotoTablero,
      numBloquesAdicionales: fotosAdicionales.length,
    });

    const uploadResults: Array<{ success: boolean; campo: string; error?: string }> = [];

    const vehiclePhotoFields = [
      PHOTO_FIELD_NAMES.VEHICULO_FRENTE,
      PHOTO_FIELD_NAMES.VEHICULO_COSTADO_IZQ,
      PHOTO_FIELD_NAMES.VEHICULO_COSTADO_DER,
      PHOTO_FIELD_NAMES.VEHICULO_TRASERA,
    ];

    for (let i = 0; i < fotosVehiculo.length && i < vehiclePhotoFields.length; i++) {
      const campo = vehiclePhotoFields[i];
      console.log(`📸 Subiendo foto ${i + 1}/${fotosVehiculo.length}: ${campo}`);
      const result = await subirFotoPrefolio(expedienteId, appointmentName, campo, fotosVehiculo[i]);
      uploadResults.push({ success: result.success, campo, error: result.error });

      if (!result.success) {
        console.error(`❌ Error subiendo ${campo}:`, result.error);
      }
    }

    if (fotoOdometro) {
      console.log('📸 Subiendo foto del odómetro...');
      const result = await subirFotoPrefolio(
        expedienteId,
        appointmentName,
        PHOTO_FIELD_NAMES.ODOMETRO,
        fotoOdometro
      );
      uploadResults.push({
        success: result.success,
        campo: PHOTO_FIELD_NAMES.ODOMETRO,
        error: result.error,
      });

      if (!result.success) {
        console.error('❌ Error subiendo foto del odómetro:', result.error);
      }
    }

    if (fotoVin) {
      console.log('📸 Subiendo foto del VIN...');
      const result = await subirFotoPrefolio(
        expedienteId,
        appointmentName,
        PHOTO_FIELD_NAMES.VIN,
        fotoVin
      );
      uploadResults.push({
        success: result.success,
        campo: PHOTO_FIELD_NAMES.VIN,
        error: result.error,
      });

      if (!result.success) {
        console.error('❌ Error subiendo foto del VIN:', result.error);
      }
    }

    if (fotoPlacas) {
      console.log('📸 Subiendo foto de las placas...');
      const result = await subirFotoPrefolio(
        expedienteId,
        appointmentName,
        PHOTO_FIELD_NAMES.PLACAS,
        fotoPlacas
      );
      uploadResults.push({
        success: result.success,
        campo: PHOTO_FIELD_NAMES.PLACAS,
        error: result.error,
      });

      if (!result.success) {
        console.error('❌ Error subiendo foto de las placas:', result.error);
      }
    }

    if (fotoTablero) {
      console.log('📸 Subiendo foto del tablero...');
      const result = await subirFotoPrefolio(
        expedienteId,
        appointmentName,
        PHOTO_FIELD_NAMES.TABLERO,
        fotoTablero
      );
      uploadResults.push({
        success: result.success,
        campo: PHOTO_FIELD_NAMES.TABLERO,
        error: result.error,
      });

      if (!result.success) {
        console.error('❌ Error subiendo foto del tablero:', result.error);
      }
    }

    if (fotosAdicionales.length > 0) {
      console.log(`📸 Subiendo ${fotosAdicionales.length} bloques de fotos adicionales...`);
      
      for (let bloqueIndex = 0; bloqueIndex < fotosAdicionales.length; bloqueIndex++) {
        const bloque = fotosAdicionales[bloqueIndex];
        const descripcionNormalizada = bloque.descripcion
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .substring(0, 30) || `adicional_${bloqueIndex + 1}`;
        
        for (let fotoIndex = 0; fotoIndex < bloque.fotos.length; fotoIndex++) {
          const campoAdicional = `prefolio_adicional_${descripcionNormalizada}_${fotoIndex + 1}`;
          console.log(`📸 Subiendo foto adicional: ${campoAdicional}`);
          
          const result = await subirFotoPrefolio(
            expedienteId,
            appointmentName,
            campoAdicional,
            bloque.fotos[fotoIndex]
          );
          
          uploadResults.push({
            success: result.success,
            campo: campoAdicional,
            error: result.error,
          });
          
          if (!result.success) {
            console.error(`❌ Error subiendo foto adicional ${campoAdicional}:`, result.error);
          }
        }
      }
    }

    const failedUploads = uploadResults.filter((r) => !r.success);
    if (failedUploads.length > 0) {
      const errorMessages = failedUploads
        .map((f) => `${f.campo}: ${f.error}`)
        .join(', ');
      console.error('❌ Errores al subir fotos:', errorMessages);
      return { success: false, error: `Errores al subir fotos: ${errorMessages}` };
    }

    console.log('✅ Todas las fotos se subieron correctamente');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error in guardarPrefolioFotos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export async function obtenerFotosPrefolio(
  expedienteId: number
): Promise<PrefolioFoto[]> {
  try {
    const { data, error } = await supabase
      .from('prefolio_fotos')
      .select('*')
      .eq('expediente_id', expedienteId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo fotos de prefolio:', error);
      return [];
    }

    return (data as PrefolioFoto[]) || [];
  } catch (error) {
    console.error('❌ Unexpected error in obtenerFotosPrefolio:', error);
    return [];
  }
}

export async function obtenerUrlFotoPrefolio(filePath: string): Promise<string | null> {
  try {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data?.publicUrl || null;
  } catch (error) {
    console.error('❌ Error obteniendo URL de foto:', error);
    return null;
  }
}

export async function eliminarFotoPrefolio(
  fotoId: number,
  filePath: string
): Promise<boolean> {
  try {
    const { error: dbError } = await supabase
      .from('prefolio_fotos')
      .delete()
      .eq('id', fotoId);

    if (dbError) {
      console.error('❌ Error eliminando metadata de foto:', dbError);
      return false;
    }

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.error('❌ Error eliminando archivo de storage:', storageError);
    }

    return true;
  } catch (error) {
    console.error('❌ Unexpected error in eliminarFotoPrefolio:', error);
    return false;
  }
}

export async function eliminarPrefolioCompleto(
  expedienteId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Eliminando prefolio completo del expediente:', expedienteId);

    const fotos = await obtenerFotosPrefolio(expedienteId);

    if (fotos.length > 0) {
      console.log(`🗑️ Eliminando ${fotos.length} archivos de storage...`);
      const filePaths = fotos.map((foto) => foto.file_path);

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filePaths);

      if (storageError) {
        console.error('❌ Error eliminando archivos de storage:', storageError);
      } else {
        console.log('✅ Archivos eliminados del storage');
      }
    }

    console.log('🗑️ Eliminando registros de fotos de la base de datos...');
    const { error: dbError } = await supabase
      .from('prefolio_fotos')
      .delete()
      .eq('expediente_id', expedienteId);

    if (dbError) {
      console.error('❌ Error eliminando fotos de la base de datos:', dbError);
      return { success: false, error: dbError.message };
    }

    console.log('🗑️ Reiniciando pruebas pasivas (eliminando sesión de pruebas)...');
    const { data: expediente, error: fetchError } = await supabase
      .from('expedientes_servicio')
      .select('work_order_name, appointment_name')
      .eq('id', expedienteId)
      .single();

    if (fetchError) {
      console.error('❌ Error obteniendo datos del expediente:', fetchError);
    } else if (expediente) {
      const expedienteIdComposite = `${expediente.work_order_name}-${expediente.appointment_name}`;

      const { error: sessionDeleteError } = await supabase
        .from('device_test_sessions')
        .delete()
        .eq('expediente_id', expedienteIdComposite);

      if (sessionDeleteError) {
        console.error('❌ Error eliminando sesión de pruebas pasivas:', sessionDeleteError);
      } else {
        console.log('✅ Sesión de pruebas pasivas eliminada correctamente');
      }
    }

    console.log('🗑️ Limpiando datos del prefolio en expediente...');
    const { error: updateError } = await supabase
      .from('expedientes_servicio')
      .update({
        prefolio_realizado: false,
        prefolio_vehiculo_texto: null,
        vehicle_numero_economico: null,
        prefolio_modelo_dispositivo: null,
        prefolio_imei_dispositivo: null,
        prefolio_telefono_sim: null,
        device_esn: null,
        zoho_inventory_id: null,
        validation_start_timestamp: null,
        validation_final_status: null,
        status: 'Pendiente',
        updated_at: new Date().toISOString(),
      })
      .eq('id', expedienteId);

    if (updateError) {
      console.error('❌ Error actualizando expediente:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ Prefolio eliminado completamente y pruebas pasivas reiniciadas');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error in eliminarPrefolioCompleto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
