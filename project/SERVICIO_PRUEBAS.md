# Sistema de Servicio de Pruebas Reutilizable

Este documento describe el sistema de servicio de pruebas implementado para ricardo.velazquez1@numaris.com.

## Descripción General

El sistema permite tener un servicio de pruebas permanente que:
- Se reinicia automáticamente al finalizar
- Siempre está disponible con la fecha actual
- No contamina datos reales
- Es exclusivo para el usuario especificado

## Características del Servicio de Pruebas

### Identificación Visual

El servicio de pruebas se identifica claramente con:

**En el selector de servicios:**
```
🧪 PRUEBAS | AP-TEST-RICARDO - WO-TEST-RICARDO | ...
```

**En el calendario:**
```
AP-TEST-RICARDO    🧪 PRUEBAS    08:00
```

### Datos del Servicio

**ID del servicio:** 24221
**Appointment Name:** AP-TEST-RICARDO
**Work Order Name:** WO-TEST-RICARDO
**Usuario exclusivo:** ricardo.velazquez1@numaris.com
**Bandera especial:** `is_test_service = true`

**Datos iniciales:**
- Empresa: NUMARIS - PRUEBAS
- Cliente: CLIENTE DE PRUEBAS
- Técnico: Ricardo Velázquez
- Ubicación: CDMX
- Pruebas requeridas: Botón, Bloqueo, Buzzer
- Horario: 08:00 - 17:00 (del día actual)

## Funcionamiento del Reinicio Automático

### ¿Cuándo se reinicia?

El servicio se reinicia automáticamente cuando:
1. Se completa todo el flujo del servicio
2. Se finaliza el formulario de cierre
3. Se ejecuta el webhook `complete_work`

### ¿Qué se reinicia?

Al reiniciarse, el sistema limpia:

**Datos del vehículo:**
- VIN
- Placas
- Color
- Marca/Modelo
- Odómetro
- Número económico

**Datos del dispositivo:**
- ESN
- IMEI
- Modelo del dispositivo
- Teléfono SIM
- Zoho Inventory ID

**Estados y validaciones:**
- Estado del servicio → "Pendiente"
- Prefolio realizado → false
- Timestamps de validación → null
- Resumen de validación → null
- Status final → null
- Cambios de dispositivo → reiniciados

**Sesiones de prueba:**
- Elimina la sesión de device_test_sessions
- Las pruebas comienzan desde cero

**Fechas:**
- `scheduled_start_time` → Hoy a las 08:00
- `scheduled_end_time` → Hoy a las 17:00

### ¿Qué se mantiene?

Datos básicos que NO se modifican:
- ID del expediente (24221)
- Appointment Name (AP-TEST-RICARDO)
- Work Order Name (WO-TEST-RICARDO)
- Email del técnico
- Nombre del técnico
- Teléfono del técnico
- Datos de la empresa
- Datos del cliente
- Ubicación del servicio
- Tipo de servicio
- Pruebas requeridas (installation_details)
- Bandera `is_test_service = true`

## Flujo Completo

```
┌────────────────────────────────────┐
│  Usuario: ricardo.velazquez1       │
│  Inicia sesión                     │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  Ve el servicio en el calendario   │
│  🧪 PRUEBAS | AP-TEST-RICARDO      │
│  Fecha: HOY                        │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  Selecciona el servicio            │
│  Comienza el flujo normal          │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  FASE 1: PreFolio                  │
│  - Captura datos del vehículo      │
│  - Captura ESN                     │
│  - Sube fotos                      │
│  → Ejecuta webhook start_work      │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  FASE 2: Pruebas                   │
│  - Pruebas activas                 │
│  - Pruebas pasivas                 │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  FASE 3: Formulario de Cierre      │
│  - Responde preguntas              │
│  - Sube fotos finales              │
│  → Ejecuta webhook complete_work   │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  SERVICIO FINALIZADO               │
│  ✓ Resumen mostrado                │
│  🎉 Completado exitosamente        │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  🔄 REINICIO AUTOMÁTICO            │
│  (Solo para servicios de prueba)   │
│                                    │
│  - Limpia todos los datos          │
│  - Actualiza fechas a HOY          │
│  - Listo para nueva ejecución      │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  Servicio disponible nuevamente    │
│  Usuario puede iniciarlo de nuevo  │
└────────────────────────────────────┘
```

