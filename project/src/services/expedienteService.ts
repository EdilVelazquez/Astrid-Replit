import { supabase } from '../supabaseClient';
import { ExpedienteServicio } from '../types';

export async function obtenerServiciosPorEmailTecnico(
  emailTecnico: string
): Promise<ExpedienteServicio[]> {
  const hoy = new Date();
  const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

  const { data, error } = await supabase
    .from('expedientes_servicio')
    .select('*')
    .eq('email_tecnico', emailTecnico)
    .gte('scheduled_start_time', inicioDelDia.toISOString())
    .lte('scheduled_start_time', finDelDia.toISOString())
    .order('scheduled_start_time', { ascending: true });

  if (error) {
    console.error('Error obteniendo servicios por email:', error);
    return [];
  }

  return (data as ExpedienteServicio[]) || [];
}

export async function obtenerTodosLosServiciosPorEmailTecnico(
  emailTecnico: string
): Promise<ExpedienteServicio[]> {
  const { data, error } = await supabase
    .from('expedientes_servicio')
    .select('*')
    .eq('email_tecnico', emailTecnico)
    .order('scheduled_start_time', { ascending: false });

  if (error) {
    console.error('Error obteniendo todos los servicios por email:', error);
    return [];
  }

  return (data as ExpedienteServicio[]) || [];
}

export async function obtenerExpedientePorId(id: number): Promise<ExpedienteServicio | null> {
  const { data, error } = await supabase
    .from('expedientes_servicio')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error obteniendo expediente:', error);
    return null;
  }

  return data as ExpedienteServicio | null;
}

export async function actualizarExpediente(
  id: number,
  updates: Partial<ExpedienteServicio>
): Promise<boolean> {
  try {
    if (!id || typeof id !== 'number') {
      console.error('Invalid expediente ID:', id);
      return false;
    }

    if (!updates || Object.keys(updates).length === 0) {
      console.error('No updates provided');
      return false;
    }

    const { data, error } = await supabase
      .from('expedientes_servicio')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error actualizando expediente:', {
        error,
        id,
        updates,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }

    if (!data || data.length === 0) {
      console.error('No rows updated for expediente ID:', id);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in actualizarExpediente:', error);
    return false;
  }
}

export async function guardarValidacion(
  id: number,
  validationSummaryJson: any,
  validationFinalStatus: string
): Promise<boolean> {
  const { error } = await supabase
    .from('expedientes_servicio')
    .update({
      validation_summary_json: validationSummaryJson,
      validation_final_status: validationFinalStatus,
      validation_end_timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error guardando validación:', error);
    return false;
  }

  return true;
}

export async function finalizarValidacionConExito(
  id: number,
  validationSummaryJson: any
): Promise<boolean> {
  const { error } = await supabase
    .from('expedientes_servicio')
    .update({
      validation_end_timestamp: new Date().toISOString(),
      validation_final_status: 'COMPLETADO',
      validation_summary_json: validationSummaryJson,
      status: 'pruebas_exitosas',
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error finalizando validación:', error);
    return false;
  }

  return true;
}

export async function guardarDatosVehiculo(
  id: number,
  vehicleData: {
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_year: string;
    vehicle_color: string;
    vehicle_vin: string;
    vehicle_license_plate: string;
    vehicle_odometer: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('expedientes_servicio')
    .update({
      vehicle_brand: vehicleData.vehicle_brand,
      vehicle_model: vehicleData.vehicle_model,
      vehicle_year: vehicleData.vehicle_year,
      vehicle_color: vehicleData.vehicle_color,
      vehicle_vin: vehicleData.vehicle_vin,
      vehicle_license_plate: vehicleData.vehicle_license_plate,
      vehicle_odometer: parseFloat(vehicleData.vehicle_odometer) || 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error guardando datos de vehículo:', error);
    return false;
  }

  return true;
}

export async function obtenerExpedienteCompleto(
  id: number
): Promise<ExpedienteServicio | null> {
  const { data, error } = await supabase
    .from('expedientes_servicio')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error obteniendo expediente completo:', error);
    return null;
  }

  return data as ExpedienteServicio | null;
}

export async function buscarServicioPorAppointmentName(
  appointmentName: string,
  emailTecnico: string
): Promise<ExpedienteServicio | null> {
  const { data, error } = await supabase
    .from('expedientes_servicio')
    .select('*')
    .eq('appointment_name', appointmentName)
    .eq('email_tecnico', emailTecnico)
    .order('scheduled_start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error buscando servicio por appointment_name:', error);
    return null;
  }

  return data as ExpedienteServicio | null;
}

export async function registrarCambioDispositivo(
  id: number,
  esnAnterior: string,
  nuevoESN: string,
  motivo: string,
  descripcion: string,
  cantidadActual: number,
  zohoInventoryId?: string,
  modeloDispositivo?: string,
  imei?: string,
  telefonoSim?: string
): Promise<boolean> {
  try {
    const updateData: any = {
      device_esn_anterior: esnAnterior,
      device_esn: nuevoESN,
      device_esn_cambio_motivo: motivo,
      device_esn_cambio_descripcion: descripcion,
      device_esn_cambio_timestamp: new Date().toISOString(),
      device_esn_cambio_cantidad: cantidadActual + 1,
      validation_start_timestamp: new Date().toISOString(),
      validation_final_status: 'PRUEBAS EN CURSO',
      status: 'Pruebas en curso',
      prefolio_modelo_dispositivo: modeloDispositivo || null,
      prefolio_imei_dispositivo: imei || null,
      prefolio_telefono_sim: telefonoSim || null,
      zoho_inventory_id: zohoInventoryId || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('expedientes_servicio')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error registrando cambio de dispositivo:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('No rows updated when registering device change for expediente ID:', id);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in registrarCambioDispositivo:', error);
    return false;
  }
}
