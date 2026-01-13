import { ExpedienteServicio } from '../types';

interface DeviceTestSession {
  id: number;
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
  created_at: string;
  updated_at: string;
}

interface WebhookPayload {
  expediente: ExpedienteServicio;
  test_session: DeviceTestSession;
}

export async function enviarDatosFinalesWebhook(
  expediente: ExpedienteServicio,
  testSession: DeviceTestSession
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: WebhookPayload = {
      expediente,
      test_session: testSession
    };

    const webhookUrl = 'https://aiwebhookn8n.numaris.com/webhook/327d1dd6-eb64-4fd9-9ba4-cdd2592dbb97';

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error enviando datos al webhook:', error);
    return { success: false, error: errorMessage };
  }
}
