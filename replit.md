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
3. **Check-In con Geocerca (OBLIGATORIO)**: Técnico hace clic en "Check-In" para confirmar llegada
   - Obtiene ubicación GPS del dispositivo
   - Valida que esté dentro de 200 metros del punto de servicio (usando coordenadas service_latitude/service_longitude)
   - **Datos guardados en expedientes_servicio:**
     - `check_in_timestamp` - Fecha/hora del check-in
     - `check_in_latitude`, `check_in_longitude` - Coordenadas del técnico
     - `check_in_distance` - Distancia en metros al punto de servicio
     - `technician_location_checkin` - Ubicación en formato "lat,lng"
     - `km_diferencia_checkin` - Distancia en kilómetros
     - `checkin_location_reason` - Motivo si ubicación no coincide (ubicacion_unidad, direccion_erronea, otro, null)
     - `checkin_location_reason_other` - Texto libre cuando motivo es "otro"
   - **Si ubicación NO coincide** (fuera de 200m):
     - Muestra modal de confirmación con distancia detectada
     - Picklist obligatorio: "No estaba la unidad en la ubicación", "Dirección errónea", "Otro"
     - Si selecciona "Otro" → campo de texto obligatorio
     - Usuario puede confirmar o cancelar
   - Muestra badge "Llegada confirmada" si exitoso
   - **Servicios de prueba**: Citas que inician con "AP-TEST-" o tienen is_test_service=true omiten validación de geocerca pero registran check-in
4. Hace clic en botón "Iniciar servicio" (SOLO disponible después de Check-In exitoso)
5. Webhook `start_work` enviado
6. Completa formulario de prefolio:
   - Escanea ESN, VIN, placa
   - Toma fotos obligatorias (vehículo 4 ángulos, odómetro, tablero)
   - Agrega fotos adicionales opcionales (hasta 5 bloques, cada uno con hasta 5 fotos)
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
- `terminate` - Cuando el técnico marca "Volver en falso" (servicio no realizado)

### Webhook terminate
Enviado cuando un técnico marca un servicio como "Vuelta en falso" después del check-in:
```json
{
  "action": "terminate",
  "appointment_id": "...",
  "appointment_name": "...",
  "work_order_name": "...",
  "esn": "...",
  "technician_email": "...",
  "company_Id": "...",
  "notes_terminate": "Motivo capturado obligatoriamente",
  "timestamp": "..."
}
```

## Estado "Vuelta en Falso"
- **Activación**: Botón visible solo después del check-in, antes de iniciar servicio
- **Modal obligatorio**: Requiere capturar `notes_terminate` (campo texto libre obligatorio)
- **Comportamiento**: Servicio queda bloqueado permanentemente, no puede iniciarse ni continuar
- **Persistencia**: Se guarda `status: 'vuelta_en_falso'` y `notes_terminate` en BD
- **Visualización**: Badge rojo en tarjeta, notas visibles en historial (solo lectura)

### Campos comunes en todos los webhooks
- `action` - Tipo de acción (start_work, complete_work, create_asset, edit_asset)
- `appointment_name` - Nombre de la cita
- `work_order_name` - Nombre de la orden de trabajo
- `esn` - ESN del dispositivo
- `technician_email` - Email del técnico
- `company_Id` - ID de la empresa (desde BD Supabase)

## Almacenamiento de Fotos (Unificado)
Todas las fotos de un servicio se almacenan en una sola carpeta en Supabase Storage.

### Estructura
```
prefolio-photos/
└── servicios/
    └── {APPOINTMENT_NAME}/
        ├── {APPOINTMENT_NAME}_vehiculo_frente_20251230-093012.jpg
        ├── {APPOINTMENT_NAME}_vin_ocr_20251230-093045.jpg
        ├── {APPOINTMENT_NAME}_placas_ocr_20251230-093050.jpg
        ├── {APPOINTMENT_NAME}_odometro_lectura_20251230-093120.jpg
        ├── {APPOINTMENT_NAME}_instalacion_equipo_20251230-094010.jpg
        ├── {APPOINTMENT_NAME}_conexion_corriente_20251230-094015.jpg
        ├── {APPOINTMENT_NAME}_conexion_ignicion_corte_20251230-094020.jpg
        ├── {APPOINTMENT_NAME}_firma_cliente_20251230-101530.jpg
        ├── {APPOINTMENT_NAME}_receptor_cliente_foto_20251230-101545.jpg
        └── ...
```

### Convención de nombres
`{APPOINTMENT_NAME}_{tipo}_{detalle}_{YYYYMMDD-HHMMSS}.jpg`

### Tipos de fotos
- **Prefolio**: vehiculo (frente/costado_izq/costado_der/trasera), odometro (lectura), tablero (vista)
- **Prefolio adicionales**: prefolio_adicional_{descripcion}_{numero} - fotos opcionales con descripción personalizada
- **OCR/IA**: vin (ocr), placas (ocr) - fotos usadas para extracción de texto que se almacenan permanentemente
- **Cierre**: instalacion (equipo), conexion (corriente/tierra/ignicion/ignicion_corte), boton (panico)
- **Cierre adicionales**: adicional_{descripcion}_{numero} - fotos opcionales con descripción personalizada
- **Documentación**: firma (cliente), receptor (cliente_foto)

## Registro de Webhooks (Auditoría)
El sistema registra automáticamente cada envío de webhook para auditoría y trazabilidad.

### Datos registrados por cada webhook
- **Fecha y hora exacta** del envío (timestamp ISO)
- **Tipo de acción**: start_work, complete_work, create_asset, edit_asset, terminate
- **URL destino** del webhook
- **Identificador del servicio** (expediente_id, appointment_name)
- **Resultado**: éxito o error con mensaje detallado
- **Duración** del envío en milisegundos
- **Código HTTP** de respuesta

### Visualización
- Accesible desde la **Consola de Monitoreo** (Panel de Administración)
- En el detalle de cada expediente, sección "Registro de Webhooks"
- Orden cronológico desde el inicio del servicio
- Errores claramente identificados con fondo rojo

### Tabla de BD
- `webhook_logs` - Almacena todos los registros
- Índices por expediente_id, appointment_name, timestamp, action

## Sistema de Reinicio de Servicios de Prueba (Actualizado 2026-01-08)

### Comportamiento del servicio de prueba (is_test_service = true)
- Al **finalizar** o marcar como **"vuelta en falso"**, el servicio se reinicia automáticamente
- El reinicio es **TOTAL** - vuelve al estado inicial como si nunca se hubiera hecho nada:
  - ❌ Check-in eliminado (check_in_timestamp, coordenadas, distancia)
  - ❌ Datos del prefolio eliminados (vehículo, ESN, fotos)
  - ❌ Sesión de pruebas eliminada (device_test_sessions)
  - ❌ Datos de cierre eliminados (cierre_data)
  - ❌ Fotos del prefolio eliminadas (prefolio_data)
  - ❌ Logs de webhooks eliminados (webhook_logs)
  - ❌ Notas de terminate eliminadas

### Servicios normales (is_test_service = false)
- **NO tienen reinicio automático** al finalizar
- Al reanudar, restauran el checkpoint exacto donde quedaron:
  - Prefolio completado → Pruebas del dispositivo
  - Pruebas completadas → Documentación final
  - Lo anterior queda preservado, lo posterior invalidado

### Función RPC: `reset_test_service(service_id)`
- Ubicación: `supabase/migrations/20260108000000_fix_reset_test_service.sql`
- Limpia todas las tablas relacionadas y resetea el expediente

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
