import { useEffect, useState } from 'react';
import { Power, AlertTriangle, MapPin, CheckCircle, Loader2, StopCircle, PlayCircle, X } from 'lucide-react';
import { useDevicePassiveStatus } from '../hooks/useDevicePassiveStatus';

interface PruebasPasivasProps {
  esn: string;
  expedienteId: string;
  pruebasRequeridas: string[];
  ignicionExitosa: boolean;
  botonExitoso: boolean;
  ubicacionExitosa: boolean;
  botonFechaPreguntada: string | null;
  ubicacionFechaPreguntada: string | null;
  esperandoComandoActivo: boolean;
  onSetIgnicionExitosa: (exitoso: boolean) => void;
  onSetBotonExitoso: (exitoso: boolean) => void;
  onSetUbicacionExitosa: (exitoso: boolean) => void;
  onSetBotonFechaPreguntada: (fecha: string) => void;
  onSetUbicacionFechaPreguntada: (fecha: string) => void;
  onErrorPanel?: (error: string) => void;
  onLogConsola?: (mensaje: string) => void;
}

export function PruebasPasivas({
  esn,
  expedienteId,
  pruebasRequeridas,
  ignicionExitosa,
  botonExitoso,
  ubicacionExitosa,
  botonFechaPreguntada,
  ubicacionFechaPreguntada,
  esperandoComandoActivo,
  onSetIgnicionExitosa,
  onSetBotonExitoso,
  onSetUbicacionExitosa,
  onSetBotonFechaPreguntada,
  onSetUbicacionFechaPreguntada,
  onErrorPanel,
  onLogConsola
}: PruebasPasivasProps) {
  const {
    consultando,
    error,
    preguntasPendientes,
    confirmarPreguntaPendiente,
    consultasDetenidas,
    detencionManual,
    detenerConsultasManual,
    reanudarConsultas,
    intentosRealizados,
  } = useDevicePassiveStatus({
    esn,
    expedienteId,
    esperandoComandoActivo,
    ignicionExitosa,
    botonExitoso,
    ubicacionExitosa,
    botonFechaPreguntada,
    ubicacionFechaPreguntada,
    pruebasRequeridas,
    onErrorPanel,
    onLogConsola,
  });

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const requiereIgnicion = pruebasRequeridas.includes('Ignición');
  const requiereBoton = pruebasRequeridas.includes('Botón de pánico');
  const requiereUbicacion = pruebasRequeridas.includes('Ubicación');
  const esModoEspecial = esn === '000000000000000';

  const marcarPruebaManual = (tipo: 'ignicion' | 'boton' | 'ubicacion') => {
    const fechaISO = new Date().toISOString();
    if (tipo === 'ignicion') {
      onSetIgnicionExitosa(true);
      if (onLogConsola) {
        onLogConsola('🧪 [MANUAL] Ignición marcada como exitosa');
      }
    } else if (tipo === 'boton') {
      onSetBotonFechaPreguntada(fechaISO);
      onSetBotonExitoso(true);
      if (onLogConsola) {
        onLogConsola('🧪 [MANUAL] Botón de pánico marcado como exitoso');
      }
    } else if (tipo === 'ubicacion') {
      onSetUbicacionFechaPreguntada(fechaISO);
      onSetUbicacionExitosa(true);
      if (onLogConsola) {
        onLogConsola('🧪 [MANUAL] Ubicación marcada como exitosa');
      }
    }
  };

  useEffect(() => {
    const handlePassiveTestResult = (event: Event) => {
      const customEvent = event as CustomEvent<{
        tipo: string;
        exitoso: boolean;
        fechaISO?: string;
      }>;
      const { tipo, exitoso, fechaISO } = customEvent.detail;

      if (tipo === 'ignicion') {
        onSetIgnicionExitosa(exitoso);
      } else if (tipo === 'boton') {
        if (fechaISO) {
          onSetBotonFechaPreguntada(fechaISO);
        }
        if (exitoso) {
          onSetBotonExitoso(true);
        }
      } else if (tipo === 'ubicacion') {
        if (fechaISO) {
          onSetUbicacionFechaPreguntada(fechaISO);
        }
        if (exitoso) {
          onSetUbicacionExitosa(true);
        }
      }
    };

    window.addEventListener('passive-test-result', handlePassiveTestResult);

    return () => {
      window.removeEventListener('passive-test-result', handlePassiveTestResult);
    };
  }, [
    onSetIgnicionExitosa,
    onSetBotonExitoso,
    onSetUbicacionExitosa,
    onSetBotonFechaPreguntada,
    onSetUbicacionFechaPreguntada,
  ]);

  const handleConfirmar = (tipo: 'boton' | 'ubicacion', confirmado: boolean) => {
    confirmarPreguntaPendiente(tipo, confirmado);
  };

  const handleDetenerClick = () => {
    setMostrarConfirmacion(true);
  };

  const handleConfirmarDetencion = () => {
    detenerConsultasManual();
    setMostrarConfirmacion(false);
  };

  const handleCancelarDetencion = () => {
    setMostrarConfirmacion(false);
  };

  const handleReanudar = () => {
    reanudarConsultas();
  };

  const preguntaBoton = preguntasPendientes.find(p => p.tipo === 'boton');
  const preguntaUbicacion = preguntasPendientes.find(p => p.tipo === 'ubicacion');
  const hayPreguntas = preguntasPendientes.length > 0 && !esperandoComandoActivo;
  const todasPruebasCompletadas =
    (!requiereIgnicion || ignicionExitosa) &&
    (!requiereBoton || botonExitoso) &&
    (!requiereUbicacion || ubicacionExitosa);

  return (
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Pruebas de Validación</h3>
        <div className="flex items-center gap-2">
          {intentosRealizados > 0 && (
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-300">
              <span className="font-medium">{intentosRealizados}/10</span>
              <span className="ml-1">consultas</span>
            </div>
          )}
          {consultando && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-medium">Consultando...</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {consultasDetenidas && !detencionManual && todasPruebasCompletadas && (
        <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-semibold text-green-800">
              Consultas automáticas detenidas
            </p>
          </div>
          <p className="text-xs text-green-700 mt-1">
            Todas las pruebas pasivas requeridas están completas. Ya no se consultará el endpoint.
          </p>
        </div>
      )}

      {consultasDetenidas && !todasPruebasCompletadas && (
        <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <StopCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              Límite de consultas alcanzado ({intentosRealizados}/10)
            </p>
          </div>
          <div className="bg-white p-3 rounded border border-amber-200 mb-3">
            <p className="text-xs font-semibold text-amber-900 mb-2">Estado de pruebas:</p>
            <div className="space-y-1 text-xs">
              {requiereIgnicion && (
                <div className="flex items-center gap-2">
                  {ignicionExitosa ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-amber-600" />
                  )}
                  <span className={ignicionExitosa ? 'text-green-700' : 'text-amber-700'}>
                    Ignición: {ignicionExitosa ? 'Exitosa' : 'Pendiente'}
                  </span>
                </div>
              )}
              {requiereBoton && (
                <div className="flex items-center gap-2">
                  {botonExitoso ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-amber-600" />
                  )}
                  <span className={botonExitoso ? 'text-green-700' : 'text-amber-700'}>
                    Botón de pánico: {botonExitoso ? 'Exitosa' : 'Pendiente'}
                  </span>
                </div>
              )}
              {requiereUbicacion && (
                <div className="flex items-center gap-2">
                  {ubicacionExitosa ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-amber-600" />
                  )}
                  <span className={ubicacionExitosa ? 'text-green-700' : 'text-amber-700'}>
                    Ubicación: {ubicacionExitosa ? 'Exitosa' : 'Pendiente'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleReanudar}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            Reanudar consultas
          </button>
        </div>
      )}

      {detencionManual && (
        <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
          <div className="flex items-center gap-2">
            <StopCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              Consultas detenidas manualmente (modo desarrollo)
            </p>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            Las consultas automáticas están pausadas. Puedes reanudarlas cuando lo desees.
          </p>
        </div>
      )}

      {import.meta.env.DEV && !todasPruebasCompletadas && (
        <div className="mb-4 flex gap-2">
          {!detencionManual ? (
            <button
              onClick={handleDetenerClick}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              Detener consultas (DEV)
            </button>
          ) : (
            <button
              onClick={handleReanudar}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              Reanudar consultas
            </button>
          )}
        </div>
      )}

      {mostrarConfirmacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Confirmar detención de consultas
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              ¿Estás seguro de que deseas detener las consultas automáticas al endpoint?
              Esta acción es solo para desarrollo y puedes reanudarlas en cualquier momento.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmarDetencion}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Sí, detener
              </button>
              <button
                onClick={handleCancelarDetencion}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {requiereIgnicion && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Power className="w-5 h-5 text-blue-500" />
              <h4 className="font-medium text-gray-800">Ignición</h4>
              {ignicionExitosa && <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />}
            </div>
            {ignicionExitosa ? (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm text-green-800 font-medium">✓ Ignición {esModoEspecial ? 'marcada manualmente' : 'detectada automáticamente'}</p>
                <p className="text-xs text-green-700 mt-1">{esModoEspecial ? 'Modo de prueba' : 'El sistema detectó IGNICION=1'}</p>
              </div>
            ) : esModoEspecial ? (
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="text-sm text-purple-800 mb-2">
                  🧪 Modo de prueba - Marcar manualmente
                </p>
                <button
                  onClick={() => marcarPruebaManual('ignicion')}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  ✓ Marcar Ignición como exitosa
                </button>
              </div>
            ) : (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  Detectando ignición automáticamente...
                </p>
                <p className="text-xs text-blue-700 mt-1">Se marcará como exitosa cuando IGNICION=1</p>
              </div>
            )}
          </div>
        )}

        {requiereBoton && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h4 className="font-medium text-gray-800">Botón de pánico</h4>
              {botonExitoso && <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />}
            </div>
            {botonExitoso ? (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm text-green-800">✓ Prueba exitosa {esModoEspecial ? '(marcada manualmente)' : ''}</p>
              </div>
            ) : esModoEspecial ? (
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="text-sm text-purple-800 mb-2">
                  🧪 Modo de prueba - Marcar manualmente
                </p>
                <button
                  onClick={() => marcarPruebaManual('boton')}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  ✓ Marcar Botón de pánico como exitoso
                </button>
              </div>
            ) : preguntaBoton ? (
              <div className="space-y-3">
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                  <p className="text-sm text-amber-800 font-medium mb-1">
                    ¿Esta fecha corresponde a tus pruebas?
                  </p>
                  <p className="text-xs text-amber-700">
                    {preguntaBoton.fecha}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmar('boton', true)}
                    disabled={consultando}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => handleConfirmar('boton', false)}
                    disabled={consultando}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="text-sm text-amber-800">
                  Esperando evento de botón de pánico del dispositivo...
                </p>
              </div>
            )}
          </div>
        )}

        {requiereUbicacion && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <h4 className="font-medium text-gray-800">Ubicación</h4>
              {ubicacionExitosa && <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />}
            </div>
            {ubicacionExitosa ? (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm text-green-800 font-medium">✓ Ubicación confirmada {esModoEspecial ? '(marcada manualmente)' : ''}</p>
                <p className="text-xs text-green-700 mt-1">{esModoEspecial ? 'Modo de prueba' : 'Coordenadas válidas con fecha reciente'}</p>
              </div>
            ) : esModoEspecial ? (
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="text-sm text-purple-800 mb-2">
                  🧪 Modo de prueba - Marcar manualmente
                </p>
                <button
                  onClick={() => marcarPruebaManual('ubicacion')}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  ✓ Marcar Ubicación como exitosa
                </button>
              </div>
            ) : preguntaUbicacion ? (
              <div className="space-y-3">
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm text-green-800 font-medium mb-1">
                    ¿Esta es la ubicación actual de la unidad?
                  </p>
                  <p className="text-xs text-green-700 mb-2">
                    Coordenadas: {preguntaUbicacion.latitud}, {preguntaUbicacion.longitud}
                  </p>
                  <p className="text-xs text-green-700">
                    Fecha: {preguntaUbicacion.fecha}
                  </p>
                </div>

                {preguntaUbicacion.ubicacionMapsUrl && (
                  <div className="w-full h-64 rounded-lg overflow-hidden border border-green-200">
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${preguntaUbicacion.latitud},${preguntaUbicacion.longitud}&zoom=16`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Ubicación del dispositivo"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmar('ubicacion', true)}
                    disabled={consultando}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sí, confirmar ubicación
                  </button>
                  <button
                    onClick={() => handleConfirmar('ubicacion', false)}
                    disabled={consultando}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm text-green-800">
                  Detectando ubicación automáticamente...
                </p>
                <p className="text-xs text-green-700 mt-1">Se solicitará confirmación cuando se detecten coordenadas válidas</p>
              </div>
            )}
          </div>
        )}

        {ignicionExitosa && botonExitoso && ubicacionExitosa && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-medium">
              ✓ Todas las pruebas pasivas completadas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
