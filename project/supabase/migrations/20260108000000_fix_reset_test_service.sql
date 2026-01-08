/*
  # Corrección de reset_test_service para limpieza total
  
  Esta migración corrige la función reset_test_service para:
  1. Limpiar check-in (check_in_timestamp, check_in_latitude, etc.)
  2. Limpiar cierre_data (datos de documentación final)
  3. Limpiar prefolio_data (fotos del prefolio)
  4. Limpiar device_test_sessions (con formato correcto de ID)
  5. Limpiar webhook_logs
  6. Limpiar notes_terminate (vuelta en falso)
*/

-- Crear tabla webhook_logs si no existe
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER,
  appointment_name VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action VARCHAR(50) NOT NULL,
  payload_summary JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  response_status INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_expediente ON webhook_logs(expediente_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_action ON webhook_logs(action);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON webhook_logs(timestamp);

-- Actualizar función reset_test_service para limpieza TOTAL
CREATE OR REPLACE FUNCTION reset_test_service(service_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_record RECORD;
  today_date DATE;
  expediente_id_str TEXT;
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
  
  -- Construir ID del expediente para device_test_sessions (formato: WO-AP con guión)
  expediente_id_str := service_record.work_order_name || '-' || service_record.appointment_name;

  -- 1. LIMPIAR cierre_data (documentación final)
  DELETE FROM cierre_data WHERE expediente_id = service_id;
  
  -- 2. LIMPIAR prefolio_data (fotos del prefolio)
  DELETE FROM prefolio_data WHERE expediente_id = service_id;
  
  -- 3. LIMPIAR device_test_sessions (sesiones de pruebas) - usar string correcto
  DELETE FROM device_test_sessions WHERE expediente_id = expediente_id_str;
  
  -- 4. LIMPIAR webhook_logs
  DELETE FROM webhook_logs WHERE expediente_id = service_id;
  
  -- 5. Reiniciar el servicio con valores iniciales
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
    company_id = service_record.company_id,

    -- Actualizar fechas al día actual (8:00 AM - 5:00 PM)
    scheduled_start_time = (today_date || ' 08:00:00')::TIMESTAMP,
    scheduled_end_time = (today_date || ' 17:00:00')::TIMESTAMP,

    -- REINICIAR CHECK-IN (CRÍTICO - antes faltaba)
    check_in_timestamp = NULL,
    check_in_latitude = NULL,
    check_in_longitude = NULL,
    check_in_distance = NULL,

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
    
    -- Reiniciar vuelta en falso
    notes_terminate = NULL,

    -- Actualizar timestamp
    updated_at = NOW()
  WHERE id = service_id;

  RETURN true;
END;
$$;

-- Actualizar comentario
COMMENT ON FUNCTION reset_test_service IS 'Reinicia un servicio de prueba a su estado inicial COMPLETO, incluyendo check-in, pruebas, cierre y fotos';
