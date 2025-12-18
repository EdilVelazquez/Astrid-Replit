export const DEVICE_CHANGE_REASONS = [
  { value: 'no_ignicion', label: 'Dispositivo no responde a ignición' },
  { value: 'no_bloqueo', label: 'Dispositivo no responde a bloqueo de motor' },
  { value: 'no_boton', label: 'Dispositivo no responde a botón de pánico' },
  { value: 'no_ubicacion', label: 'Dispositivo no reporta ubicación' },
  { value: 'no_buzzer', label: 'Dispositivo no responde a buzzer' },
  { value: 'error_dedo', label: 'Error al ingresar ESN (error de dedo)' },
  { value: 'danado', label: 'Dispositivo físicamente dañado' },
  { value: 'otro', label: 'Otro motivo (especificar)' }
] as const;

export type DeviceChangeReasonValue = typeof DEVICE_CHANGE_REASONS[number]['value'];
