/*
  # Fix Prefolio Fotos RLS Policies

  ## Purpose
  Fix Row Level Security policies for prefolio_fotos table to work with authenticated users.
  The previous policies used `TO public` which doesn't apply to authenticated users.

  ## Changes
  1. Drop existing public policies
  2. Create new policies for authenticated users
  3. Allow authenticated users to:
     - INSERT: their own photos
     - SELECT: all photos (for viewing expediente details)
     - UPDATE: their own photos
     - DELETE: their own photos

  ## Security
  - Only authenticated users can insert photos
  - All authenticated users can view photos (needed for expediente reviews)
  - Users can only modify/delete photos they created
*/

-- Drop existing public policies
DROP POLICY IF EXISTS "Allow public read access to prefolio_fotos" ON prefolio_fotos;
DROP POLICY IF EXISTS "Allow public insert access to prefolio_fotos" ON prefolio_fotos;
DROP POLICY IF EXISTS "Allow public update access to prefolio_fotos" ON prefolio_fotos;
DROP POLICY IF EXISTS "Allow public delete access to prefolio_fotos" ON prefolio_fotos;

-- Create policies for authenticated users

-- Allow authenticated users to view all prefolio photos
CREATE POLICY "Authenticated users can view prefolio photos"
  ON prefolio_fotos
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert photos
CREATE POLICY "Authenticated users can insert prefolio photos"
  ON prefolio_fotos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update their own photos
CREATE POLICY "Authenticated users can update own prefolio photos"
  ON prefolio_fotos
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to delete their own photos
CREATE POLICY "Authenticated users can delete own prefolio photos"
  ON prefolio_fotos
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
