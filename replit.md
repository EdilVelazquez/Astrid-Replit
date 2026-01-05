# Sistema de Verificación de Instalaciones

## Descripción General
Aplicación web para técnicos de campo que valida instalaciones de dispositivos GPS/telemetría en vehículos. Permite a los técnicos escanear ESN, realizar pruebas activas/pasivas, y documentar el proceso completo.

## Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide React icons
- **Backend/BDD**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Scanner**: html5-qrcode para escaneo de QR/códigos

## Estructura del Proyecto
```
project/
├── src/
│   ├── components/         # Componentes React
│   │   ├── admin/         # Panel de administración
│   │   ├── Login.tsx      # Autenticación
│   │   ├── ServiceFlow.tsx # Contenedor unificado del flujo de servicio (stepper)
│   │   ├── PrefolioForm.tsx # Datos del vehículo y dispositivo
│   │   ├── PruebasActivas.tsx # Pruebas activas (bloqueo, buzzer)
│   │   ├── PruebasPasivas.tsx # Pruebas pasivas (ignición, ubicación)
│   │   ├── FormularioCierre.tsx # Documentación final
│   │   ├── SignaturePad.tsx # Componente de firma digital
│   │   ├── CalendarioTecnico.tsx # Vista de agenda con filtros
│   │   ├── Header.tsx     # Barra superior con navegación
│   │   └── ...
│   ├── services/          # Servicios de API
│   ├── contexts/          # Context providers (Auth)
│   ├── hooks/             # Custom hooks
│   ├── supabaseClient.ts  # Cliente Supabase
│   └── store.ts           # Estado global
├── supabase/
│   ├── functions/         # Edge Functions
│   └── migrations/        # Migraciones SQL
└── package.json
```

## Variables de Entorno (Configuradas en Replit Secrets)
- `VITE_SUPABASE_URL` - URL del proyecto Supabase (env var compartida)
- `VITE_SUPABASE_ANON_KEY` - Clave anónima pública de Supabase (env var compartida)
- `ZOHO_API_KEY` - API Key de Zoho Inventory (secreto)

## Comandos
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run preview` - Preview del build

## Flujo de la Aplicación (Actualizado)

### Paso 1: Inicio de Servicio
1. Técnico inicia sesión (Supabase Auth)
2. Ve calendario con servicios asignados
3. **Check-In con Geocerca**: Técnico hace clic en "Check-In" para confirmar llegada
   - Obtiene ubicación GPS del dispositivo
   - Valida que esté dentro de 200 metros del punto de servicio (usando coordenadas service_latitude/service_longitude)
   - Guarda timestamp, coordenadas y distancia en la BD
   - Muestra badge "Llegada confirmada" si exitoso
4. Hace clic en botón "Iniciar servicio" (requiere confirmación)
5. Webhook `start_work` enviado
6. Completa formulario de prefolio:
   - Escanea ESN, VIN, placa
   - Toma fotos obligatorias
   - Si VIN cambió → webhook `create_asset`
   - Si otros datos cambiaron → webhook `edit_asset`
6. Realiza pruebas pasivas (ignición, botón pánico, ubicación)
7. Realiza pruebas activas (bloqueo, desbloqueo, buzzer)

### Paso 2: Cierre de Servicio
1. Selecciona tipo de corte (Ignición/Bomba/Marcha)
2. Toma fotos obligatorias:
   - Instalación del equipo
   - Conexión de corriente
   - Conexión de tierra
   - Conexión de ignición
   - Conexión ignición y corte
   - Botón de pánico
3. Agrega fotos adicionales (opcional, hasta 5 bloques)
4. Captura recepción del vehículo:
   - Nombre de quien recibe
   - Firma digital
   - Foto de la persona
5. Webhook `complete_work` enviado
6. Servicio marcado como COMPLETADO

## Webhooks del Sistema
- `start_work` - Al iniciar servicio (desde PrefolioForm)
- `complete_work` - Al finalizar servicio (desde FormularioCierre)
- `create_asset` - Cuando VIN escaneado difiere del original
- `edit_asset` - Cuando otros datos del vehículo cambian

## Notas de Desarrollo
- La app requiere conexión a un proyecto Supabase externo existente
- Las migraciones en `/supabase/migrations/` definen el esquema de BD
- Puerto de desarrollo: 5000

## API de Métricas (OpenAPI)
Servidor Express separado que expone métricas de la plataforma.

### Endpoints
- `GET /api/metrics/openapi.json` - Especificación OpenAPI 3.0 (público)
- `GET /api/metrics/impact` - Métricas de impacto (requiere autenticación)
- `GET /health` - Health check

### Autenticación
Bearer token en header Authorization:
```
Authorization: Bearer <API_METRICS_KEY>
```

### Servidor
- Puerto: 3001
- Código: `project/server/index.js`
- Workflow: "Metrics API"

### Métricas expuestas (v2.0)
**Servicios:**
- Total, completados, en progreso, pendientes
- Con prefolio, cambios de dispositivo
- Servicios hoy, servicios última semana
- Desglose por: tipo, ciudad, empresa, estado de validación

**Pruebas de dispositivos:**
- Total sesiones, sesiones activas
- Intentos promedio
- Tasas de éxito: ignición, botón pánico, ubicación, bloqueo, desbloqueo, buzzer

**Usuarios:**
- Total, activos, por rol

**Vehículos:**
- Marcas y modelos registrados
- Servicios por marca de vehículo

**Eficiencia:**
- Tasa de completado
- Promedio de duración de servicios
