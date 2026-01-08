-- Migración: Agregar columnas adicionales a check_in_attempts
-- Fecha: 2026-01-08
-- Descripción: Captura ubicación del servicio esperado y motivo de check-in

-- Agregar columnas para ubicación del servicio (punto esperado)
ALTER TABLE check_in_attempts 
ADD COLUMN IF NOT EXISTS service_latitude DECIMAL(10,7);

ALTER TABLE check_in_attempts 
ADD COLUMN IF NOT EXISTS service_longitude DECIMAL(10,7);

-- Agregar columna para motivo de check-in (picklist)
-- Valores: 'ubicacion_unidad', 'direccion_erronea', 'otro', NULL (cuando está dentro de geocerca)
ALTER TABLE check_in_attempts 
ADD COLUMN IF NOT EXISTS checkin_location_reason TEXT;

-- Agregar columna para texto libre cuando motivo es 'otro'
ALTER TABLE check_in_attempts 
ADD COLUMN IF NOT EXISTS checkin_location_reason_other TEXT;

-- Agregar columna para kilómetros de diferencia
ALTER TABLE check_in_attempts 
ADD COLUMN IF NOT EXISTS km_diferencia DECIMAL(10,3);

-- Comentarios descriptivos
COMMENT ON COLUMN check_in_attempts.service_latitude IS 'Latitud del punto de servicio esperado';
COMMENT ON COLUMN check_in_attempts.service_longitude IS 'Longitud del punto de servicio esperado';
COMMENT ON COLUMN check_in_attempts.checkin_location_reason IS 'Motivo cuando ubicación no coincide: ubicacion_unidad, direccion_erronea, otro';
COMMENT ON COLUMN check_in_attempts.checkin_location_reason_other IS 'Texto libre cuando checkin_location_reason es otro';
COMMENT ON COLUMN check_in_attempts.km_diferencia IS 'Distancia en kilómetros entre ubicación esperada y real del técnico';
