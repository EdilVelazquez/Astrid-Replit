import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const API_KEY = process.env.API_METRICS_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

if (!API_KEY) {
  console.error('Missing API_METRICS_KEY - API will not accept authenticated requests');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  if (token !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
};

async function fetchAllRecords(table, selectFields) {
  const pageSize = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(selectFields)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key] || 'Sin especificar';
    if (!result[groupKey]) {
      result[groupKey] = 0;
    }
    result[groupKey]++;
    return result;
  }, {});
}

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Astrid Platform Metrics API',
    description: 'API para exponer métricas e indicadores de la plataforma Astrid a sistemas externos',
    version: '2.0.0',
    contact: {
      name: 'Astrid Support'
    }
  },
  servers: [
    {
      url: '/api/metrics',
      description: 'Metrics API Server'
    }
  ],
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/impact': {
      get: {
        summary: 'Obtener métricas de impacto',
        description: 'Retorna indicadores clave de operación de la plataforma incluyendo servicios, pruebas, usuarios y vehículos',
        operationId: 'getImpactMetrics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Métricas obtenidas exitosamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ImpactMetrics'
                }
              }
            }
          },
          '401': { description: 'No autorizado - Token faltante o inválido' },
          '403': { description: 'Prohibido - API key inválida' },
          '500': { description: 'Error interno del servidor' }
        }
      }
    },
    '/openapi.json': {
      get: {
        summary: 'Especificación OpenAPI',
        description: 'Retorna la especificación OpenAPI de esta API',
        operationId: 'getOpenApiSpec',
        security: [],
        responses: {
          '200': {
            description: 'Especificación OpenAPI',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API Key para autenticación'
      }
    },
    schemas: {
      ImpactMetrics: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time', description: 'Fecha y hora de la consulta' },
          servicios: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total de servicios registrados' },
              completados: { type: 'integer', description: 'Servicios completados' },
              en_progreso: { type: 'integer', description: 'Servicios en progreso' },
              pendientes: { type: 'integer', description: 'Servicios pendientes' },
              con_prefolio: { type: 'integer', description: 'Servicios con prefolio realizado' },
              cambios_dispositivo: { type: 'integer', description: 'Servicios con cambio de dispositivo' },
              hoy: { type: 'integer', description: 'Servicios programados para hoy' },
              semana: { type: 'integer', description: 'Servicios de los últimos 7 días' },
              por_tipo: { type: 'object', description: 'Desglose por tipo de servicio' },
              por_ciudad: { type: 'object', description: 'Desglose por ciudad' },
              por_empresa: { type: 'object', description: 'Desglose por empresa/cliente' },
              por_estado_validacion: { type: 'object', description: 'Desglose por estado de validación' }
            }
          },
          pruebas: {
            type: 'object',
            properties: {
              total_sesiones: { type: 'integer', description: 'Total de sesiones de prueba' },
              sesiones_activas: { type: 'integer', description: 'Sesiones actualmente activas' },
              intentos_promedio: { type: 'number', description: 'Promedio de intentos por sesión' },
              tasas_exito: {
                type: 'object',
                properties: {
                  ignicion: { type: 'number', description: 'Tasa de éxito prueba ignición (%)' },
                  boton_panico: { type: 'number', description: 'Tasa de éxito botón de pánico (%)' },
                  ubicacion: { type: 'number', description: 'Tasa de éxito ubicación (%)' },
                  bloqueo: { type: 'number', description: 'Tasa de éxito bloqueo (%)' },
                  desbloqueo: { type: 'number', description: 'Tasa de éxito desbloqueo (%)' },
                  buzzer: { type: 'number', description: 'Tasa de éxito buzzer (%)' }
                }
              }
            }
          },
          usuarios: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total de usuarios' },
              activos: { type: 'integer', description: 'Usuarios activos' },
              por_rol: { type: 'object', description: 'Desglose por rol' }
            }
          },
          vehiculos: {
            type: 'object',
            properties: {
              marcas_registradas: { type: 'integer', description: 'Total de marcas de vehículos' },
              modelos_registrados: { type: 'integer', description: 'Total de modelos de vehículos' },
              por_marca: { type: 'object', description: 'Servicios por marca de vehículo' }
            }
          },
          eficiencia: {
            type: 'object',
            properties: {
              tasa_completado: { type: 'number', description: 'Porcentaje de servicios completados' },
              promedio_duracion_horas: { type: 'number', description: 'Duración promedio de servicios en horas' }
            }
          }
        }
      }
    }
  }
};

