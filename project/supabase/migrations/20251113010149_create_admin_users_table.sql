/*
  # Create Admin Users Management System

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique, not null) - Email del administrador
      - `role` (text, not null) - Rol: 'owner' o 'admin'
      - `created_at` (timestamptz) - Fecha de creación
      - `created_by` (uuid) - Usuario que creó este admin
      - `active` (boolean) - Si el admin está activo

  2. Security
    - Enable RLS on `admin_users` table
    - Only owners can insert/update/delete admin records
    - All authenticated users can read to check permissions

  3. Initial Data
    - Insert daniel.sanchez@numaris.com as the first owner

  4. Notes
    - This table is separate from user_profiles
    - It only stores admin/owner accounts
    - Regular users (técnicos) are validated via expedientes_servicio.email_tecnico
    - This allows flexible admin management without affecting the main user system
*/

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read (needed to check permissions)
CREATE POLICY "Anyone authenticated can read admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only owners can insert new admins
CREATE POLICY "Only owners can create admins"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'owner'
      AND active = true
    )
  );

-- Policy: Only owners can update admins
CREATE POLICY "Only owners can update admins"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'owner'
      AND active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'owner'
      AND active = true
    )
  );

-- Policy: Only owners can delete admins
CREATE POLICY "Only owners can delete admins"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'owner'
      AND active = true
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(active);
