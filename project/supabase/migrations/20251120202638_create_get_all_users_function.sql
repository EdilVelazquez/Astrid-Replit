/*
  # Create Function to Get All Users

  1. New Function
    - `get_all_users_for_admin()` 
    - Only callable by users with 'admin' or 'owner' role
    - Returns all user profiles
    - Uses SECURITY DEFINER to bypass RLS

  2. Security
    - Validates that caller is admin/owner
    - Returns all user data for management purposes
*/

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_id uuid;
BEGIN
  -- Get the caller's user id
  caller_id := auth.uid();
  
  -- Check if caller is admin or owner
  IF NOT is_user_admin(caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins and owners can view all users';
  END IF;
  
  -- Return all users
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.active,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  ORDER BY up.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;
