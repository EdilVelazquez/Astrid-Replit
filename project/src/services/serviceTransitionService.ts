const TRANSITION_WEBHOOK_URL = 'https://aiwebhookn8n.numaris.com/webhook/c8cb35f5-2567-4584-b7f1-319fdf830443';

export interface TransitionWebhookParams {
  action: 'start_work' | 'complete_work';
  appointment_name?: string;
  work_order_name?: string;
  esn?: string;
  technician_email?: string;
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
export async function enviarTransicionServicio(
  params: TransitionWebhookParams
): Promise<TransitionWebhookResponse> {
  try {
    console.log('🔔 [TRANSICIÓN] Enviando webhook:', params.action);
    console.log('📋 [TRANSICIÓN] Datos:', JSON.stringify(params, null, 2));

    // Modo de pruebas para ESN especial
    if (params.esn === '000000000000000') {
      console.log('🧪 [TRANSICIÓN] Modo de pruebas activado - simulando respuesta exitosa');

      // Simular un pequeño delay para hacer más realista
      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        success: true,
        message: `Transición ${params.action} simulada exitosamente (modo pruebas)`,
        data: {
          test_mode: true,
          action: params.action
        }
      };
    }

    const response = await fetch(TRANSITION_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No se pudo leer el error');
      console.error('❌ [TRANSICIÓN] Error HTTP:', response.status, errorText);
      return {
        success: false,
        error: `Error HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    console.log('✅ [TRANSICIÓN] Respuesta exitosa:', data);

    return {
      success: true,
      message: data.message || 'Transición enviada exitosamente',
      data
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ [TRANSICIÓN] Error:', errorMessage);
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
}): Promise<TransitionWebhookResponse> {
  return enviarTransicionServicio({
    action: 'complete_work',
    ...params
  });
}
