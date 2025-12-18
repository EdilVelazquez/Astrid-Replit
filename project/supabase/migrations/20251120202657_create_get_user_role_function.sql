/*
  # Create Function to Get User Role

  1. New Function
    - `get_user_role(user_id uuid)` 
    - Returns the role of any user
    - Uses SECURITY DEFINER to bypass RLS
    - Used for permission checks throughout the app

  2. Security
    - Anyone can check any user's role (needed for permission checks)
    - Only returns the role, not sensitive data
*/

CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id
  AND active = true;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
