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
│   │   ├── PrefolioForm.tsx # Paso 1: Formulario pre-servicio
│   │   ├── PruebasActivas.tsx # Pruebas activas (bloqueo, buzzer)
│   │   ├── PruebasPasivas.tsx # Pruebas pasivas (ignición, ubicación)
│   │   ├── FormularioCierre.tsx # Paso 2: Cierre de servicio
│   │   ├── SignaturePad.tsx # Componente de firma digital
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
3. Hace clic en botón "Iniciar servicio" (requiere confirmación)
4. Webhook `start_work` enviado
5. Completa formulario de prefolio:
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
- El servicio solo puede iniciarse desde el botón dedicado (no clic en tarjeta)
- El servicio solo puede iniciarse el día programado

## Diseño de UI/UX (Actualizado)

### Flujo de Pruebas
- Pantalla unificada con flujo lineal de arriba hacia abajo
- Orden: Resumen del servicio → ESN/Dispositivo → Pruebas Pasivas → Pruebas Activas → Botón "Confirmar y Continuar"
- El botón de confirmación aparece SOLO al final después de todas las pruebas
- Sin etiquetas "Paso 1" / "Paso 2" visibles al técnico (solo interno)

### Acciones de Reinicio
- **Cambiar Dispositivo**: Resetea SOLO las pruebas, mantiene datos del vehículo
- **Reiniciar Servicio**: Vuelve al estado inicial completo (nuevo servicio)

### Dashboard/Calendario
- Vista unificada de servicios (sin duplicación "Servicios del día" + "Mi agenda")
- Dos modos de visualización intercambiables:
  - **Modo Lista**: Tabla compacta con Hora, AP/Folio, Cliente, Estado, Acción
  - **Modo Tarjeta**: Vista detallada con información completa del servicio
- Filtros de estado (Todos/Pendientes/En Curso/Completados) aplican a ambos modos
- Navegación de fecha aplica a ambos modos
- Servicios en progreso muestran botón "Reanudar" 
- Servicios pendientes del día muestran botón "Iniciar"
- Servicios completados solo se muestran como histórico (sin acciones)

## API de Exportación de Datos
La aplicación incluye una API REST para exportar datos de las tablas de Supabase en tiempo real.

### Endpoints disponibles:
- `GET /api/health` - Estado del servidor (sin autenticación)
- `GET /api/tables` - Lista de tablas disponibles (requiere token)
- `GET /api/export/:table` - Exporta todos los datos de una tabla (requiere token)
- `GET /api/export/:table/count` - Cuenta de registros en una tabla (requiere token)

### Autenticación:
Todas las peticiones (excepto /api/health) requieren header:
```
Authorization: Bearer <USAGE_EXPORT_TOKEN>
```

### Tablas disponibles:
- expedientes_servicio
- device_test_sessions
- user_profiles
- device_changes
- prefolio_data
- cierre_data
- test_services

### Ejemplos de uso:
```bash
# Health check
curl https://tu-dominio/api/health

# Listar tablas
curl -H "Authorization: Bearer TOKEN" https://tu-dominio/api/tables

# Exportar datos
curl -H "Authorization: Bearer TOKEN" https://tu-dominio/api/export/expedientes_servicio
```
