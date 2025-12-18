/*
  # Create Function to Update User Roles

  1. New Function
    - `update_user_role_by_admin(target_user_id uuid, new_role text)` 
    - Only callable by users with 'admin' or 'owner' role
    - Updates the role of target user
    - Returns success/error message

  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Validates that caller is admin/owner
    - Prevents changing owner role
    - Prevents users from promoting themselves
*/

-- Create function to check if user is admin or owner
CREATE OR REPLACE FUNCTION is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role IN ('owner', 'admin')
    AND active = true
  );
END;
$$;

-- Create function to update user role
CREATE OR REPLACE FUNCTION update_user_role_by_admin(
  target_user_id uuid,
  new_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_id uuid;
  target_current_role text;
  result json;
BEGIN
  -- Get the caller's user id
  caller_id := auth.uid();
  
  -- Check if caller is admin or owner
  IF NOT is_user_admin(caller_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins and owners can update roles'
    );
  END IF;
  
  -- Prevent self-promotion
  IF caller_id = target_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot modify your own role'
    );
  END IF;
  
  -- Get target user's current role
  SELECT role INTO target_current_role
  FROM user_profiles
  WHERE id = target_user_id;
  
  -- Prevent changing owner role
  IF target_current_role = 'owner' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot modify owner role'
    );
  END IF;
  
  -- Validate new role
  IF new_role NOT IN ('admin', 'user') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role. Must be admin or user'
    );
  END IF;
  
  -- Update the role
  UPDATE user_profiles
  SET role = new_role,
      updated_at = now()
  WHERE id = target_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Role updated successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role_by_admin(uuid, text) TO authenticated;
