/*
  # Rollback del Sistema de Roles Restrictivo

  ## Objetivo
  Revertir los cambios que interfieren con la autenticación compartida de Supabase
  entre múltiples proyectos. Eliminar triggers y políticas restrictivas que bloquean
  la creación de usuarios.

  ## Cambios Realizados
  
  1. Eliminación de Componentes Problemáticos
    - Eliminar trigger `on_auth_user_created` que intercepta auth.users
    - Eliminar función `create_user_profile()` 
    - Eliminar función `get_user_role()` usada en políticas restrictivas
    - Eliminar todas las políticas RLS restrictivas de user_profiles

  2. Nueva Estrategia de Políticas RLS
    - Políticas públicas para lectura de user_profiles (usuarios autenticados)
    - Políticas públicas para escritura (permitir gestión desde aplicación)
    - No interferir con auth.users de Supabase
  
  3. Tabla user_profiles
    - Mantener la estructura de la tabla
    - Cambiar a sistema de permisos basado en aplicación
    - No depender de RLS para control de acceso administrativo

  ## Notas Importantes
  - auth.users queda libre para uso de múltiples proyectos
  - user_profiles se vuelve opcional (metadatos adicionales)
  - Control de acceso se maneja en lógica de aplicación
  - Verificación de permisos basada en email_tecnico de expedientes_servicio
*/

-- Eliminar trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar función de creación automática de perfil
DROP FUNCTION IF EXISTS create_user_profile();

-- Eliminar todas las políticas restrictivas existentes
DROP POLICY IF EXISTS "Users can view profiles based on role" ON user_profiles;
DROP POLICY IF EXISTS "Only owners can create profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles based on role" ON user_profiles;
DROP POLICY IF EXISTS "Only owners can delete profiles" ON user_profiles;

-- Eliminar función auxiliar de obtención de roles (ahora que las políticas fueron eliminadas)
DROP FUNCTION IF EXISTS get_user_role(uuid);

-- Crear políticas públicas no restrictivas para usuarios autenticados

-- Permitir que todos los usuarios autenticados lean perfiles
CREATE POLICY "Authenticated users can view profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Permitir que usuarios autenticados creen su propio perfil
CREATE POLICY "Authenticated users can create profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir que usuarios autenticados actualicen perfiles
CREATE POLICY "Authenticated users can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir que usuarios autenticados eliminen perfiles
CREATE POLICY "Authenticated users can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (true);
