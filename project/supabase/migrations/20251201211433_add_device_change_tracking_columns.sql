/*
  # Add Device Change Tracking Columns

  ## Purpose
  Track device (ESN) changes within expedientes_servicio to maintain a complete audit trail
  when technicians need to replace a device during service validation.

  ## Changes
  
  1. New Columns Added to `expedientes_servicio`
    - `device_esn_anterior` (text): Stores the previous ESN when a change occurs
    - `device_esn_cambio_motivo` (text): Selected reason for the device change
    - `device_esn_cambio_descripcion` (text): Additional description from the technician
    - `device_esn_cambio_timestamp` (timestamptz): Timestamp when the change was made
    - `device_esn_cambio_cantidad` (integer): Counter tracking total number of changes
  
  2. Indexes
    - Index on `device_esn_anterior` for fast historical queries
    - Index on `device_esn_cambio_cantidad` for reporting purposes
  
  ## Use Cases
  - Technician enters wrong ESN (typo)
  - Device is physically damaged
  - Device doesn't respond to commands (ignition, lock, buzzer, etc.)
  - Device needs to be replaced for any technical reason
  
  ## Important Notes
  - When a device is changed, device_test_sessions MUST be reset completely
  - All test flags return to false and the validation process restarts
  - This ensures data integrity and proper test validation for the new device
*/

-- Add device change tracking columns to expedientes_servicio
DO $$
BEGIN
  -- Add device_esn_anterior column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expedientes_servicio' AND column_name = 'device_esn_anterior'
  ) THEN
    ALTER TABLE expedientes_servicio ADD COLUMN device_esn_anterior text;
  END IF;

  -- Add device_esn_cambio_motivo column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expedientes_servicio' AND column_name = 'device_esn_cambio_motivo'
  ) THEN
    ALTER TABLE expedientes_servicio ADD COLUMN device_esn_cambio_motivo text;
  END IF;

  -- Add device_esn_cambio_descripcion column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expedientes_servicio' AND column_name = 'device_esn_cambio_descripcion'
  ) THEN
    ALTER TABLE expedientes_servicio ADD COLUMN device_esn_cambio_descripcion text;
  END IF;

  -- Add device_esn_cambio_timestamp column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expedientes_servicio' AND column_name = 'device_esn_cambio_timestamp'
  ) THEN
    ALTER TABLE expedientes_servicio ADD COLUMN device_esn_cambio_timestamp timestamptz;
  END IF;

  -- Add device_esn_cambio_cantidad column with default 0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expedientes_servicio' AND column_name = 'device_esn_cambio_cantidad'
  ) THEN
    ALTER TABLE expedientes_servicio ADD COLUMN device_esn_cambio_cantidad integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_expedientes_device_esn_anterior 
  ON expedientes_servicio(device_esn_anterior) 
  WHERE device_esn_anterior IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expedientes_device_cambio_cantidad 
  ON expedientes_servicio(device_esn_cambio_cantidad) 
  WHERE device_esn_cambio_cantidad > 0;

-- Add comment to table explaining the change tracking
COMMENT ON COLUMN expedientes_servicio.device_esn_anterior IS 'Previous ESN before device change';
COMMENT ON COLUMN expedientes_servicio.device_esn_cambio_motivo IS 'Reason for device change (predefined or custom)';
COMMENT ON COLUMN expedientes_servicio.device_esn_cambio_descripcion IS 'Additional description from technician about the change';
COMMENT ON COLUMN expedientes_servicio.device_esn_cambio_timestamp IS 'Timestamp when the device change was made';
COMMENT ON COLUMN expedientes_servicio.device_esn_cambio_cantidad IS 'Total number of times the device has been changed';