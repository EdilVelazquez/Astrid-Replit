/*
  # Add desbloqueo and buzzer_off status columns

  ## Changes
  1. New Columns
    - `desbloqueo_exitoso` (boolean): Whether engine unlock test passed
    - `buzzer_off_exitoso` (boolean): Whether buzzer off test passed

  ## Purpose
  Track independent status for unlock and buzzer-off commands to maintain
  complete test history and enable proper conditional button logic.

  ## Notes
  - These columns allow tracking both lock/unlock and buzzer on/off independently
  - Enables proper UX where unlock is only available after lock confirmation
  - Enables proper UX where buzzer off is only available after buzzer on confirmation
*/

-- Add new columns to device_test_sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_test_sessions' AND column_name = 'desbloqueo_exitoso'
  ) THEN
    ALTER TABLE device_test_sessions ADD COLUMN desbloqueo_exitoso boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_test_sessions' AND column_name = 'buzzer_off_exitoso'
  ) THEN
    ALTER TABLE device_test_sessions ADD COLUMN buzzer_off_exitoso boolean DEFAULT false;
  END IF;
END $$;
