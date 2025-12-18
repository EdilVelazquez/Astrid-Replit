import { useState, useEffect } from 'react';
import { Lock, Unlock, Volume2, VolumeX, Loader2, Clock, CheckCircle } from 'lucide-react';
import { enviarComandoDispositivo, COMANDOS } from '../services/commandService';
import { actualizarEstadoPrueba } from '../services/testSessionService';

interface PruebasActivasProps {
  esn: string;
  expedienteId: string;
  pruebasRequeridas: string[];
  bloqueoExitoso: boolean;
  desbloqueoExitoso: boolean;
  buzzerExitoso: boolean;
  buzzerOffExitoso: boolean;
  onSetBloqueoExitoso: (exitoso: boolean) => void;
  onSetDesbloqueoExitoso: (exitoso: boolean) => void;
  onSetBuzzerExitoso: (exitoso: boolean) => void;
  onSetBuzzerOffExitoso: (exitoso: boolean) => void;
  onErrorPanel?: (error: string) => void;
  onLogConsola?: (mensaje: string) => void;
}

type ComandoTipo = 'bloqueo' | 'desbloqueo' | 'buzzer' | 'buzzer-off';
type ComandoEstado = 'enviando' | 'esperando' | null;

interface ComandoInfo {
  estado: ComandoEstado;
  timestamp: number | null;
  segundosRestantes: number;
}

