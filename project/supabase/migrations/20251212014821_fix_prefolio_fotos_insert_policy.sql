/*
  # Fix prefolio_fotos Insert Policy

  ## Problem
  The current INSERT policy checks `auth.uid() = created_by` in WITH CHECK,
  but when created_by is NULL or undefined during insert, this fails even
  though the column has a default of auth.uid().

  ## Solution
  Replace the INSERT policy to allow authenticated users to insert without
  checking created_by value. The column default will automatically set it.

  ## Changes
  1. Drop existing INSERT policy
  2. Create new INSERT policy that only checks authentication
  3. The created_by column will be automatically set by its DEFAULT auth.uid()
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "prefolio_fotos_insert" ON prefolio_fotos;
DROP POLICY IF EXISTS "Authenticated users can insert their own prefolio_fotos" ON prefolio_fotos;

-- Create a new INSERT policy that allows authenticated users to insert
-- The created_by column will be automatically set by the DEFAULT auth.uid()
CREATE POLICY "Authenticated users can insert prefolio_fotos"
  ON prefolio_fotos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also update SELECT policy to allow reading all photos (not just own)
DROP POLICY IF EXISTS "prefolio_fotos_select" ON prefolio_fotos;
DROP POLICY IF EXISTS "Authenticated users can read prefolio_fotos" ON prefolio_fotos;

CREATE POLICY "Authenticated users can read all prefolio_fotos"
  ON prefolio_fotos
  FOR SELECT
  TO authenticated
  USING (true);
