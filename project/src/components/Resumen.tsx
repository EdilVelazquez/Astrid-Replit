import { useState } from 'react';
import { FileText, Save, Loader2 } from 'lucide-react';
import { AppState } from '../types';
import { guardarValidacion } from '../services/expedienteService';

interface ResumenProps {
  state: AppState;
}

export function Resumen({ state }: ResumenProps) {
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const todasExitosas =
    state.ignicion_exitosa &&
    state.boton_exitoso &&
    state.ubicacion_exitosa &&
    state.bloqueo_exitoso &&
    state.buzzer_exitoso;

  const resumen = {
    status: todasExitosas ? 'pruebas_exitosas' : 'con_fallos',
    work_order_name: state.expediente_actual?.work_order_name || '',
    appointment_name: state.expediente_actual?.appointment_name || '',
    technician_name: state.expediente_actual?.technician_name || '',
    device_esn: state.esn,
    timestamp_generacion: new Date().toISOString(),
    pruebas: {
      ignicion: {
        exitosa: state.ignicion_exitosa,
        timestamp: state.ignicion_exitosa ? new Date().toISOString() : null
      },
      boton_panico: {
        exitoso: state.boton_exitoso,
        timestamp: state.boton_exitoso ? new Date().toISOString() : null
      },
      ubicacion: {
        exitosa: state.ubicacion_exitosa,
        timestamp: state.ubicacion_exitosa ? new Date().toISOString() : null
      },
      bloqueo_motor: {
        exitoso: state.bloqueo_exitoso,
        timestamp: state.bloqueo_exitoso ? new Date().toISOString() : null
      },
      buzzer: {
        exitoso: state.buzzer_exitoso,
        timestamp: state.buzzer_exitoso ? new Date().toISOString() : null
      }
    },
    detalles_vehiculo: {
      license_plate: state.expediente_actual?.asset_placas || null,
      vin: state.expediente_actual?.asset_vin || null,
      brand: state.expediente_actual?.asset_marca || null,
      model: state.expediente_actual?.asset_submarca || null,
      year: state.expediente_actual?.vehicle_year || null,
      color: state.expediente_actual?.asset_color || null,
      odometer: state.expediente_actual?.vehicle_odometer || null
    }
  };

  const handleGuardar = async () => {
    if (!state.expediente_actual) return;

    setGuardando(true);
    const exito = await guardarValidacion(
      state.expediente_actual.id,
      resumen,
      todasExitosas ? 'Pruebas exitosas' : 'Con fallos'
    );

    setGuardando(false);
    if (exito) {
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-800">Resumen de validación</h2>
        </div>

        <button
          onClick={handleGuardar}
          disabled={guardando || guardadoExitoso}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {guardando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : guardadoExitoso ? (
            <>✓ Guardado</>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar en BD
            </>
          )}
        </button>
      </div>

      <div className={`p-4 rounded-lg mb-4 ${todasExitosas ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <p className={`font-semibold ${todasExitosas ? 'text-green-800' : 'text-red-800'}`}>
          Estado: {resumen.status === 'pruebas_exitosas' ? '✓ Pruebas exitosas' : '✗ Con fallos'}
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
        <pre>{JSON.stringify(resumen, null, 2)}</pre>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          <strong>TODO:</strong> Conectar con POST /sessions/commands para enviar comandos
        </p>
        <p>
          <strong>TODO:</strong> Implementar lectura de estado por ESN desde backend
        </p>
      </div>
    </div>
  );
}
