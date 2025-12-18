/*
  # Sistema de Roles y Usuarios

  1. Nuevas Tablas
    - `user_profiles`
      - `id` (uuid, FK a auth.users)
      - `email` (text, único)
      - `full_name` (text)
      - `role` (text: 'owner', 'admin', 'user')
      - `active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Seguridad
    - Enable RLS en `user_profiles`
    - Políticas restrictivas:
      - Owners pueden ver y gestionar todos los usuarios
      - Admins pueden ver todos los usuarios y gestionar users
      - Users solo pueden ver su propio perfil
    - Trigger automático para crear perfil al registrarse
  
  3. Notas importantes
    - El primer usuario se debe crear manualmente como 'owner'
    - Los roles siguen jerarquía: owner > admin > user
    - Solo owners pueden crear/modificar admins
*/

-- Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
  SELECT role FROM user_profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas de seguridad para user_profiles

-- SELECT: Owners y admins pueden ver todos, users solo su perfil
CREATE POLICY "Users can view profiles based on role"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- INSERT: Solo owners pueden crear perfiles
CREATE POLICY "Only owners can create profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = 'owner'
  );

-- UPDATE: Owners pueden actualizar todos, admins pueden actualizar users, users pueden actualizar su perfil (excepto role)
CREATE POLICY "Users can update profiles based on role"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    get_user_role(auth.uid()) = 'owner' OR
    (get_user_role(auth.uid()) = 'admin' AND role = 'user')
  )
  WITH CHECK (
    (id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())) OR
    get_user_role(auth.uid()) = 'owner' OR
    (get_user_role(auth.uid()) = 'admin' AND role = 'user')
  );

-- DELETE: Solo owners pueden eliminar perfiles
CREATE POLICY "Only owners can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner'
  );

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role, active)
  VALUES (NEW.id, NEW.email, 'user', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(active);