app.get('/api/metrics/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

app.get('/api/metrics/impact', authenticateApiKey, async (req, res) => {
  try {
    const expedientesFields = 'status, validation_final_status, created_at, updated_at, validation_end_timestamp, service_type, service_city, company_name, client_name, prefolio_realizado, device_esn_cambio_cantidad, scheduled_start_time, vehicle_brand';
    const expedientes = await fetchAllRecords('expedientes_servicio', expedientesFields);

    const testSessionsFields = 'ignicion_exitosa, boton_exitoso, ubicacion_exitosa, bloqueo_exitoso, desbloqueo_exitoso, buzzer_exitoso, intentos_realizados, session_active';
    let testSessions = [];
    try {
      testSessions = await fetchAllRecords('device_test_sessions', testSessionsFields);
    } catch (e) {
      console.error('Error fetching test sessions:', e);
    }

    let usuarios = [];
    try {
      usuarios = await fetchAllRecords('user_profiles', 'role, active');
    } catch (e) {
      console.error('Error fetching usuarios:', e);
    }

    let vehicleBrands = [];
    let vehicleModels = [];
    try {
      vehicleBrands = await fetchAllRecords('vehicle_brands', 'id, name, active');
      vehicleModels = await fetchAllRecords('vehicle_models', 'id, brand_id, name, active');
    } catch (e) {
      console.error('Error fetching vehicle data:', e);
    }

    const totalServicios = expedientes.length;
    const completados = expedientes.filter(s => 
      s.validation_final_status === 'COMPLETADO' || 
      s.status === 'pruebas_exitosas'
    ).length;
    const enProgreso = expedientes.filter(s => 
      s.status === 'Pruebas en curso' || 
      s.validation_final_status === 'PRUEBAS EN CURSO'
    ).length;
    const pendientes = totalServicios - completados - enProgreso;

    const conPrefolio = expedientes.filter(s => s.prefolio_realizado === true).length;
    const cambiosDispositivo = expedientes.filter(s => s.device_esn_cambio_cantidad > 0).length;

    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    const hace7Dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);

    const serviciosHoy = expedientes.filter(s => {
      if (!s.scheduled_start_time) return false;
      const fecha = new Date(s.scheduled_start_time);
      return fecha >= inicioHoy && fecha <= finHoy;
    }).length;

    const serviciosSemana = expedientes.filter(s => {
      if (!s.scheduled_start_time) return false;
      const fecha = new Date(s.scheduled_start_time);
      return fecha >= hace7Dias && fecha <= hoy;
    }).length;

    const porTipo = groupBy(expedientes, 'service_type');
    const porCiudad = groupBy(expedientes, 'service_city');
    const porEmpresa = groupBy(expedientes, 'company_name');
    const porEstadoValidacion = groupBy(expedientes, 'validation_final_status');
    const porMarcaVehiculo = groupBy(expedientes, 'vehicle_brand');

    const tasaCompletado = totalServicios > 0 ? Math.round((completados / totalServicios) * 100 * 100) / 100 : 0;

    let promedioDuracion = 0;
    const expedientesConDuracion = expedientes.filter(s => s.created_at && s.validation_end_timestamp);
    if (expedientesConDuracion.length > 0) {
      const duraciones = expedientesConDuracion.map(s => {
        const inicio = new Date(s.created_at);
        const fin = new Date(s.validation_end_timestamp);
        return (fin - inicio) / (1000 * 60 * 60);
      });
      promedioDuracion = Math.round((duraciones.reduce((a, b) => a + b, 0) / duraciones.length) * 100) / 100;
    }

    const totalSesiones = testSessions.length;
    const sesionesActivas = testSessions.filter(s => s.session_active === true).length;
    const intentosPromedio = totalSesiones > 0 
      ? Math.round((testSessions.reduce((sum, s) => sum + (s.intentos_realizados || 0), 0) / totalSesiones) * 100) / 100 
      : 0;

    const calcTasaExito = (field) => {
      if (totalSesiones === 0) return 0;
      const exitosos = testSessions.filter(s => s[field] === true).length;
      return Math.round((exitosos / totalSesiones) * 100 * 100) / 100;
    };

    const tasasExito = {
      ignicion: calcTasaExito('ignicion_exitosa'),
      boton_panico: calcTasaExito('boton_exitoso'),
      ubicacion: calcTasaExito('ubicacion_exitosa'),
      bloqueo: calcTasaExito('bloqueo_exitoso'),
      desbloqueo: calcTasaExito('desbloqueo_exitoso'),
      buzzer: calcTasaExito('buzzer_exitoso')
    };

    const totalUsuarios = usuarios.length;
    const usuariosActivos = usuarios.filter(u => u.active === true).length;
    const porRol = groupBy(usuarios, 'role');

    const marcasActivas = vehicleBrands.filter(b => b.active !== false).length;
    const modelosActivos = vehicleModels.filter(m => m.active !== false).length;

    res.json({
      timestamp: new Date().toISOString(),
      servicios: {
        total: totalServicios,
        completados,
        en_progreso: enProgreso,
        pendientes,
        con_prefolio: conPrefolio,
        cambios_dispositivo: cambiosDispositivo,
        hoy: serviciosHoy,
        semana: serviciosSemana,
        por_tipo: porTipo,
        por_ciudad: porCiudad,
        por_empresa: porEmpresa,
        por_estado_validacion: porEstadoValidacion
      },
      pruebas: {
        total_sesiones: totalSesiones,
        sesiones_activas: sesionesActivas,
        intentos_promedio: intentosPromedio,
        tasas_exito: tasasExito
      },
      usuarios: {
        total: totalUsuarios,
        activos: usuariosActivos,
        por_rol: porRol
      },
      vehiculos: {
        marcas_registradas: marcasActivas,
        modelos_registrados: modelosActivos,
        por_marca: porMarcaVehiculo
      },
      eficiencia: {
        tasa_completado: tasaCompletado,
        promedio_duracion_horas: promedioDuracion
      }
    });

  } catch (error) {
    console.error('Error in /api/metrics/impact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Metrics API server running on port ${PORT}`);
  console.log(`OpenAPI spec available at: http://0.0.0.0:${PORT}/api/metrics/openapi.json`);
});
