import { registrarEnvioWebhook } from './webhookLogService';

const TRANSITION_WEBHOOK_URL = 'https://aiwebhookn8n.numaris.com/webhook/c8cb35f5-2567-4584-b7f1-319fdf830443';
// Webhook version: 2.0 - Unified endpoint for service transitions

export interface TransitionWebhookParams {
  action: 'start_work' | 'complete_work' | 'create_asset' | 'edit_asset' | 'terminate';
  appointment_name?: string;
  work_order_name?: string;
  esn?: string;
  technician_email?: string;
  company_Id?: string;
  expediente_id?: number;
  notes_terminate?: string;
  onLogConsola?: (msg: string) => void;
  asset_data?: {
    vin?: string;
    vin_original?: string;
    placas?: string;
    color?: string;
    marca?: string;
    modelo?: string;
    año?: string;
    numero_economico?: string;
    odometro?: string;
  };
}

export interface TransitionWebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Envía notificación de transición de servicio a n8n
 * @param params Parámetros de la transición
 * @returns Respuesta del webhook
 */
const getActionEmoji = (action: string): string => {
  switch (action) {
    case 'start_work': return '🚀';
    case 'complete_work': return '✅';
    case 'create_asset': return '➕';
    case 'edit_asset': return '✏️';
    case 'terminate': return '🛑';
    default: return '📤';
  }
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'start_work': return 'Inicio de trabajo';
    case 'complete_work': return 'Trabajo completado';
    case 'create_asset': return 'Crear asset';
    case 'edit_asset': return 'Editar asset';
    case 'terminate': return 'Vuelta en falso';
    default: return action;
  }
};

export async function enviarTransicionServicio(
  params: TransitionWebhookParams
): Promise<TransitionWebhookResponse> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const { onLogConsola } = params;
  
  const payloadSummary = `ESN: ${params.esn || 'N/A'}, Técnico: ${params.technician_email || 'N/A'}${params.asset_data ? ', Asset modificado' : ''}${params.notes_terminate ? ', Notas: ' + params.notes_terminate.substring(0, 50) : ''}`;
  
  const registrarLog = async (success: boolean, errorMessage?: string, responseStatus?: number) => {
    if (params.expediente_id && params.appointment_name) {
      await registrarEnvioWebhook({
        expediente_id: params.expediente_id,
        appointment_name: params.appointment_name,
        timestamp,
        action: params.action,
        webhook_url: TRANSITION_WEBHOOK_URL,
        payload_summary: payloadSummary,
        success,
        error_message: errorMessage,
        response_status: responseStatus,
        duration_ms: Date.now() - startTime
      });
    }
  };
  
  const logToConsola = (msg: string) => {
    if (onLogConsola) {
      onLogConsola(msg);
    }
  };
  
  try {
    console.log('🔔 [TRANSICIÓN] Enviando webhook:', params.action);
    console.log('📋 [TRANSICIÓN] Datos:', JSON.stringify(params, null, 2));
    
    logToConsola(`${getActionEmoji(params.action)} [WEBHOOK] Enviando: ${getActionLabel(params.action)}...`);

    const response = await fetch(TRANSITION_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No se pudo leer el error');
      console.error('❌ [TRANSICIÓN] Error HTTP:', response.status, errorText);
      
      await registrarLog(false, `Error HTTP ${response.status}: ${errorText}`, response.status);
      logToConsola(`❌ [WEBHOOK] ${getActionLabel(params.action)} - Error HTTP ${response.status} (${duration}ms)`);
      
      return {
        success: false,
        error: `Error HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    console.log('✅ [TRANSICIÓN] Respuesta exitosa:', data);
    
    await registrarLog(true, undefined, response.status);
    logToConsola(`✅ [WEBHOOK] ${getActionLabel(params.action)} - OK (${duration}ms)`);

    return {
      success: true,
      message: data.message || 'Transición enviada exitosamente',
      data
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ [TRANSICIÓN] Error:', errorMessage);
    
    const duration = Date.now() - startTime;
    await registrarLog(false, errorMessage);
    logToConsola(`❌ [WEBHOOK] ${getActionLabel(params.action)} - Error: ${errorMessage} (${duration}ms)`);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Envía notificación de inicio de trabajo (start_work)
 */
export async function notificarInicioTrabajo(params: {
  appointment_name: string;
  work_order_name: string;
  esn: string;
  technician_email: string;
  company_Id?: string;
  expediente_id?: number;
  onLogConsola?: (msg: string) => void;
}): Promise<TransitionWebhookResponse> {
  return enviarTransicionServicio({
    action: 'start_work',
    ...params
  });
}

/**
 * Envía notificación de trabajo completado (complete_work)
 */
export async function notificarTrabajoCompletado(params: {
  appointment_name: string;
  work_order_name: string;
  esn: string;
  technician_email: string;
  company_Id?: string;
  expediente_id?: number;
  onLogConsola?: (msg: string) => void;
}): Promise<TransitionWebhookResponse> {
  return enviarTransicionServicio({
    action: 'complete_work',
    ...params
  });
}

/**
 * Envía notificación de creación de asset (create_asset)
 * Se usa cuando el VIN escaneado es diferente al VIN original del servicio
 */
export async function notificarCreacionAsset(params: {
  appointment_name: string;
  work_order_name: string;
  esn: string;
  technician_email: string;
  company_Id?: string;
  expediente_id?: number;
  onLogConsola?: (msg: string) => void;
  asset_data: {
    vin: string;
    vin_original: string;
    placas?: string;
    color?: string;
    marca?: string;
    modelo?: string;
    año?: string;
    numero_economico?: string;
    odometro?: string;
  };
}): Promise<TransitionWebhookResponse> {
  return enviarTransicionServicio({
    action: 'create_asset',
    ...params
  });
}

/**
 * Envía notificación de edición de asset (edit_asset)
 * Se usa cuando se modifican datos del vehículo (excepto VIN)
 */
export async function notificarEdicionAsset(params: {
  appointment_name: string;
  work_order_name: string;
  esn: string;
  technician_email: string;
  company_Id?: string;
  expediente_id?: number;
  onLogConsola?: (msg: string) => void;
  asset_data: {
    vin?: string;
    placas?: string;
    color?: string;
    marca?: string;
    modelo?: string;
    año?: string;
    numero_economico?: string;
    odometro?: string;
  };
}): Promise<TransitionWebhookResponse> {
  return enviarTransicionServicio({
    action: 'edit_asset',
    ...params
  });
}

/**
 * Envía notificación de vuelta en falso (terminate)
 */
export async function notificarVueltaEnFalso(params: {
  appointment_name: string;
  work_order_name: string;
  esn: string;
  technician_email: string;
  company_Id?: string;
  expediente_id?: number;
  notes_terminate: string;
  onLogConsola?: (msg: string) => void;
}): Promise<TransitionWebhookResponse> {
  return enviarTransicionServicio({
    action: 'terminate',
    ...params
  });
}
