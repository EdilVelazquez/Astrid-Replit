/*
  # Fix RLS Policies for prefolio_fotos

  ## Changes

  Replace overly permissive RLS policies on `prefolio_fotos` table with
  proper authenticated user policies to prevent Row Level Security violations.

  ## Security Updates

  1. Drop existing public policies
  2. Create new policies restricted to authenticated users
  3. Ensure `created_by` is automatically set to the authenticated user

  ## New Policies

  - Allow authenticated users to read all prefolio photos
  - Allow authenticated users to insert photos (with created_by = auth.uid())
  - Allow authenticated users to update their own photos
  - Allow authenticated users to delete their own photos
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow public read access to prefolio_fotos" ON prefolio_fotos;
DROP POLICY IF EXISTS "Allow public insert access to prefolio_fotos" ON prefolio_fotos;
DROP POLICY IF EXISTS "Allow public update access to prefolio_fotos" ON prefolio_fotos;
DROP POLICY IF EXISTS "Allow public delete access to prefolio_fotos" ON prefolio_fotos;

-- Ensure created_by has a default value
DO $$
BEGIN
  -- Check if column needs default update
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prefolio_fotos'
    AND column_name = 'created_by'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE prefolio_fotos
    ALTER COLUMN created_by SET DEFAULT auth.uid();
  END IF;
END $$;

-- Create restrictive policies for authenticated users

-- SELECT policy: Authenticated users can read all photos
CREATE POLICY "Authenticated users can read prefolio_fotos"
  ON prefolio_fotos
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy: Authenticated users can insert with their own user ID
CREATE POLICY "Authenticated users can insert their own prefolio_fotos"
  ON prefolio_fotos
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE policy: Authenticated users can update their own photos
CREATE POLICY "Authenticated users can update their own prefolio_fotos"
  ON prefolio_fotos
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE policy: Authenticated users can delete their own photos
CREATE POLICY "Authenticated users can delete their own prefolio_fotos"
  ON prefolio_fotos
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
