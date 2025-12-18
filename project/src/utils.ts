export function traducirPruebasDesdeInstallationDetails(installation_details: string): string[] {
  const pruebas = new Set<string>();
  const detallesLower = installation_details.toLowerCase();

  if (detallesLower.includes('ignición') || detallesLower.includes('ignicion')) {
    pruebas.add('Ignición');
  }

  if (detallesLower.includes('paro de motor') || detallesLower.includes('bloqueo')) {
    pruebas.add('Bloqueo y desbloqueo de motor');
  }

  if (detallesLower.includes('buzzer')) {
    pruebas.add('Activación y desactivación de buzzer');
  }

  if (detallesLower.includes('botón de pánico') || detallesLower.includes('boton de panico')) {
    pruebas.add('Botón de pánico');
  }

  pruebas.add('Ubicación');

  return Array.from(pruebas);
}

export function formatearFecha(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function calcularTiempoRestante(timestamp: number, duracionMs: number): number {
  const ahora = Date.now();
  const transcurrido = ahora - timestamp;
  const restante = Math.max(0, duracionMs - transcurrido);
  return Math.floor(restante / 1000);
}

export function esFechaValidaVentana2h(fechaStr: string | null): boolean {
  if (!fechaStr) return false;

  const matches = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!matches) return false;

  const [, d, m, y, h, min, s] = matches;

  const dia = d.padStart(2, '0');
  const mes = m.padStart(2, '0');
  const hora = h.padStart(2, '0');
  const minuto = min.padStart(2, '0');
  const segundo = s.padStart(2, '0');

  const fechaEvento = new Date(`${y}-${mes}-${dia}T${hora}:${minuto}:${segundo}`);

  if (isNaN(fechaEvento.getTime())) return false;

  const ahora = new Date();
  const dosHorasAtras = new Date(ahora.getTime() - 2 * 3600_000);

  return fechaEvento <= ahora && fechaEvento >= dosHorasAtras;
}

export function convertirFechaAISO(fechaStr: string): string {
  const matches = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!matches) return fechaStr;

  const [, d, m, y, h, min, s] = matches;
  const dia = d.padStart(2, '0');
  const mes = m.padStart(2, '0');
  const hora = h.padStart(2, '0');
  const minuto = min.padStart(2, '0');
  const segundo = s.padStart(2, '0');

  return `${y}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;
}

export function requierePrueba(installation_details: string, tipoPrueba: 'bloqueo' | 'buzzer' | 'boton'): boolean {
  const detallesLower = installation_details.toLowerCase();

  switch (tipoPrueba) {
    case 'bloqueo':
      return detallesLower.includes('paro de motor') || detallesLower.includes('bloqueo');
    case 'buzzer':
      return detallesLower.includes('buzzer');
    case 'boton':
      return detallesLower.includes('botón de pánico') || detallesLower.includes('boton de panico');
    default:
      return false;
  }
}
