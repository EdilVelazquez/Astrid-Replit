import { useState } from 'react';
import { CheckCircle2, Copy, Check } from 'lucide-react';
import { ExpedienteServicio, ValidationSummaryJSON } from '../types';

interface CompletionMessageProps {
  expediente: ExpedienteServicio;
  validationSummary: ValidationSummaryJSON;
}

export function CompletionMessage({ expediente, validationSummary }: CompletionMessageProps) {
  const [copied, setCopied] = useState(false);

  const formatearResultado = (resultado: string) => {
    if (resultado === 'exitoso') return '✅ Exitoso';
    if (resultado === 'no requerido' || resultado === 'no requerida') return '⚪ No requerida';
    return '❌ Fallido';
  };

  const fueRealizada = (resultado: string) => {
    return resultado === 'exitoso';
  };

  const pruebasRealizadas = [
    { nombre: 'Ignición', resultado: validationSummary.pruebas.ignicion },
    { nombre: 'Bloqueo motor', resultado: validationSummary.pruebas.bloqueo },
    { nombre: 'Desbloqueo motor', resultado: validationSummary.pruebas.desbloqueo },
    { nombre: 'Buzzer activación', resultado: validationSummary.pruebas.buzzer_activacion },
    { nombre: 'Buzzer desactivación', resultado: validationSummary.pruebas.buzzer_desactivacion },
    { nombre: 'Botón de pánico', resultado: validationSummary.pruebas.boton_panico },
    { nombre: 'Ubicación', resultado: validationSummary.pruebas.ubicacion },
  ].filter(p => fueRealizada(p.resultado));

  const pruebasParaTexto = pruebasRealizadas.length > 0 
    ? pruebasRealizadas.map(p => `• ${p.nombre}: ${p.resultado}`).join('\n')
    : '• No se realizaron pruebas';

  const formatearFecha = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const mensajeCompleto = `Proceso completado exitosamente.

📋 RESUMEN DE VALIDACIÓN:
• Cliente: ${validationSummary.appointment_name}
• Work Order: ${validationSummary.work_order_name}
• Appointment: ${validationSummary.appointment_name}
• Técnico: ${validationSummary.technician_name}
• ESN Dispositivo: ${validationSummary.device_esn}

✅ PRUEBAS REALIZADAS:
${pruebasParaTexto}

🚗 DATOS DEL VEHÍCULO:
• Marca: ${validationSummary.detalles_vehiculo.marca}
• Modelo: ${validationSummary.detalles_vehiculo.modelo}
• Año: ${validationSummary.detalles_vehiculo.year}
• Color: ${validationSummary.detalles_vehiculo.color}
• Serie/VIN: ${validationSummary.detalles_vehiculo.serie}
• Placas: ${validationSummary.detalles_vehiculo.placas}
• Odómetro: ${validationSummary.detalles_vehiculo.odometro}

📍 UBICACIÓN FINAL: ${validationSummary.ubicacion_final.url_ubicacion}
📅 Completado: ${formatearFecha(validationSummary.timestamp_completado)}

Este servicio queda cerrado permanentemente.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mensajeCompleto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-lg border-2 border-green-400 p-8">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="bg-green-500 rounded-full p-4">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">¡Proceso completado exitosamente!</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              📋 RESUMEN DE VALIDACIÓN
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Cliente:</span> {expediente.client_name}</p>
              <p><span className="font-semibold">Work Order:</span> {validationSummary.work_order_name}</p>
              <p><span className="font-semibold">Appointment:</span> {validationSummary.appointment_name}</p>
              <p><span className="font-semibold">Técnico:</span> {validationSummary.technician_name}</p>
              <p><span className="font-semibold">ESN Dispositivo:</span> <span className="font-mono text-blue-700">{validationSummary.device_esn}</span></p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              ✅ PRUEBAS REALIZADAS
            </h3>
            {pruebasRealizadas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {pruebasRealizadas.map((prueba) => (
                  <p key={prueba.nombre}>
                    <span className="font-semibold">{prueba.nombre}:</span> {formatearResultado(prueba.resultado)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No se realizaron pruebas en este servicio.</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              🚗 DATOS DEL VEHÍCULO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <p><span className="font-semibold">Marca:</span> {validationSummary.detalles_vehiculo.marca}</p>
              <p><span className="font-semibold">Modelo:</span> {validationSummary.detalles_vehiculo.modelo}</p>
              <p><span className="font-semibold">Año:</span> {validationSummary.detalles_vehiculo.year}</p>
              <p><span className="font-semibold">Color:</span> {validationSummary.detalles_vehiculo.color}</p>
              <p><span className="font-semibold">Serie/VIN:</span> <span className="font-mono">{validationSummary.detalles_vehiculo.serie}</span></p>
              <p><span className="font-semibold">Placas:</span> {validationSummary.detalles_vehiculo.placas}</p>
              <p><span className="font-semibold">Odómetro:</span> {validationSummary.detalles_vehiculo.odometro} km</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">📍 Ubicación final:</span>{' '}
                <a
                  href={validationSummary.ubicacion_final.url_ubicacion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Ver en Google Maps
                </a>
              </p>
              <p><span className="font-semibold">📅 Completado:</span> {formatearFecha(validationSummary.timestamp_completado)}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleCopy}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2"
      >
        {copied ? (
          <>
            <Check className="w-5 h-5" />
            ¡Copiado!
          </>
        ) : (
          <>
            <Copy className="w-5 h-5" />
            Copiar resumen completo
          </>
        )}
      </button>

      <p className="text-center text-sm text-gray-600 mt-4">
        Este servicio queda cerrado permanentemente.
      </p>
    </div>
  );
}
