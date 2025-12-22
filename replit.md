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
│   │   ├── PrefolioForm.tsx # Formulario pre-servicio
│   │   ├── PruebasActivas.tsx # Pruebas activas (bloqueo, buzzer)
│   │   ├── PruebasPasivas.tsx # Pruebas pasivas (ignición, ubicación)
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

## Flujo de la Aplicación
1. Técnico inicia sesión (Supabase Auth)
2. Ve calendario con servicios asignados
3. Selecciona servicio del día
4. Completa formulario de prefolio (escanea ESN, VIN, placa)
5. Realiza pruebas pasivas (ignición, botón pánico, ubicación)
6. Realiza pruebas activas (bloqueo, desbloqueo, buzzer)
7. Completa formulario de cierre
8. Servicio finalizado

## Notas de Desarrollo
- La app requiere conexión a un proyecto Supabase externo existente
- Las migraciones en `/supabase/migrations/` definen el esquema de BD
- Puerto de desarrollo: 5000

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
