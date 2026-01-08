export interface ExpedienteServicio {
  id: number;
  appointment_id: string;
  appointment_name: string | null;
  work_order_id: string | null;
  work_order_name: string | null;
  service_type: string | null;
  installation_details: string | null;
  asset_name: string | null;
  asset_economico: string | null;
  asset_submarca: string | null;
  asset_marca: string | null;
  asset_vin: string | null;
  asset_placas: string | null;
  asset_color: string | null;
  company_name: string | null;
  company_Id: string | null;
  client_name: string | null;
  technician_name: string | null;
  technician_phone: string | null;
  email_tecnico: string | null;
  server_name: string | null;
  platform_number: string | null;
  service_street: string | null;
  service_city: string | null;
  service_state: string | null;
  service_zip_code: string | null;
  service_latitude: number | null;
  service_longitude: number | null;
  status: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  device_esn: string | null;
  vehicle_license_plate: string | null;
  vehicle_vin: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  vehicle_color: string | null;
  vehicle_odometer: number | null;
  validation_start_timestamp: string | null;
  validation_end_timestamp: string | null;
  validation_summary_json: any | null;
  validation_final_status: string | null;
  device_esn_anterior: string | null;
  device_esn_cambio_motivo: string | null;
  device_esn_cambio_descripcion: string | null;
  device_esn_cambio_timestamp: string | null;
  device_esn_cambio_cantidad: number;
  created_at: string;
  updated_at: string;
  tipo_de_acta?: string | null;
  prefolio_realizado?: boolean;
  prefolio_vehiculo_texto?: string | null;
  vehicle_numero_economico?: string | null;
  prefolio_modelo_dispositivo?: string | null;
  prefolio_imei_dispositivo?: string | null;
  prefolio_telefono_sim?: string | null;
  zoho_inventory_id?: string | null;
  is_test_service?: boolean;
  check_in_timestamp?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_in_distance?: number | null;
  notes_terminate?: string | null;
}

export interface ValidationSummaryJSON {
  status: string;
  work_order_name: string;
  appointment_name: string;
  technician_name: string;
  device_esn: string;
  pruebas: {
    boton_panico: string;
    bloqueo: string;
    desbloqueo: string;
    buzzer_activacion: string;
    buzzer_desactivacion: string;
    ignicion: string;
    ubicacion: string;
  };
  detalles_vehiculo: {
    marca: string;
    modelo: string;
    year: string;
    color: string;
    serie: string;
    placas: string;
    nombre_economico: string;
    odometro: string;
  };
  ubicacion_final: {
    ubicacion_confirmada: boolean;
    fecha_ultimo_reporte: string;
    url_ubicacion: string;
  };
  timestamp_completado: string;
  resumen: string;
}

export interface AppState {
  email_tecnico: string;
  esn: string;
  expediente_actual: ExpedienteServicio | null;
  ignicion_exitosa: boolean;
  boton_exitoso: boolean;
  ubicacion_exitosa: boolean;
  bloqueo_exitoso: boolean;
  desbloqueo_exitoso: boolean;
  buzzer_exitoso: boolean;
  buzzer_off_exitoso: boolean;
  boton_fecha_preguntada: string | null;
  ubicacion_fecha_preguntada: string | null;
  esperando_respuesta_comando_activo: boolean;
  comando_activo_tipo: string | null;
  comando_activo_estado: 'enviando' | 'esperando' | null;
  comando_activo_timestamp: number | null;
}

export interface EstatusGralDevice {
  BLOQUEO: number;
  FECHA_BLOQUEO: string | null;
  BUZER: number;
  FECHA_BUZER: string | null;
  IGNICION: number;
  BOTON: string | null;
  ODOMETRO: number;
  LATITUD: string;
  LONGITUD: string;
  UBICACIONMAPS: string;
  FECHA_EVENTO: string;
}

export interface EstatusGralResponse {
  response: EstatusGralDevice[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'user';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
}

export interface CheckInAttempt {
  id?: number;
  appointment_name: string;
  attempt_timestamp?: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  was_successful: boolean;
  geofence_radius: number;
  km_diferencia?: number;
  checkin_location_reason?: 'ubicacion_unidad' | 'direccion_erronea' | 'otro' | null;
  checkin_location_reason_other?: string | null;
}

export interface DeviceChangeData {
  nuevoESN: string;
  motivo: string;
  descripcion: string;
}

export interface DeviceChangeRequest {
  expedienteId: number;
  esnActual: string;
  esnNuevo: string;
  motivo: string;
  descripcion: string;
  cantidadCambiosActual: number;
}

export interface PrefolioFoto {
  id?: number;
  expediente_id: number;
  campo: string;
  file_path: string;
  created_at?: string;
  created_by?: string;
}

export interface PrefolioDatos {
  prefolio_realizado: boolean;
  asset_marca?: string;
  asset_submarca?: string;
  asset_vin?: string;
  vehicle_odometer?: number;
  asset_placas?: string;
  asset_color?: string;
  asset_economico?: string;
  vehicle_year?: string;
  service_type?: string;
  prefolio_modelo_dispositivo?: string;
  device_esn?: string;
  prefolio_imei_dispositivo?: string;
  prefolio_telefono_sim?: string;
  zoho_inventory_id?: string;
}

export interface PrefolioFotosUpload {
  fotos_vehiculo: File[];
  foto_odometro: File | null;
  foto_vin: File | null;
}

export type AppAction =
  | { type: 'SET_EMAIL_TECNICO'; payload: string }
  | { type: 'SET_EXPEDIENTE'; payload: ExpedienteServicio }
  | { type: 'SET_ESN'; payload: string }
  | { type: 'START_COMANDO_ACTIVO'; payload: { tipo: string } }
  | { type: 'COMANDO_ENVIADO' }
  | { type: 'CONFIRMAR_COMANDO'; payload: { exitoso: boolean } }
  | { type: 'SET_IGNICION_EXITOSA'; payload: boolean }
  | { type: 'SET_BOTON_EXITOSO'; payload: boolean }
  | { type: 'SET_UBICACION_EXITOSA'; payload: boolean }
  | { type: 'SET_BLOQUEO_EXITOSO'; payload: boolean }
  | { type: 'SET_DESBLOQUEO_EXITOSO'; payload: boolean }
  | { type: 'SET_BUZZER_EXITOSO'; payload: boolean }
  | { type: 'SET_BUZZER_OFF_EXITOSO'; payload: boolean }
  | { type: 'SET_BOTON_FECHA_PREGUNTADA'; payload: string }
  | { type: 'SET_UBICACION_FECHA_PREGUNTADA'; payload: string }
  | { type: 'LOAD_SAVED_SESSION'; payload: Partial<AppState> }
  | { type: 'RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO' }
  | { type: 'RESET' };
