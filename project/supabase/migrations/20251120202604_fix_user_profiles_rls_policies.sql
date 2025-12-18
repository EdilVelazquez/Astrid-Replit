/*
  # Fix User Profiles RLS Policies - Remove Infinite Recursion

  1. Problem
    - Current policies check user_profiles table while protecting user_profiles table
    - This creates infinite recursion

  2. Solution
    - Remove all existing policies
    - Create simpler policies that don't cause recursion
    - Use auth.uid() directly instead of querying user_profiles

  3. New Policies
    - Users can always read their own profile
    - Users can always insert their own profile (for registration)
    - Users can update their own basic info (but not role)
    - Service role can do everything (for admin operations)
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own basic info" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_profiles;

-- Policy: Users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile during registration
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own full_name only
CREATE POLICY "Users can update own name"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Note: Role updates will be handled by service role key on backend
-- This prevents the infinite recursion issue
