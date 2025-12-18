import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ZOHO_API_KEY = '1003.b72be6d4c65fd0fcf3522af1ce3bbae0.9d7092a7bc5fbf4d992eb37c5703b998';
const ZOHO_FUNCTION_URL = 'https://www.zohoapis.com/crm/v7/functions/search_inventory/actions/execute';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get ESN from query parameters
    const url = new URL(req.url);
    const esn = url.searchParams.get('esn');

    if (!esn) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'El parámetro ESN es requerido' 
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!ZOHO_API_KEY) {
      console.error('❌ ZOHO_API_KEY no está configurada');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuración del servidor incompleta' 
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('🔍 [ZOHO] Buscando equipo con ESN:', esn);

    // Call Zoho API
    const zohoUrl = `${ZOHO_FUNCTION_URL}?auth_type=apikey&zapikey=${ZOHO_API_KEY}&esn=${encodeURIComponent(esn)}`;
    
    const zohoResponse = await fetch(zohoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [ZOHO] Status:', zohoResponse.status, zohoResponse.statusText);

    if (!zohoResponse.ok) {
      const errorText = await zohoResponse.text();
      console.error('❌ [ZOHO] Error HTTP:', errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error al consultar inventario (${zohoResponse.status})`,
        }),
        {
          status: zohoResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await zohoResponse.json();
    console.log('📦 [ZOHO] Respuesta:', JSON.stringify(data, null, 2));

    // Validate response
    if (!data || data.code !== 'success') {
      console.warn('⚠️ [ZOHO] Código no exitoso:', data?.code);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontró información del equipo con este ESN',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Validate details.output exists
    if (!data.details || !data.details.output) {
      console.warn('⚠️ [ZOHO] Respuesta sin details.output');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontró información del equipo con este ESN',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse output JSON string
    let outputData;
    try {
      outputData = JSON.parse(data.details.output);
      console.log('📊 [ZOHO] Output parseado:', outputData);
    } catch (parseError) {
      console.error('❌ [ZOHO] Error al parsear output:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error al procesar la respuesta del inventario',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Extract equipment information
    const equipo = {
      id: outputData.id || '',
      model: outputData.model || '',
      IMEI: outputData.IMEI || '',
      linea: outputData.linea || '',
    };

    // Validate we have at least the id
    if (!equipo.id) {
      console.warn('⚠️ [ZOHO] No se encontró el ID del equipo');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontró información del equipo con este ESN',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('✅ [ZOHO] Equipo encontrado:', equipo);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: equipo,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ [ZOHO] Error durante la búsqueda:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error al conectar con el servicio de inventario',
      }),
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
