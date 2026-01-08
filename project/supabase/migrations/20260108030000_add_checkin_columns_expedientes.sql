-- Migración: Agregar columnas de check-in a expedientes_servicio
-- Fecha: 2026-01-08
-- Descripción: Columnas básicas para registrar check-in en expedientes

-- Agregar columna para timestamp del check-in
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS check_in_timestamp TIMESTAMPTZ;

-- Agregar columnas para coordenadas del técnico
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS check_in_latitude DECIMAL(10,7);

ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS check_in_longitude DECIMAL(10,7);

-- Agregar columna para distancia en metros
ALTER TABLE expedientes_servicio 
ADD COLUMN IF NOT EXISTS check_in_distance DECIMAL(10,2);

-- Comentarios descriptivos
COMMENT ON COLUMN expedientes_servicio.check_in_timestamp IS 'Fecha/hora del check-in del técnico';
COMMENT ON COLUMN expedientes_servicio.check_in_latitude IS 'Latitud GPS del técnico al hacer check-in';
COMMENT ON COLUMN expedientes_servicio.check_in_longitude IS 'Longitud GPS del técnico al hacer check-in';
COMMENT ON COLUMN expedientes_servicio.check_in_distance IS 'Distancia en metros al punto de servicio';
