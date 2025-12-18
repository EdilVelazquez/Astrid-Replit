/*
  # Auto-confirmar usuarios al registrarse

  1. Problema
    - Los usuarios se registran pero no confirman su email
    - Supabase requiere confirmación de email para login
    - Esto causa "Invalid login credentials" incluso con password correcto

  2. Solución
    - Crear trigger que auto-confirma usuarios al registrarse
    - Esto elimina la necesidad de confirmación por email

  3. Seguridad
    - La validación de email se hace en el frontend antes de permitir registro
    - Solo dominios autorizados o técnicos con servicios pueden registrarse
*/

-- Crear función que auto-confirma usuarios
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirmar el email del usuario al momento del registro
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que ejecuta la función antes de insertar en auth.users
DROP TRIGGER IF EXISTS auto_confirm_user_on_signup ON auth.users;
CREATE TRIGGER auto_confirm_user_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();
