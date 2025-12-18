import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  esn: string;
}

interface EstatusGralResponse {
  response: Array<{
    BLOQUEO: number;
    FECHA_BLOQUEO: string | null;
    BUZER: number;
    FECHA_BUZER: string | null;
    IGNICION: number;
    BOTON: string | null;
    ODOMETRO: number;
    LATITUD: string;
    LONGITUD: string;
    UBICACIONMAPS: string;
    FECHA_EVENTO: string;
  }>;
}

async function fetchConReintentos(
  url: string,
  options: RequestInit,
  maxReintentos: number = 1
): Promise<Response> {
  let ultimoError: Error | null = null;

  for (let intento = 0; intento <= maxReintentos; intento++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const requestId = crypto.randomUUID().slice(0, 8);
      console.log(`[${requestId}] Intento ${intento + 1}/${maxReintentos + 1}: Iniciando request`);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[${requestId}] Intento ${intento + 1}: Respuesta exitosa con status ${response.status}`);

      return response;
    } catch (error: unknown) {
      ultimoError = error instanceof Error ? error : new Error('Error desconocido');
      const esAbort = ultimoError.name === 'AbortError';
      const esNetworkError = ultimoError.message.includes('fetch') || ultimoError.message.includes('network');

      console.log(`Intento ${intento + 1} fallido: ${esAbort ? 'Timeout (20s)' : ultimoError.message}`);

      if (intento < maxReintentos && (esAbort || esNetworkError)) {
        const delay = Math.pow(2, intento) * 1000 + Math.random() * 500;
        console.log(`Reintentando en ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (intento >= maxReintentos) {
        console.log(`Máximo de reintentos alcanzado (${maxReintentos + 1} intentos totales)`);
      } else {
        console.log(`No se reintenta: error no recuperable`);
        break;
      }
    }
  }

  throw ultimoError;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}));

    if (!body.esn || typeof body.esn !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Campo esn requerido y tipo string' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const clientId = Deno.env.get('TCV_CLIENT_ID');
    const apiBase = Deno.env.get('TCV_API_BASE');

    if (!clientId || !apiBase) {
      return new Response(
        JSON.stringify({ error: 'Configuración servidor incompleta' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    try {
      const response = await fetchConReintentos(
        apiBase,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Tcv-Client-Id': clientId,
          },
          body: JSON.stringify({ esn: body.esn }),
        }
      );

      if (!response.ok) {
        const statusText = response.statusText;
        const raw = await response.text();
        console.log('Proveedor error', { status: response.status, statusText, raw });

        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          data = { rawResponse: raw };
        }

        return new Response(
          JSON.stringify({ error: 'Proveedor error', data }),
          {
            status: 502,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const rawData = await response.json().catch(() => null);

      if (!rawData) {
        return new Response(
          JSON.stringify({ error: 'Respuesta vacía del proveedor' }),
          {
            status: 502,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      let normalizedData: EstatusGralResponse;

      if (Array.isArray(rawData)) {
        normalizedData = { response: rawData };
      } else if (rawData.response && Array.isArray(rawData.response)) {
        normalizedData = rawData;
      } else {
        normalizedData = { response: [] };
      }

      return new Response(JSON.stringify(normalizedData), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error: unknown) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      console.error('Error después de reintentos:', error);
      return new Response(
        JSON.stringify({
          error: isAbortError ? 'Timeout después de reintentos' : 'Fallo red después de reintentos',
        }),
        {
          status: 504,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error procesando solicitud' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});