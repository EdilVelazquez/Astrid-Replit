-- Crear tabla para registro de webhooks enviados
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL,
  appointment_name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action VARCHAR(50) NOT NULL,
  webhook_url TEXT NOT NULL,
  payload_summary TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  response_status INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_expediente_id ON webhook_logs(expediente_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_appointment_name ON webhook_logs(appointment_name);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON webhook_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_action ON webhook_logs(action);

-- Habilitar RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserción desde usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden insertar logs"
  ON webhook_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para permitir lectura desde usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden leer logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (true);

-- Comentario descriptivo
COMMENT ON TABLE webhook_logs IS 'Registro de todos los webhooks enviados durante el flujo de servicios para auditoría';
COMMENT ON COLUMN webhook_logs.action IS 'Tipo de acción: start_work, complete_work, create_asset, edit_asset, terminate';
COMMENT ON COLUMN webhook_logs.success IS 'Indica si el envío del webhook fue exitoso';
COMMENT ON COLUMN webhook_logs.duration_ms IS 'Duración del envío en milisegundos';
