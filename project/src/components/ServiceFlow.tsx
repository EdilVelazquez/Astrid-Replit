import { ExpedienteServicio } from '../types';
import { CheckCircle2, ChevronRight, RefreshCcw, Car, Cpu, ClipboardCheck, FileCheck, AlertCircle, MapPin, Building2, User } from 'lucide-react';
import { PrefolioForm } from './PrefolioForm';
import { PruebasPasivas } from './PruebasPasivas';
import { PruebasActivas } from './PruebasActivas';
import { FormularioCierre } from './FormularioCierre';
import { generarExpedienteId } from '../services/testSessionService';
import { traducirPruebasDesdeInstallationDetails, requierePrueba } from '../utils';

interface ServiceFlowProps {
  expediente: ExpedienteServicio;
  esn: string | null;
  prefolioCompletado: boolean;
  pruebasCompletadas: boolean;
  mostrarFormularioCierre: boolean;
  ignicionExitosa: boolean;
  botonExitoso: boolean;
  ubicacionExitosa: boolean;
  bloqueoExitoso: boolean;
  desbloqueoExitoso: boolean;
  buzzerExitoso: boolean;
  buzzerOffExitoso: boolean;
  botonFechaPreguntada: string | null | undefined;
  ubicacionFechaPreguntada: string | null | undefined;
  esperandoComandoActivo: boolean;
  onPrefolioCompleted: () => void;
  onClose: () => void;
  onCambiarDispositivo: () => void;
  onSetIgnicionExitosa: (value: boolean) => void;
  onSetBotonExitoso: (value: boolean) => void;
  onSetUbicacionExitosa: (value: boolean) => void;
  onSetBloqueoExitoso: (value: boolean) => void;
  onSetDesbloqueoExitoso: (value: boolean) => void;
  onSetBuzzerExitoso: (value: boolean) => void;
  onSetBuzzerOffExitoso: (value: boolean) => void;
  onSetBotonFechaPreguntada: (value: string | null) => void;
  onSetUbicacionFechaPreguntada: (value: string | null) => void;
  onErrorPanel: (msg: string) => void;
  onLogConsola: (msg: string) => void;
  pruebasBloqueadas: boolean;
  onPruebasCompletadas: () => void;
  onFormularioCierreCompletado: () => void;
  onCancelarCierre: () => void;
}

type Step = 'prefolio' | 'pruebas' | 'cierre';

const steps: { id: Step; label: string; icon: typeof Car }[] = [
  { id: 'prefolio', label: 'Datos del Vehículo', icon: Car },
  { id: 'pruebas', label: 'Pruebas del Dispositivo', icon: Cpu },
  { id: 'cierre', label: 'Documentación Final', icon: FileCheck },
];

