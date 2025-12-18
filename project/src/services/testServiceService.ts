import { supabase } from '../supabaseClient';

/**
 * Reinicia un servicio de prueba a su estado inicial
 * Solo funciona con servicios marcados como is_test_service = true
 */
export async function reiniciarServicioDePruebas(serviceId: number): Promise<boolean> {
  try {
    console.log(`🔄 [TEST SERVICE] Reiniciando servicio de pruebas ID: ${serviceId}`);

    const { data, error } = await supabase.rpc('reset_test_service', {
      service_id: serviceId
    });

    if (error) {
      console.error('❌ [TEST SERVICE] Error al reiniciar servicio:', error);
      return false;
    }

    console.log('✅ [TEST SERVICE] Servicio de pruebas reiniciado exitosamente');
    return data === true;
  } catch (error) {
    console.error('❌ [TEST SERVICE] Error inesperado:', error);
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
