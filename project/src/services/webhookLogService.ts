import { supabase } from '../supabaseClient';

export interface WebhookLogEntry {
  id?: number;
  expediente_id: number;
  appointment_name: string;
  timestamp: string;
  action: string;
  webhook_url: string;
  payload_summary: string;
  success: boolean;
  error_message?: string;
  response_status?: number;
  duration_ms?: number;
}

const WEBHOOK_LOGS_TABLE = 'webhook_logs';

export async function registrarEnvioWebhook(entry: Omit<WebhookLogEntry, 'id'>): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 [WEBHOOK LOG] Registrando envío:', {
      action: entry.action,
      success: entry.success,
      timestamp: entry.timestamp
    });

    const { error } = await supabase
      .from(WEBHOOK_LOGS_TABLE)
      .insert({
        expediente_id: entry.expediente_id,
        appointment_name: entry.appointment_name,
        timestamp: entry.timestamp,
        action: entry.action,
        webhook_url: entry.webhook_url,
        payload_summary: entry.payload_summary,
        success: entry.success,
        error_message: entry.error_message || null,
        response_status: entry.response_status || null,
        duration_ms: entry.duration_ms || null
      });

    if (error) {
      console.error('❌ [WEBHOOK LOG] Error guardando log:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [WEBHOOK LOG] Log guardado correctamente');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ [WEBHOOK LOG] Error inesperado:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function obtenerLogsWebhook(expedienteId: number): Promise<WebhookLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from(WEBHOOK_LOGS_TABLE)
      .select('*')
      .eq('expediente_id', expedienteId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('❌ [WEBHOOK LOG] Error obteniendo logs:', error);
      return [];
    }

    return (data as WebhookLogEntry[]) || [];
  } catch (error) {
    console.error('❌ [WEBHOOK LOG] Error inesperado obteniendo logs:', error);
    return [];
  }
}

export async function obtenerLogsWebhookPorAppointment(appointmentName: string): Promise<WebhookLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from(WEBHOOK_LOGS_TABLE)
      .select('*')
      .eq('appointment_name', appointmentName)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('❌ [WEBHOOK LOG] Error obteniendo logs por appointment:', error);
      return [];
    }

    return (data as WebhookLogEntry[]) || [];
  } catch (error) {
    console.error('❌ [WEBHOOK LOG] Error inesperado obteniendo logs:', error);
    return [];
  }
}

export function formatearTimestamp(isoString: string): string {
  const fecha = new Date(isoString);
  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'start_work': 'Inicio de Trabajo',
    'complete_work': 'Trabajo Completado',
    'create_asset': 'Crear Asset (VIN nuevo)',
    'edit_asset': 'Editar Asset',
    'terminate': 'Vuelta en Falso'
  };
  return labels[action] || action;
}

export function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    'start_work': 'bg-blue-100 text-blue-800 border-blue-200',
    'complete_work': 'bg-green-100 text-green-800 border-green-200',
    'create_asset': 'bg-purple-100 text-purple-800 border-purple-200',
    'edit_asset': 'bg-amber-100 text-amber-800 border-amber-200',
    'terminate': 'bg-red-100 text-red-800 border-red-200'
  };
  return colors[action] || 'bg-gray-100 text-gray-800 border-gray-200';
}