export function ServiceFlow({
  expediente,
  esn,
  prefolioCompletado,
  pruebasCompletadas: _pruebasCompletadas,
  mostrarFormularioCierre,
  ignicionExitosa,
  botonExitoso,
  ubicacionExitosa,
  bloqueoExitoso,
  desbloqueoExitoso,
  buzzerExitoso,
  buzzerOffExitoso,
  botonFechaPreguntada,
  ubicacionFechaPreguntada,
  esperandoComandoActivo,
  onPrefolioCompleted,
  onClose,
  onCambiarDispositivo,
  onSetIgnicionExitosa,
  onSetBotonExitoso,
  onSetUbicacionExitosa,
  onSetBloqueoExitoso,
  onSetDesbloqueoExitoso,
  onSetBuzzerExitoso,
  onSetBuzzerOffExitoso,
  onSetBotonFechaPreguntada,
  onSetUbicacionFechaPreguntada,
  onErrorPanel,
  onLogConsola,
  pruebasBloqueadas,
  onPruebasCompletadas,
  onFormularioCierreCompletado,
  onCancelarCierre,
}: ServiceFlowProps) {
  if (expediente.status === 'vuelta_en_falso') {
    return (
      <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="bg-red-50 border-b border-red-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-800">
                Servicio bloqueado
              </h2>
              <p className="text-sm text-red-600">
                Este servicio fue marcado como "Vuelta en falso"
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-8 text-center">
          <div className="max-w-md mx-auto">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Este servicio no puede continuar
            </h3>
            <p className="text-gray-600 mb-4">
              El servicio <span className="font-medium">{expediente.appointment_name}</span> fue marcado como "Vuelta en falso" y no puede iniciarse ni continuar.
            </p>
            {expediente.notes_terminate && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs text-red-600 font-medium mb-1">Motivo registrado:</p>
                <p className="text-sm text-red-800 italic">"{expediente.notes_terminate}"</p>
              </div>
            )}
            <p className="text-sm text-gray-500 mb-6">
              Solo se podrá continuar cuando se genere un nuevo registro de servicio.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Volver al calendario
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getCurrentStep = (): Step => {
    if (!prefolioCompletado) return 'prefolio';
    if (mostrarFormularioCierre) return 'cierre';
    return 'pruebas';
  };

  const currentStep = getCurrentStep();

  const getStepStatus = (stepId: Step): 'completed' | 'current' | 'pending' => {
    const stepOrder = ['prefolio', 'pruebas', 'cierre'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepId === 'prefolio' && prefolioCompletado) return 'completed';
    if (stepId === 'pruebas' && mostrarFormularioCierre) return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const pruebasRequeridas = traducirPruebasDesdeInstallationDetails(expediente.installation_details || '');
  const requiereBloqueo = requierePrueba(expediente.installation_details || '', 'bloqueo');
  const requiereBuzzer = requierePrueba(expediente.installation_details || '', 'buzzer');
  const requiereBoton = requierePrueba(expediente.installation_details || '', 'boton');
  const requiereIgnicion = requierePrueba(expediente.installation_details || '', 'ignicion');

  const pruebasPasivasCompletas = 
    (requiereIgnicion ? ignicionExitosa : true) && 
    (requiereBoton ? botonExitoso : true) && 
    ubicacionExitosa;

  const pruebasActivasCompletas = 
    (requiereBloqueo ? (bloqueoExitoso && desbloqueoExitoso) : true) &&
    (requiereBuzzer ? (buzzerExitoso && buzzerOffExitoso) : true);

  const todasLasPruebasCompletas = pruebasPasivasCompletas && pruebasActivasCompletas;

  const obtenerPruebasPendientes = (): string[] => {
    const pendientes: string[] = [];
    if (requiereIgnicion && !ignicionExitosa) pendientes.push('Ignición');
    if (requiereBoton && !botonExitoso) pendientes.push('Botón de pánico');
    if (!ubicacionExitosa) pendientes.push('Ubicación');
    if (requiereBloqueo && !bloqueoExitoso) pendientes.push('Bloqueo');
    if (requiereBloqueo && !desbloqueoExitoso) pendientes.push('Desbloqueo');
    if (requiereBuzzer && !buzzerExitoso) pendientes.push('Buzzer On');
    if (requiereBuzzer && !buzzerOffExitoso) pendientes.push('Buzzer Off');
    return pendientes;
  };

  const pruebasPendientes = obtenerPruebasPendientes();

  const expedienteId = generarExpedienteId(
    expediente.work_order_name || null,
    expediente.appointment_name || null
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {expediente.appointment_name || 'Sin cita'}
              </h2>
              {expediente.work_order_name && (
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  WO: {expediente.work_order_name}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Car className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{expediente.asset_marca} {expediente.asset_submarca}</span>
                {expediente.asset_placas && <span className="text-xs font-mono text-gray-400">({expediente.asset_placas})</span>}
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{expediente.client_name || 'Sin cliente'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{expediente.company_name || 'Sin empresa'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{expediente.service_city || 'Sin ubicación'}</span>
              </div>
            </div>

            {expediente.installation_details && (
              <div className="mt-2 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md">
                <span className="font-medium text-gray-600">Instalación:</span> {expediente.installation_details}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-4"
          >
            <RefreshCcw className="w-4 h-4" />
            Reiniciar
          </button>
        </div>

        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full transition-all
                    ${status === 'completed' ? 'bg-[#0F1C3F] text-white' : ''}
                    ${status === 'current' ? 'bg-[#0F1C3F] text-white ring-2 ring-[#A3C1DE] ring-offset-2' : ''}
                    ${status === 'pending' ? 'bg-gray-200 text-gray-400' : ''}
                  `}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`
                    text-sm font-medium hidden sm:block
                    ${status === 'current' ? 'text-gray-900' : ''}
                    ${status === 'completed' ? 'text-gray-600' : ''}
                    ${status === 'pending' ? 'text-gray-400' : ''}
                  `}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {currentStep === 'prefolio' && (
          <PrefolioForm
            expediente={expediente}
            onCompleted={onPrefolioCompleted}
            onClose={onClose}
          />
        )}

        {currentStep === 'pruebas' && esn && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Dispositivo</p>
                <p className="text-sm text-gray-500 mt-0.5">ESN: {esn}</p>
              </div>
              <button
                onClick={onCambiarDispositivo}
                disabled={esperandoComandoActivo}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cambiar dispositivo
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Pruebas Pasivas</h3>
              <PruebasPasivas
                esn={esn}
                expedienteId={expedienteId}
                ignicionExitosa={ignicionExitosa}
                botonExitoso={botonExitoso}
                ubicacionExitosa={ubicacionExitosa}
                botonFechaPreguntada={botonFechaPreguntada ?? null}
                ubicacionFechaPreguntada={ubicacionFechaPreguntada ?? null}
                pruebasRequeridas={pruebasRequeridas}
                esperandoComandoActivo={esperandoComandoActivo}
                bloqueadas={pruebasBloqueadas}
                onSetIgnicionExitosa={onSetIgnicionExitosa}
                onSetBotonExitoso={onSetBotonExitoso}
                onSetUbicacionExitosa={onSetUbicacionExitosa}
                onSetBotonFechaPreguntada={onSetBotonFechaPreguntada}
                onSetUbicacionFechaPreguntada={onSetUbicacionFechaPreguntada}
                onErrorPanel={onErrorPanel}
                onLogConsola={onLogConsola}
              />
            </div>

            {(requiereBloqueo || requiereBuzzer) && (
              <div className="space-y-1 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Pruebas Activas</h3>
                <PruebasActivas
                  esn={esn}
                  expedienteId={expedienteId}
                  pruebasRequeridas={pruebasRequeridas}
                  bloqueoExitoso={bloqueoExitoso}
                  desbloqueoExitoso={desbloqueoExitoso}
                  buzzerExitoso={buzzerExitoso}
                  buzzerOffExitoso={buzzerOffExitoso}
                  bloqueadas={pruebasBloqueadas}
                  onSetBloqueoExitoso={onSetBloqueoExitoso}
                  onSetDesbloqueoExitoso={onSetDesbloqueoExitoso}
                  onSetBuzzerExitoso={onSetBuzzerExitoso}
                  onSetBuzzerOffExitoso={onSetBuzzerOffExitoso}
                  onErrorPanel={onErrorPanel}
                  onLogConsola={onLogConsola}
                />
              </div>
            )}

            <div className="pt-6 border-t border-gray-200 mt-6">
              {todasLasPruebasCompletas ? (
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0F1C3F] flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F1C3F]">Pruebas completadas</p>
                      <p className="text-xs text-gray-500">Todas las pruebas han sido realizadas exitosamente</p>
                    </div>
                  </div>
                  <button
                    onClick={onPruebasCompletadas}
                    className="px-5 py-2.5 bg-[#0F1C3F] text-white text-sm font-medium rounded-lg hover:bg-[#1A2B52] transition-colors border border-[#0F1C3F] shadow-sm"
                  >
                    Continuar a Documentación Final
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">Pruebas pendientes</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Completa las siguientes pruebas para continuar: {pruebasPendientes.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'cierre' && (
          <FormularioCierre
            expediente={expediente}
            onCompleted={onFormularioCierreCompletado}
            onCancel={onCancelarCierre}
          />
        )}
      </div>
    </div>
  );
}
