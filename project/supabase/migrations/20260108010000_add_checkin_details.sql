-- Migración: Agregar columnas de detalles de check-in
-- Fecha: 2026-01-08
-- Descripción: Captura ubicación del técnico, diferencia en KM y motivo de check-in

-- Agregar columna para ubicación del técnico (lat,lng)
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS technician_location_checkin TEXT;

-- Agregar columna para diferencia en kilómetros
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS km_diferencia_checkin DECIMAL(10,3);

-- Agregar columna para motivo de check-in (picklist)
-- Valores: 'ubicacion_unidad', 'direccion_erronea', 'otro', NULL (cuando está dentro de geocerca)
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS checkin_location_reason TEXT;

-- Agregar columna para texto libre cuando motivo es 'otro'
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS checkin_location_reason_other TEXT;

-- Agregar check_in_timestamp si no existe (referenciado en código existente)
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS check_in_timestamp TIMESTAMPTZ;

-- Agregar check_in_latitude si no existe
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS check_in_latitude DECIMAL(10,7);

-- Agregar check_in_longitude si no existe
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS check_in_longitude DECIMAL(10,7);

-- Agregar check_in_distance si no existe
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS check_in_distance DECIMAL(10,2);

-- Comentarios descriptivos
COMMENT ON COLUMN expedientes_servicio.technician_location_checkin IS 'Ubicación del técnico al momento del check-in (formato: lat,lng)';
COMMENT ON COLUMN expedientes_servicio.km_diferencia_checkin IS 'Distancia en kilómetros entre ubicación esperada y real del técnico';
COMMENT ON COLUMN expedientes_servicio.checkin_location_reason IS 'Motivo cuando ubicación no coincide: ubicacion_unidad, direccion_erronea, otro';
COMMENT ON COLUMN expedientes_servicio.checkin_location_reason_other IS 'Texto libre cuando checkin_location_reason es otro';
