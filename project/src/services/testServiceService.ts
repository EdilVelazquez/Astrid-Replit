import { supabase } from '../supabaseClient';

/**
 * Limpia datos relacionados del servicio de prueba en tablas secundarias
 * Esta función limpia manualmente para asegurar reset total
 */
async function limpiarDatosRelacionados(serviceId: number, workOrderName: string, appointmentName: string): Promise<void> {
  console.log(`🧹 [TEST SERVICE] Limpiando datos relacionados del servicio ${serviceId}...`);
  
  // Construir el ID de expediente como se usa en device_test_sessions
  const expedienteIdStr = `${workOrderName}-${appointmentName}`;
  
  // 1. Limpiar cierre_data
  const { error: errCierre } = await supabase
    .from('cierre_data')
    .delete()
    .eq('expediente_id', serviceId);
  if (errCierre) console.log('⚠️ [TEST SERVICE] Error limpiando cierre_data:', errCierre.message);
  else console.log('✅ [TEST SERVICE] cierre_data limpiada');
  
  // 2. Limpiar prefolio_data
  const { error: errPrefolio } = await supabase
    .from('prefolio_data')
    .delete()
    .eq('expediente_id', serviceId);
  if (errPrefolio) console.log('⚠️ [TEST SERVICE] Error limpiando prefolio_data:', errPrefolio.message);
  else console.log('✅ [TEST SERVICE] prefolio_data limpiada');
  
  // 3. Limpiar device_test_sessions (usa string como ID)
  const { error: errSessions } = await supabase
    .from('device_test_sessions')
    .delete()
    .eq('expediente_id', expedienteIdStr);
  if (errSessions) console.log('⚠️ [TEST SERVICE] Error limpiando device_test_sessions:', errSessions.message);
  else console.log('✅ [TEST SERVICE] device_test_sessions limpiada');
  
  // 4. Limpiar webhook_logs
  const { error: errWebhook } = await supabase
    .from('webhook_logs')
    .delete()
    .eq('expediente_id', serviceId);
  if (errWebhook) console.log('⚠️ [TEST SERVICE] Error limpiando webhook_logs:', errWebhook.message);
  else console.log('✅ [TEST SERVICE] webhook_logs limpiada');
  
  console.log('🧹 [TEST SERVICE] Limpieza de datos relacionados completada');
}

/**
 * Reinicia un servicio de prueba a su estado inicial COMPLETO
 * Solo funciona con servicios marcados como is_test_service = true
 * Limpia: check-in, prefolio, pruebas, cierre, fotos, webhooks
 */
export async function reiniciarServicioDePruebas(serviceId: number): Promise<boolean> {
  try {
    console.log(`🔄 [TEST SERVICE] Reiniciando servicio de pruebas ID: ${serviceId}`);

    // Primero, obtener datos del servicio para limpiar tablas relacionadas
    const { data: servicio, error: errServicio } = await supabase
      .from('expedientes_servicio')
      .select('work_order_name, appointment_name')
      .eq('id', serviceId)
      .single();
    
    if (errServicio || !servicio) {
      console.error('❌ [TEST SERVICE] Error obteniendo datos del servicio:', errServicio);
      return false;
    }
    
    // Limpiar datos relacionados manualmente (respaldo si la función RPC no lo hace)
    await limpiarDatosRelacionados(serviceId, servicio.work_order_name, servicio.appointment_name);

    // Llamar a la función RPC para reiniciar el servicio principal
    const { data, error } = await supabase.rpc('reset_test_service', {
      service_id: serviceId
    });

    if (error) {
      console.error('❌ [TEST SERVICE] Error en RPC reset_test_service:', error);
      // Intentar actualización manual como fallback
      console.log('🔄 [TEST SERVICE] Intentando reset manual...');
      return await resetManualServicioDePruebas(serviceId);
    }

    console.log('✅ [TEST SERVICE] Servicio de pruebas reiniciado exitosamente');
    return data === true;
  } catch (error) {
    console.error('❌ [TEST SERVICE] Error inesperado:', error);
    return false;
  }
}

/**
 * Reset manual del servicio si la función RPC falla
 */
async function resetManualServicioDePruebas(serviceId: number): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('expedientes_servicio')
      .update({
        // Reiniciar check-in
        check_in_timestamp: null,
        check_in_latitude: null,
        check_in_longitude: null,
        check_in_distance: null,
        
        // Reiniciar datos del vehículo
        asset_name: 'PRUEBA',
        asset_economico: null,
        asset_submarca: null,
        asset_marca: null,
        asset_vin: null,
        asset_placas: null,
        asset_color: null,
        device_esn: null,
        vehicle_license_plate: null,
        vehicle_vin: null,
        vehicle_brand: null,
        vehicle_model: null,
        vehicle_year: null,
        vehicle_color: null,
        vehicle_odometer: null,
        
        // Reiniciar validación
        validation_start_timestamp: null,
        validation_end_timestamp: null,
        validation_summary_json: null,
        validation_final_status: null,
        
        // Reiniciar estado
        status: 'Pendiente',
        prefolio_realizado: false,
        notes_terminate: null,
        
        // Actualizar fechas
        scheduled_start_time: `${today}T08:00:00`,
        scheduled_end_time: `${today}T17:00:00`,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId)
      .eq('is_test_service', true);
    
    if (error) {
      console.error('❌ [TEST SERVICE] Error en reset manual:', error);
      return false;
    }
    
    console.log('✅ [TEST SERVICE] Reset manual completado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ [TEST SERVICE] Error inesperado en reset manual:', error);
    return false;
  }
}

/**
 * Verifica si un expediente es un servicio de pruebas
 */
export function esServicioDePruebas(expediente: any): boolean {
  return expediente?.is_test_service === true;
}

/**
 * Obtiene el ID del servicio de pruebas para un usuario específico
 */
export async function obtenerServicioDePruebas(email: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('expedientes_servicio')
      .select('id')
      .eq('email_tecnico', email)
      .eq('is_test_service', true)
      .maybeSingle();

    if (error) {
      console.error('Error al buscar servicio de pruebas:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error inesperado al buscar servicio de pruebas:', error);
    return null;
  }
}
