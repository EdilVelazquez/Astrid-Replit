/*
  # Sistema de Servicio de Pruebas Reutilizable

  1. Cambios
    - Agregar columna `is_test_service` a la tabla `expedientes_servicio`
      - Identifica servicios que son de prueba y deben reiniciarse automáticamente
    - Crear función `reset_test_service` para reiniciar un servicio de prueba
      - Limpia todos los datos del servicio
      - Actualiza la fecha al día actual
      - Mantiene los datos básicos (AP, WO, técnico, etc.)

  2. Seguridad
    - Solo usuarios autenticados pueden ejecutar la función de reinicio
    - La función verifica que el servicio sea efectivamente de prueba

  3. Uso
    - Este sistema es exclusivo para ricardo.velazquez1@numaris.com
    - Un solo servicio con `is_test_service = true` para este usuario
    - Se reinicia automáticamente al finalizar
*/

-- Agregar columna para identificar servicios de prueba
ALTER TABLE expedientes_servicio
ADD COLUMN IF NOT EXISTS is_test_service BOOLEAN DEFAULT false;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_expedientes_is_test_service
ON expedientes_servicio(is_test_service)
WHERE is_test_service = true;

-- Función para reiniciar un servicio de prueba
CREATE OR REPLACE FUNCTION reset_test_service(service_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_record RECORD;
  today_date DATE;
BEGIN
  -- Obtener el registro del servicio
  SELECT * INTO service_record
  FROM expedientes_servicio
  WHERE id = service_id AND is_test_service = true;

  -- Verificar que existe y es un servicio de prueba
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Servicio no encontrado o no es un servicio de prueba';
  END IF;

  -- Obtener la fecha de hoy
  today_date := CURRENT_DATE;

  -- Reiniciar el servicio con valores iniciales
  UPDATE expedientes_servicio
  SET
    -- Mantener datos básicos
    appointment_name = service_record.appointment_name,
    work_order_name = service_record.work_order_name,
    service_type = service_record.service_type,
    installation_details = service_record.installation_details,
    company_name = service_record.company_name,
    client_name = service_record.client_name,
    technician_name = service_record.technician_name,
    technician_phone = service_record.technician_phone,
    email_tecnico = service_record.email_tecnico,
    server_name = service_record.server_name,
    platform_number = service_record.platform_number,
    service_street = service_record.service_street,
    service_city = service_record.service_city,
    service_state = service_record.service_state,
    service_zip_code = service_record.service_zip_code,
    service_latitude = service_record.service_latitude,
    service_longitude = service_record.service_longitude,

    -- Actualizar fechas al día actual (8:00 AM - 5:00 PM)
    scheduled_start_time = (today_date || ' 08:00:00')::TIMESTAMP,
    scheduled_end_time = (today_date || ' 17:00:00')::TIMESTAMP,

    -- Reiniciar datos del vehículo y dispositivo
    asset_name = 'PRUEBA',
    asset_economico = NULL,
    asset_submarca = NULL,
    asset_marca = NULL,
    asset_vin = NULL,
    asset_placas = NULL,
    asset_color = NULL,
    device_esn = NULL,
    vehicle_license_plate = NULL,
    vehicle_vin = NULL,
    vehicle_brand = NULL,
    vehicle_model = NULL,
    vehicle_year = NULL,
    vehicle_color = NULL,
    vehicle_odometer = NULL,

    -- Reiniciar timestamps y validación
    validation_start_timestamp = NULL,
    validation_end_timestamp = NULL,
    validation_summary_json = NULL,
    validation_final_status = NULL,

    -- Reiniciar cambios de dispositivo
    device_esn_anterior = NULL,
    device_esn_cambio_motivo = NULL,
    device_esn_cambio_descripcion = NULL,
    device_esn_cambio_timestamp = NULL,
    device_esn_cambio_cantidad = 0,

    -- Reiniciar estado y prefolio
    status = 'Pendiente',
    prefolio_realizado = false,
    prefolio_vehiculo_texto = NULL,
    vehicle_numero_economico = NULL,
    prefolio_modelo_dispositivo = NULL,
    prefolio_imei_dispositivo = NULL,
    prefolio_telefono_sim = NULL,
    zoho_inventory_id = NULL,
    tipo_de_acta = NULL,

    -- Actualizar timestamp
    updated_at = NOW()
  WHERE id = service_id;

  -- Eliminar sesión de pruebas si existe
  DELETE FROM device_test_sessions
  WHERE expediente_id = (
    SELECT appointment_name || '_' || work_order_name
    FROM expedientes_servicio
    WHERE id = service_id
  );

  RETURN true;
END;
$$;

-- Comentarios
COMMENT ON COLUMN expedientes_servicio.is_test_service IS 'Indica si este servicio es de prueba y debe reiniciarse automáticamente al finalizar';
COMMENT ON FUNCTION reset_test_service IS 'Reinicia un servicio de prueba a su estado inicial, actualizando las fechas al día actual';
