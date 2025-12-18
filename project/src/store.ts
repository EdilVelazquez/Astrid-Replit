import { useReducer } from 'react';
import { AppState, AppAction } from './types';

const initialState: AppState = {
  email_tecnico: '',
  esn: '',
  expediente_actual: null,
  ignicion_exitosa: false,
  boton_exitoso: false,
  ubicacion_exitosa: false,
  bloqueo_exitoso: false,
  desbloqueo_exitoso: false,
  buzzer_exitoso: false,
  buzzer_off_exitoso: false,
  boton_fecha_preguntada: null,
  ubicacion_fecha_preguntada: null,
  esperando_respuesta_comando_activo: false,
  comando_activo_tipo: null,
  comando_activo_estado: null,
  comando_activo_timestamp: null
};

function appReducer(state: AppState, action: AppAction): AppState {
  try {
    switch (action.type) {
      case 'SET_EMAIL_TECNICO':
        return { ...state, email_tecnico: action.payload, expediente_actual: null, esn: '' };
      case 'SET_EXPEDIENTE':
        return {
          ...initialState,
          email_tecnico: state.email_tecnico,
          expediente_actual: action.payload
        };
      case 'SET_ESN':
        if (!action.payload || typeof action.payload !== 'string') {
          console.error('Invalid ESN payload:', action.payload);
          return state;
        }
        return { ...state, esn: action.payload };
    case 'START_COMANDO_ACTIVO':
      return {
        ...state,
        esperando_respuesta_comando_activo: true,
        comando_activo_tipo: action.payload.tipo,
        comando_activo_estado: 'enviando',
        comando_activo_timestamp: Date.now()
      };
    case 'COMANDO_ENVIADO':
      return { ...state, comando_activo_estado: 'esperando' };
    case 'CONFIRMAR_COMANDO':
      const nuevoState = { ...state };

      if (state.comando_activo_tipo === 'bloqueo') {
        nuevoState.bloqueo_exitoso = action.payload.exitoso;
      } else if (state.comando_activo_tipo === 'buzzer') {
        nuevoState.buzzer_exitoso = action.payload.exitoso;
      }

      nuevoState.esperando_respuesta_comando_activo = false;
      nuevoState.comando_activo_tipo = null;
      nuevoState.comando_activo_estado = null;
      nuevoState.comando_activo_timestamp = null;

      return nuevoState;
    case 'SET_IGNICION_EXITOSA':
      return { ...state, ignicion_exitosa: action.payload };
    case 'SET_BOTON_EXITOSO':
      return { ...state, boton_exitoso: action.payload };
    case 'SET_UBICACION_EXITOSA':
      return { ...state, ubicacion_exitosa: action.payload };
    case 'SET_BLOQUEO_EXITOSO':
      return { ...state, bloqueo_exitoso: action.payload };
    case 'SET_DESBLOQUEO_EXITOSO':
      return { ...state, desbloqueo_exitoso: action.payload };
    case 'SET_BUZZER_EXITOSO':
      return { ...state, buzzer_exitoso: action.payload };
    case 'SET_BUZZER_OFF_EXITOSO':
      return { ...state, buzzer_off_exitoso: action.payload };
    case 'SET_BOTON_FECHA_PREGUNTADA':
      return { ...state, boton_fecha_preguntada: action.payload };
    case 'SET_UBICACION_FECHA_PREGUNTADA':
      return { ...state, ubicacion_fecha_preguntada: action.payload };
    case 'LOAD_SAVED_SESSION':
      return { ...state, ...action.payload };
    case 'RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO':
      return {
        ...state,
        esn: '',
        ignicion_exitosa: false,
        boton_exitoso: false,
        ubicacion_exitosa: false,
        bloqueo_exitoso: false,
        desbloqueo_exitoso: false,
        buzzer_exitoso: false,
        buzzer_off_exitoso: false,
        boton_fecha_preguntada: null,
        ubicacion_fecha_preguntada: null,
        esperando_respuesta_comando_activo: false,
        comando_activo_tipo: null,
        comando_activo_estado: null,
        comando_activo_timestamp: null
      };
    case 'RESET':
      return initialState;
      default:
        return state;
    }
  } catch (error) {
    console.error('Error in appReducer:', error, 'Action:', action);
    return state;
  }
}

export function useAppStore() {
  return useReducer(appReducer, initialState);
}
