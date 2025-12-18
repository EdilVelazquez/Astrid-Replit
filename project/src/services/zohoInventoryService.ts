import { supabase } from '../supabaseClient';

export interface EquipoInventario {
  id: string;
  model: string;
  IMEI: string;
  linea: string;
}

export interface BusquedaInventarioResult {
  success: boolean;
  data?: EquipoInventario;
  error?: string;
}

export async function buscarEquipoEnInventario(esn: string): Promise<BusquedaInventarioResult> {
  try {
    console.log('🔍 [ZOHO] Buscando equipo en inventario con ESN:', esn);

    // Modo de pruebas para ESN especial
    if (esn === '000000000000000') {
      console.log('🧪 [ZOHO] Modo de pruebas activado - simulando respuesta exitosa');
      return {
        success: true,
        data: {
          id: 'TEST-ID-123456789',
          model: 'DISPOSITIVO DE PRUEBA',
          IMEI: '999999999999999',
          linea: '5555555555',
        },
      };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${supabaseUrl}/functions/v1/search-zoho-inventory?esn=${encodeURIComponent(esn)}`;
    console.log('🌐 [ZOHO] Llamando al Edge Function:', url);

    // Get the session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.error('❌ [ZOHO] No hay sesión activa');
      return {
        success: false,
        error: 'Debe iniciar sesión para buscar en el inventario',
      };
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📡 [ZOHO] Status de respuesta:', response.status, response.statusText);

    if (!response.ok) {
      console.error('❌ [ZOHO] Error HTTP:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ [ZOHO] Cuerpo del error:', errorText);
      return {
        success: false,
        error: `Error al consultar inventario (${response.status})`,
      };
    }

    const result = await response.json();
    console.log('📦 [ZOHO] Respuesta del Edge Function:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('❌ [ZOHO] Error durante la búsqueda:', error);
    return {
      success: false,
      error: 'Error al conectar con el servicio de inventario',
    };
  }
}
