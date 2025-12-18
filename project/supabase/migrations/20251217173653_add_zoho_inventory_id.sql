/*
  # Agregar campo para ID de inventario de Zoho

  1. Cambios
    - Agregar columna `zoho_inventory_id` a la tabla `expedientes_servicio`
    - Campo tipo TEXT para almacenar el ID del equipo en el inventario de Zoho CRM
    - Permite valores NULL ya que no todos los equipos pueden estar en el inventario

  2. Propósito
    - Enlazar el equipo instalado con el registro de inventario en Zoho CRM
    - Facilitar la trazabilidad del equipo desde la captura del ESN
    - Almacenar la referencia automática obtenida del servicio de búsqueda de inventario
*/

-- Agregar columna zoho_inventory_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expedientes_servicio' AND column_name = 'zoho_inventory_id'
  ) THEN
    ALTER TABLE expedientes_servicio ADD COLUMN zoho_inventory_id TEXT;
    COMMENT ON COLUMN expedientes_servicio.zoho_inventory_id IS 'ID del equipo en el inventario de Zoho CRM';
  END IF;
END $$;