export function PruebasActivas({
  esn,
  expedienteId,
  pruebasRequeridas,
  bloqueoExitoso,
  desbloqueoExitoso,
  buzzerExitoso,
  buzzerOffExitoso,
  onSetBloqueoExitoso,
  onSetDesbloqueoExitoso,
  onSetBuzzerExitoso,
  onSetBuzzerOffExitoso,
  onErrorPanel,
  onLogConsola
}: PruebasActivasProps) {
  const requiereBloqueo = pruebasRequeridas.some(p =>
    p.toLowerCase().includes('bloqueo') || p.toLowerCase().includes('paro de motor')
  );
  const requiereBuzzer = pruebasRequeridas.some(p =>
    p.toLowerCase().includes('buzzer')
  );

  const [comandos, setComandos] = useState<Record<ComandoTipo, ComandoInfo>>({
    bloqueo: { estado: null, timestamp: null, segundosRestantes: 0 },
    desbloqueo: { estado: null, timestamp: null, segundosRestantes: 0 },
    buzzer: { estado: null, timestamp: null, segundosRestantes: 0 },
    'buzzer-off': { estado: null, timestamp: null, segundosRestantes: 0 },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const ahora = Date.now();
      let actualizado = false;

      setComandos(prev => {
        const nuevo = { ...prev };

        (Object.keys(nuevo) as ComandoTipo[]).forEach(tipo => {
          if (nuevo[tipo].estado === 'esperando' && nuevo[tipo].timestamp) {
            const transcurrido = ahora - nuevo[tipo].timestamp!;
            const restante = Math.max(0, Math.floor((3 * 60 * 1000 - transcurrido) / 1000));
            if (restante !== nuevo[tipo].segundosRestantes) {
              nuevo[tipo] = { ...nuevo[tipo], segundosRestantes: restante };
              actualizado = true;
            }
          }
        });

        return actualizado ? nuevo : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const enviarComando = async (tipo: ComandoTipo) => {
    let numeroComando: number;

    switch (tipo) {
      case 'bloqueo':
        numeroComando = COMANDOS.BLOQUEO;
        break;
      case 'desbloqueo':
        numeroComando = COMANDOS.DESBLOQUEO;
        break;
      case 'buzzer':
        numeroComando = COMANDOS.BUZZER_ON;
        break;
      case 'buzzer-off':
        numeroComando = COMANDOS.BUZZER_OFF;
        break;
    }

    setComandos(prev => ({
      ...prev,
      [tipo]: { ...prev[tipo], estado: 'enviando' }
    }));

    if (onLogConsola) {
      onLogConsola(`Enviando comando ${tipo} (${numeroComando}) al dispositivo ${esn}...`);
    }

    const resultado = await enviarComandoDispositivo({
      esn,
      comando: numeroComando,
    });

    if (resultado.success) {
      const timestamp = Date.now();
      setComandos(prev => ({
        ...prev,
        [tipo]: { estado: 'esperando', timestamp, segundosRestantes: 180 }
      }));
      if (onLogConsola) {
        onLogConsola(`Comando ${tipo} enviado exitosamente. Esperando confirmación del técnico...`);
      }
    } else {
      setComandos(prev => ({
        ...prev,
        [tipo]: { estado: null, timestamp: null, segundosRestantes: 0 }
      }));
      const mensajeError = `Error al enviar comando: ${resultado.error}`;
      if (onErrorPanel) {
        onErrorPanel(mensajeError);
      }
      if (onLogConsola) {
        onLogConsola(`❌ ${mensajeError}`);
      }
    }
  };

  const confirmarComando = async (tipo: ComandoTipo, exitoso: boolean) => {
    if (exitoso) {
      switch (tipo) {
        case 'bloqueo':
          await actualizarEstadoPrueba(expedienteId, 'bloqueo', true);
          onSetBloqueoExitoso(true);
          if (onLogConsola) {
            onLogConsola(`✅ Comando de bloqueo confirmado como exitoso`);
          }
          break;
        case 'desbloqueo':
          await actualizarEstadoPrueba(expedienteId, 'desbloqueo', true);
          onSetDesbloqueoExitoso(true);
          if (onLogConsola) {
            onLogConsola(`✅ Comando de desbloqueo confirmado como exitoso`);
          }
          break;
        case 'buzzer':
          await actualizarEstadoPrueba(expedienteId, 'buzzer', true);
          onSetBuzzerExitoso(true);
          if (onLogConsola) {
            onLogConsola(`✅ Comando de buzzer confirmado como exitoso`);
          }
          break;
        case 'buzzer-off':
          await actualizarEstadoPrueba(expedienteId, 'buzzer_off', true);
          onSetBuzzerOffExitoso(true);
          if (onLogConsola) {
            onLogConsola(`✅ Comando de buzzer off confirmado como exitoso`);
          }
          break;
      }
    } else {
      if (onLogConsola) {
        onLogConsola(`❌ Comando ${tipo} marcado como no funcional`);
      }
    }

    setComandos(prev => ({
      ...prev,
      [tipo]: { estado: null, timestamp: null, segundosRestantes: 0 }
    }));
  };

  const todasPruebasActivasCompletadas =
    (!requiereBloqueo || (bloqueoExitoso && desbloqueoExitoso)) &&
    (!requiereBuzzer || (buzzerExitoso && buzzerOffExitoso));

  if (!requiereBloqueo && !requiereBuzzer) {
    return null;
  }

  const formatTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderConfirmacion = (tipo: ComandoTipo, nombreComando: string) => {
    const info = comandos[tipo];

    if (info.estado === 'esperando') {
      return (
        <div className="mt-3 space-y-3">
          <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <p className="text-sm text-amber-800 font-medium">
                {nombreComando} enviado. Espera confirmación del técnico.
              </p>
            </div>
            <p className="text-xs text-amber-700 ml-8">
              Tiempo restante: {formatTiempo(info.segundosRestantes)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => confirmarComando(tipo, true)}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Confirmar sí
            </button>
            <button
              onClick={() => confirmarComando(tipo, false)}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              No funciona
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Pruebas de funcionalidad del dispositivo</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {requiereBloqueo && (
          <>
            <div>
              <button
                onClick={() => enviarComando('bloqueo')}
                disabled={comandos.bloqueo.estado !== null || bloqueoExitoso}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {comandos.bloqueo.estado === 'enviando' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : bloqueoExitoso ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                {bloqueoExitoso ? 'Bloqueo exitoso' : 'Bloquear motor'}
              </button>
              {renderConfirmacion('bloqueo', 'Bloqueo')}
            </div>

            <div>
              <button
                onClick={() => enviarComando('desbloqueo')}
                disabled={comandos.desbloqueo.estado !== null || !bloqueoExitoso || desbloqueoExitoso}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {comandos.desbloqueo.estado === 'enviando' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : desbloqueoExitoso ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Unlock className="w-5 h-5" />
                )}
                {desbloqueoExitoso ? 'Desbloqueo exitoso' : 'Desbloquear motor'}
              </button>
              {renderConfirmacion('desbloqueo', 'Desbloqueo')}
            </div>
          </>
        )}

        {requiereBuzzer && (
          <>
            <div>
              <button
                onClick={() => enviarComando('buzzer')}
                disabled={comandos.buzzer.estado !== null || buzzerExitoso}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {comandos.buzzer.estado === 'enviando' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : buzzerExitoso ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
                {buzzerExitoso ? 'Buzzer exitoso' : 'Buzzer ON'}
              </button>
              {renderConfirmacion('buzzer', 'Buzzer ON')}
            </div>

            <div>
              <button
                onClick={() => enviarComando('buzzer-off')}
                disabled={comandos['buzzer-off'].estado !== null || !buzzerExitoso || buzzerOffExitoso}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {comandos['buzzer-off'].estado === 'enviando' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : buzzerOffExitoso ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
                {buzzerOffExitoso ? 'Buzzer apagado' : 'Buzzer OFF'}
              </button>
              {renderConfirmacion('buzzer-off', 'Buzzer OFF')}
            </div>
          </>
        )}
      </div>

      {todasPruebasActivasCompletadas && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            ✓ Pruebas de funcionalidad completadas exitosamente
          </p>
        </div>
      )}
    </div>
  );
}
