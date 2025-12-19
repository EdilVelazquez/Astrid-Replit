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

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Astrid Platform Metrics API',
    description: 'API para exponer métricas e indicadores de la plataforma Astrid a sistemas externos',
    version: '1.0.0',
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
        description: 'Retorna indicadores clave de operación de la plataforma',
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
          '401': {
            description: 'No autorizado - Token faltante o inválido'
          },
          '403': {
            description: 'Prohibido - API key inválida'
          },
          '500': {
            description: 'Error interno del servidor'
          }
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
                schema: {
                  type: 'object'
                }
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
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha y hora de la consulta'
          },
          servicios: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total de servicios registrados' },
              completados: { type: 'integer', description: 'Servicios completados' },
              en_progreso: { type: 'integer', description: 'Servicios en progreso' },
              pendientes: { type: 'integer', description: 'Servicios pendientes' }
            }
          },
          usuarios: {
            type: 'object',
            properties: {
              tecnicos_activos: { type: 'integer', description: 'Técnicos activos' },
              total_usuarios: { type: 'integer', description: 'Total de usuarios' }
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
    const { data: expedientes, error: expedientesError } = await supabase
      .from('expedientes_servicio')
      .select('status, validation_final_status, created_at, updated_at, validation_end_timestamp');

    if (expedientesError) {
      console.error('Error fetching expedientes:', expedientesError);
      return res.status(500).json({ error: 'Error fetching services data' });
    }

    const { data: usuarios, error: usuariosError } = await supabase
      .from('user_profiles')
      .select('role');

    if (usuariosError) {
      console.error('Error fetching usuarios:', usuariosError);
    }

    const totalServicios = expedientes?.length || 0;
    const completados = expedientes?.filter(s => 
      s.validation_final_status === 'COMPLETADO' || 
      s.status === 'pruebas_exitosas'
    ).length || 0;
    const enProgreso = expedientes?.filter(s => 
      s.status === 'Pruebas en curso' || 
      s.validation_final_status === 'PRUEBAS EN CURSO'
    ).length || 0;
    const pendientes = totalServicios - completados - enProgreso;

    const tasaCompletado = totalServicios > 0 ? Math.round((completados / totalServicios) * 100 * 100) / 100 : 0;

    let promedioDuracion = 0;
    const expedientesConDuracion = expedientes?.filter(s => s.created_at && s.validation_end_timestamp) || [];
    if (expedientesConDuracion.length > 0) {
      const duraciones = expedientesConDuracion.map(s => {
        const inicio = new Date(s.created_at);
        const fin = new Date(s.validation_end_timestamp);
        return (fin - inicio) / (1000 * 60 * 60);
      });
      promedioDuracion = Math.round((duraciones.reduce((a, b) => a + b, 0) / duraciones.length) * 100) / 100;
    }

    const tecnicosActivos = usuarios?.filter(u => u.role === 'tecnico').length || 0;
    const totalUsuarios = usuarios?.length || 0;

    res.json({
      timestamp: new Date().toISOString(),
      servicios: {
        total: totalServicios,
        completados,
        en_progreso: enProgreso,
        pendientes
      },
      usuarios: {
        tecnicos_activos: tecnicosActivos,
        total_usuarios: totalUsuarios
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
