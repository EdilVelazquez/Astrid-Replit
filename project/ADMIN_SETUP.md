# Configuración del Portal de Administrador

## Sistema Implementado

Se ha creado un portal de administrador completo con las siguientes características:

### 1. Sistema de Roles
- **Owner**: Acceso total, puede gestionar todos los usuarios y roles
- **Admin**: Puede ver todos los servicios y gestionar usuarios tipo 'user'
- **User**: Acceso limitado solo a funciones de técnico

### 2. Funcionalidades del Portal

#### Panel de Monitoreo de Servicios
- Vista en tiempo real de todos los servicios del día
- Agrupación por técnico
- Indicadores de estado: Pendiente, En Proceso, Completado
- Progreso detallado de pruebas por servicio
- Auto-refresh cada 10 segundos (configurable)
- Métricas generales: Total, Pendientes, En Proceso, Completados

#### Gestión de Usuarios (Owner/Admin)
- Lista completa de usuarios del sistema
- Edición de nombres y roles
- Activación/desactivación de usuarios
- Indicadores visuales de rol y estado
- Permisos restrictivos según jerarquía

### 3. Seguridad Implementada

#### Row Level Security (RLS)
- Políticas restrictivas en `user_profiles`
- Owners pueden gestionar todo
- Admins solo pueden gestionar usuarios tipo 'user'
- Users solo pueden ver su propio perfil

#### Autenticación
- Login con email/password
- Sesiones seguras con Supabase Auth
- Protección automática de rutas según rol
- Cierre de sesión seguro

## Configuración Inicial

### Paso 1: Crear el Primer Usuario Owner

Como no se puede crear usuarios desde la aplicación sin estar autenticado, el primer usuario debe crearse manualmente:

#### Opción A: Desde el Dashboard de Supabase

1. Ir a Authentication > Users en el dashboard de Supabase
2. Click en "Add user" > "Create new user"
3. Ingresar:
   - Email: tu-email@ejemplo.com
   - Password: tu-contraseña-segura
   - Marcar "Auto Confirm User"
4. Click en "Create user"
5. Ir a Table Editor > user_profiles
6. Encontrar el usuario recién creado
7. Editar el campo `role` y cambiarlo a 'owner'
8. Editar el campo `full_name` con tu nombre

#### Opción B: Con SQL en Supabase

```sql
-- 1. Crear el usuario de autenticación
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@tuempresa.com',
  crypt('TuContraseñaSegura123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- 2. Obtener el ID del usuario recién creado
SELECT id, email FROM auth.users WHERE email = 'admin@tuempresa.com';

-- 3. Actualizar el perfil a owner (reemplaza USER_ID con el ID del paso 2)
UPDATE user_profiles
SET role = 'owner', full_name = 'Tu Nombre'
WHERE id = 'USER_ID';
```

### Paso 2: Acceder al Sistema

1. Abrir la aplicación
2. Verás la pantalla de login
3. Ingresar con el email y contraseña del owner
4. Serás redirigido automáticamente al Panel de Administrador

### Paso 3: Crear Usuarios Adicionales

Una vez autenticado como owner:

1. NO IMPLEMENTADO AÚN: Se necesita un formulario para crear usuarios
2. Por ahora, crear usuarios adicionales desde el Dashboard de Supabase
3. Los nuevos usuarios se crearán con rol 'user' por defecto
4. Desde el panel de administrador, puedes cambiar roles y estados

## Flujo de Uso

### Para Administradores (Owner/Admin)

1. **Login**: Ingresar con credenciales
2. **Monitoreo**: Vista automática de servicios del día
   - Ver progreso de cada técnico
   - Identificar servicios pendientes o en proceso
   - Revisar detalles de pruebas completadas
3. **Gestión de Usuarios**: Cambiar a la pestaña "Gestión de Usuarios"
   - Editar información de usuarios
   - Cambiar roles
   - Activar/desactivar accesos

### Para Técnicos (User)

1. **Login**: Ingresar con credenciales de técnico
2. **Aplicación Técnica**: Acceso directo a la aplicación normal de validación
3. Sin acceso a funciones administrativas

## Características de Seguridad

1. **Autenticación Obligatoria**: No se puede acceder sin login
2. **Roles Jerárquicos**:
   - Owner > Admin > User
   - Cada rol tiene permisos específicos
3. **RLS Activado**: Protección a nivel de base de datos
4. **No pueden**:
   - Admins no pueden modificar otros admins u owners
   - Users no pueden ver otros perfiles
   - Usuarios inactivos no pueden acceder
5. **Sesiones Seguras**: Manejo automático de tokens y sesiones

## Próximas Mejoras Sugeridas

1. ✅ Sistema de roles y autenticación
2. ✅ Panel de monitoreo en tiempo real
3. ✅ Gestión de usuarios
4. ⏳ Formulario de creación de usuarios desde la UI
5. ⏳ Estadísticas y reportes históricos
6. ⏳ Notificaciones push para servicios críticos
7. ⏳ Exportación de reportes en PDF/Excel
8. ⏳ Sistema de comentarios y notas por servicio
9. ⏳ Logs de auditoría de cambios

## Solución de Problemas

### No puedo iniciar sesión
- Verificar que el usuario existe en `auth.users`
- Verificar que el perfil existe en `user_profiles`
- Verificar que el usuario esté activo (`active = true`)

### No veo el panel de administrador
- Verificar que tu rol sea 'owner' o 'admin'
- Los usuarios con rol 'user' ven la aplicación de técnico

### Error de permisos
- Verificar que las políticas RLS estén activas
- Verificar que el rol esté correctamente asignado

## Contacto

Para soporte adicional o mejoras, contactar al equipo de desarrollo.
