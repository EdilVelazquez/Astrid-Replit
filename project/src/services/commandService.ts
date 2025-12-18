const WEBHOOK_URL = 'https://aiwebhookn8n.numaris.com/webhook/8bb9ca0c-364d-4151-a68a-bf7c2f2189b1';

export interface EnviarComandoParams {
  esn: string;
  comando: number;
}

export interface EnviarComandoResponse {
  success: boolean;
  error?: string;
}

export async function enviarComandoDispositivo(
  params: EnviarComandoParams
): Promise<EnviarComandoResponse> {
  try {
    // Modo de pruebas para ESN especial
    if (params.esn === '000000000000000') {
      console.log('🧪 [COMANDO] Modo de pruebas activado - simulando envío exitoso');
      console.log(`🧪 [COMANDO] Comando ${params.comando} simulado para ESN de pruebas`);

      // Simular un pequeño delay para hacer más realista
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
      };
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        esn: params.esn,
        comando: params.comando,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Error HTTP: ${response.status}`,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export const COMANDOS = {
  BLOQUEO: 1,
  DESBLOQUEO: 2,
  BUZZER_ON: 3,
  BUZZER_OFF: 4,
} as const;

export type ComandoType = typeof COMANDOS[keyof typeof COMANDOS];