## Logs del Sistema

Durante el reinicio, se generan los siguientes logs:

```
🎉 Servicio finalizado correctamente
🧪 Servicio de pruebas detectado - reiniciando automáticamente...
✅ Servicio de pruebas reiniciado - listo para nueva ejecución
🔄 El servicio está disponible nuevamente en el día de hoy
```

## Base de Datos

### Nueva Columna

```sql
ALTER TABLE expedientes_servicio
ADD COLUMN is_test_service BOOLEAN DEFAULT false;
```

### Función de Reinicio

```sql
CREATE OR REPLACE FUNCTION reset_test_service(service_id INTEGER)
RETURNS BOOLEAN
```

**Seguridad:**
- Solo funciona con servicios donde `is_test_service = true`
- Verifica que el servicio existe antes de reiniciar
- Usa SECURITY DEFINER para permisos controlados

## Archivos Implementados

### Migración
**Archivo:** `supabase/migrations/create_test_service_system.sql`
- Crea columna `is_test_service`
- Crea índice para búsquedas rápidas
- Crea función `reset_test_service()`

### Servicio de Pruebas
**Archivo:** `src/services/testServiceService.ts`

Funciones:
- `reiniciarServicioDePruebas(serviceId)` - Reinicia el servicio
- `esServicioDePruebas(expediente)` - Verifica si es servicio de prueba
- `obtenerServicioDePruebas(email)` - Obtiene ID del servicio de prueba

### Integración en App
**Archivo:** `src/App.tsx` (líneas 694-714)

Lógica agregada en `finalizarServicioAutomaticamente()`:
```typescript
if (esServicioDePruebas(state.expediente_actual)) {
  agregarLogConsola('🧪 Servicio de pruebas detectado - reiniciando automáticamente...');

  setTimeout(async () => {
    const exitoReinicio = await reiniciarServicioDePruebas(state.expediente_actual!.id);

    if (exitoReinicio) {
      agregarLogConsola('✅ Servicio de pruebas reiniciado - listo para nueva ejecución');
      // Actualizar lista de servicios...
    }
  }, 2000);
}
```

### Indicadores Visuales

**SelectorServicio.tsx (línea 121):**
```typescript
{servicio.is_test_service ? '🧪 PRUEBAS | ' : ''}
```

**CalendarioTecnico.tsx (líneas 581-585):**
```typescript
{servicio.is_test_service && (
  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded border border-purple-300">
    🧪 PRUEBAS
  </span>
)}
```

### Type Definition
**Archivo:** `src/types.ts` (línea 59)
```typescript
export interface ExpedienteServicio {
  // ... otros campos
  is_test_service?: boolean;
}
```

## Ventajas del Sistema

1. **Sin contaminación de datos:** Los datos de prueba no se mezclan con datos reales
2. **Siempre disponible:** El servicio siempre está con la fecha actual
3. **Reutilizable infinitamente:** Se puede ejecutar cuantas veces sea necesario
4. **Trazable:** Fácilmente identificable en la UI
5. **Automático:** No requiere intervención manual para reiniciar
6. **Exclusivo:** Solo para el usuario especificado

## Uso del Sistema

### Para el usuario ricardo.velazquez1@numaris.com:

1. Inicia sesión en la aplicación
2. Busca el servicio marcado con 🧪 PRUEBAS
3. Selecciónalo y completa todo el flujo
4. Al finalizar, el servicio se reinicia automáticamente
5. Vuelve al calendario y el servicio estará disponible nuevamente

### Para otros usuarios:

Este sistema NO afecta a otros usuarios:
- Solo el servicio ID 24221 tiene `is_test_service = true`
- Solo está asignado a ricardo.velazquez1@numaris.com
- Otros servicios NO se reinician automáticamente
- El comportamiento normal se mantiene sin cambios

## Notas Importantes

1. **Fotos:** Las fotos en storage NO se eliminan automáticamente. Se recomienda una limpieza periódica manual si es necesario.

2. **Modo pruebas ESN:** El ESN `000000000000000` sigue funcionando normalmente y simula las pruebas.

3. **Webhooks:** Los webhooks se ejecutan normalmente en servicios de prueba, a menos que se use el ESN especial.

4. **Consistencia:** El servicio siempre mantiene su estructura básica intacta.

5. **Performance:** El reinicio toma aproximadamente 2 segundos para completarse.
