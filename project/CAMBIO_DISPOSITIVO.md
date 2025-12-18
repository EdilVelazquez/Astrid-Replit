# Sistema de Cambio de Dispositivo con Reinicio Completo

Este documento describe el sistema de cambio de dispositivo implementado, que realiza un reinicio completo del contexto del servicio incluyendo reconsulta a CRM.

## Descripción General

Cuando un técnico necesita cambiar el dispositivo durante un servicio, el sistema:
1. Consulta automáticamente el CRM/Zoho Inventory para obtener datos del nuevo dispositivo
2. Reinicia completamente todas las pruebas pasivas
3. Limpia el contexto del servicio como si fuera una primera captura
4. Preserva el historial del cambio para auditoría

## Flujo Completo del Cambio de Dispositivo

```
┌────────────────────────────────────┐
│  Técnico presiona                  │
│  "Cambiar Dispositivo"             │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  Modal de Cambio de Dispositivo    │
│  - Captura nuevo ESN               │
│  - Selecciona motivo del cambio    │
│  - Agrega descripción (opcional)   │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  Sistema valida ESN duplicado      │
│  (Alerta si ya fue usado)          │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  🔍 CONSULTA CRM/ZOHO INVENTORY   │
│  Busca equipo con nuevo ESN        │
└─────────────┬──────────────────────┘
              │
              ├──── ✅ Equipo encontrado
              │     - ID de Zoho
              │     - Modelo del dispositivo
              │     - IMEI
              │     - Línea telefónica
              │
              └──── ⚠️ No encontrado
                    - Continúa sin datos CRM
                    - Campos quedan vacíos
              │
              ▼
┌────────────────────────────────────┐
│  🗑️ REINICIO DE PRUEBAS PASIVAS  │
│  - Resetea sesión en BD            │
│  - Limpia device_test_sessions     │
│  - Crea nueva sesión con nuevo ESN │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  💾 ACTUALIZACIÓN DE EXPEDIENTE    │
│  Actualiza en expedientes_servicio:│
│  - device_esn_anterior             │
│  - device_esn (nuevo)              │
│  - device_esn_cambio_motivo        │
│  - device_esn_cambio_descripcion   │
│  - device_esn_cambio_timestamp     │
│  - device_esn_cambio_cantidad++    │
│  - prefolio_modelo_dispositivo     │
│  - prefolio_imei_dispositivo       │
│  - prefolio_telefono_sim           │
│  - zoho_inventory_id               │
│  - validation_start_timestamp      │
│  - validation_final_status         │
│  - status                          │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  🔄 REINICIO DEL STATE LOCAL       │
│  Despacha:                         │
│  RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO│
│  - ignicion_exitosa = false        │
│  - boton_exitoso = false           │
│  - ubicacion_exitosa = false       │
│  - bloqueo_exitoso = false         │
│  - desbloqueo_exitoso = false      │
│  - buzzer_exitoso = false          │
│  - buzzer_off_exitoso = false      │
│  - Limpia fechas preguntadas       │
│  - Limpia comandos activos         │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  ✅ CONTEXTO REINICIADO            │
│  Sistema listo para nuevas pruebas │
│  Inicia polling automático         │
└────────────────────────────────────┘
```

## Características Principales

### 1. Consulta Automática a CRM

**Función:** `buscarEquipoEnInventario(esn)`
**Ubicación:** `src/services/zohoInventoryService.ts`

Cuando se cambia el dispositivo, el sistema:
- Consulta Zoho Inventory con el nuevo ESN
- Obtiene automáticamente:
  - ID de Zoho Inventory
  - Modelo del dispositivo
  - IMEI
  - Número de línea telefónica

**Modo de Pruebas:**
- ESN especial `000000000000000` retorna datos simulados
- No requiere conexión real a Zoho

**Manejo de Errores:**
- Si el equipo no se encuentra en CRM, el proceso continúa
- Los campos relacionados quedan vacíos (`null`)
- Se registra en los logs que no se encontró información

### 2. Reinicio de Pruebas Pasivas

**Función:** `reiniciarSesion(expedienteId, nuevoESN)`
**Ubicación:** `src/services/testSessionService.ts`

El sistema elimina completamente la sesión anterior:
```sql
DELETE FROM device_test_sessions
WHERE expediente_id = 'WO_AP'
```

Y crea una nueva sesión limpia:
```sql
INSERT INTO device_test_sessions (
  expediente_id,
  device_esn,
  ignicion_exitosa,
  boton_exitoso,
  ubicacion_exitosa,
  bloqueo_exitoso,
  desbloqueo_exitoso,
  buzzer_exitoso,
  buzzer_off_exitoso,
  ...
) VALUES (
  'WO_AP',
  'nuevo_esn',
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  ...
)
```

### 3. Actualización del Expediente

**Función:** `registrarCambioDispositivo(...)`
**Ubicación:** `src/services/expedienteService.ts`

Campos actualizados en `expedientes_servicio`:

**Historial del cambio:**
- `device_esn_anterior` - ESN previo
- `device_esn` - Nuevo ESN
- `device_esn_cambio_motivo` - Razón del cambio
- `device_esn_cambio_descripcion` - Detalles adicionales
- `device_esn_cambio_timestamp` - Fecha y hora del cambio
- `device_esn_cambio_cantidad` - Contador de cambios

**Datos del nuevo dispositivo (desde CRM):**
- `prefolio_modelo_dispositivo` - Modelo
- `prefolio_imei_dispositivo` - IMEI
- `prefolio_telefono_sim` - Línea
- `zoho_inventory_id` - ID en Zoho

**Estado del servicio:**
- `validation_start_timestamp` - Nueva fecha de inicio
- `validation_final_status` - "PRUEBAS EN CURSO"
- `status` - "Pruebas en curso"

### 4. Reinicio del State Local

**Action:** `RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO`
**Ubicación:** `src/store.ts`

Resetea en el state local:
```typescript
{
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
}
```

## Interfaz de Usuario

### Modal de Cambio de Dispositivo

**Componente:** `DeviceChangeModal`
**Ubicación:** `src/components/DeviceChangeModal.tsx`

**Advertencias mostradas al usuario:**
1. Se consultará el CRM para obtener los datos del nuevo dispositivo
2. Todas las pruebas pasivas se reiniciarán completamente
3. Los datos del dispositivo anterior se preservarán en el historial
4. El contexto del servicio se reiniciará como si fuera una primera captura

**Campos requeridos:**
- Nuevo ESN (manual o QR)
- Motivo del cambio (dropdown)
- Descripción adicional (obligatoria si motivo = "otro")

**Validaciones:**
- ESN no puede estar vacío
- ESN nuevo debe ser diferente al actual
- Debe seleccionar un motivo
- Descripción requerida para "Otro motivo"

### Logs del Sistema

Durante el cambio de dispositivo, se generan logs detallados:

```
🔄 Iniciando cambio de dispositivo...
📋 ESN actual: 123456789012345
📋 Nuevo ESN: 987654321098765
📝 Motivo: Dispositivo defectuoso
🔍 Verificando si el nuevo ESN ya fue utilizado...
✓ ESN disponible
🔍 Consultando CRM/Zoho Inventory para el nuevo dispositivo...
✅ Equipo encontrado en CRM:
   📦 ID: ZOHO-123456
   📱 Modelo: GPS-4G-PLUS
   🔢 IMEI: 123456789012345
   📞 Línea: 5551234567
🗑️ Reseteando sesión de pruebas pasivas...
✅ Sesión de pruebas reseteada correctamente
💾 Actualizando expediente con nuevo dispositivo y datos de CRM...
✅ Expediente actualizado con datos del nuevo dispositivo
🔄 Reiniciando contexto del servicio...
✅ Contexto del servicio reiniciado completamente
🚀 Listo para iniciar pruebas con el nuevo dispositivo
🟢 Iniciando consulta inmediata y polling automático (60s, máx 10 intentos)
✅ Cambio de dispositivo completado exitosamente
```

## Motivos de Cambio Disponibles

**Ubicación:** `src/constants/deviceChangeReasons.ts`

- Dispositivo defectuoso
- Error en la instalación inicial
- Incompatibilidad con el vehículo
- Daño durante la instalación
- Cliente solicitó cambio
- Actualización de equipo
- Otro motivo (requiere descripción)

## Validaciones de Seguridad

### 1. Verificación de ESN Duplicado

Antes de proceder con el cambio, el sistema:
- Busca si el nuevo ESN ya fue usado en otro servicio
- Si encuentra coincidencias, muestra alerta con:
  - Work Order donde fue usado
  - Appointment donde fue usado
- Requiere confirmación explícita del usuario

### 2. Preservación de Historial

Los datos del cambio quedan registrados permanentemente:
- ESN anterior se guarda en `device_esn_anterior`
- Se mantiene contador de cambios
- Timestamp exacto del cambio
- Motivo y descripción documentados

### 3. Integridad de Datos

- La transacción es atómica: todo o nada
- Si falla algún paso, se muestra error y no se aplican cambios parciales
- Logs detallados permiten auditoría completa

## Casos de Uso

### Caso 1: Dispositivo Defectuoso

**Escenario:**
- Técnico instala dispositivo ESN-A
- Realiza algunas pruebas
- Descubre que el dispositivo está defectuoso
- Necesita cambiar a ESN-B

**Resultado:**
- ESN-B se consulta en CRM automáticamente
- Todas las pruebas se reinician
- ESN-A queda en historial
- Técnico inicia pruebas desde cero con ESN-B

### Caso 2: Error en Captura Inicial

**Escenario:**
- Técnico captura ESN incorrecto
- Se da cuenta antes de finalizar pruebas
- Necesita corregir el ESN

**Resultado:**
- Nuevo ESN correcto se consulta en CRM
- Datos de CRM se actualizan correctamente
- Historial registra el cambio con motivo
- Pruebas se reinician limpias

### Caso 3: Actualización de Equipo

**Escenario:**
- Cliente solicita actualización a modelo superior
- Técnico debe cambiar dispositivo durante servicio

**Resultado:**
- Nuevo dispositivo se consulta en CRM
- Se obtienen datos del modelo actualizado
- Cambio queda documentado con motivo "Actualización de equipo"
- Pruebas se realizan con el equipo nuevo

## Archivos Modificados

### 1. expedienteService.ts
**Función modificada:** `registrarCambioDispositivo`
- Agregados parámetros opcionales: `zohoInventoryId`, `modeloDispositivo`, `imei`, `telefonoSim`
- Actualiza campos de CRM en el expediente
- Mantiene backward compatibility con llamadas sin datos CRM

### 2. App.tsx
**Función modificada:** `handleCambiarDispositivo`
- Agrega consulta a Zoho Inventory antes de registrar cambio
- Pasa datos de CRM a `registrarCambioDispositivo`
- Logs mejorados con información de CRM
- Import agregado: `buscarEquipoEnInventario`

### 3. DeviceChangeModal.tsx
**Cambio en UI:**
- Advertencia actualizada con lista de acciones que se ejecutarán
- Información más clara sobre el reinicio completo
- Menciona explícitamente la consulta a CRM

### 4. store.ts
**Reducer existente:** `RESET_PRUEBAS_PARA_CAMBIO_DISPOSITIVO`
- Ya manejaba correctamente el reinicio de pruebas pasivas
- No requirió modificaciones

## Consideraciones Técnicas

### Performance

**Consulta a CRM:**
- Operación asíncrona, no bloquea UI
- Timeout configurado en el edge function
- Si falla, el proceso continúa sin datos CRM

**Actualización de BD:**
- Single update statement, rápido
- Índices apropiados para búsquedas
- Transacción atómica

### Manejo de Errores

**Errores de CRM:**
- No interrumpen el flujo
- Se registran en logs
- Usuario es informado con mensaje claro

**Errores de BD:**
- Detienen el proceso
- Mensaje de error específico
- Estado del servicio no se modifica

**Errores de Sesión:**
- Si falla reinicio de sesión, aborta operación
- Expediente no se modifica si falla sesión
- Garantiza consistencia de datos

### Testing

**ESN de Pruebas:**
- `000000000000000` simula respuesta exitosa de CRM
- Datos de prueba predefinidos
- No requiere conexión real a Zoho

**Logs Detallados:**
- Cada paso registra información
- Facilita debugging en producción
- Usuario puede ver progreso en tiempo real

## Compatibilidad

**Backward Compatibility:**
- `registrarCambioDispositivo` acepta parámetros opcionales
- Código existente sigue funcionando sin cambios
- Nuevas funcionalidades son aditivas, no breaking changes

**Datos Históricos:**
- Servicios anteriores sin datos CRM siguen funcionando
- Campos opcionales permiten valores `null`
- No requiere migración de datos existentes

## Próximos Pasos Posibles

1. **Notificaciones:**
   - Enviar notificación cuando se cambia dispositivo
   - Alertar a supervisores sobre cambios frecuentes

2. **Reportes:**
   - Dashboard de cambios de dispositivos
   - Análisis de motivos más comunes
   - Identificar dispositivos problemáticos

3. **Validaciones Adicionales:**
   - Límite de cambios por servicio
   - Verificación de stock en CRM
   - Alerta si dispositivo ya está en uso activo

4. **Automatización:**
   - Sugerir dispositivo alternativo si uno falla
   - Pre-validar ESN antes de abrir modal
   - Auto-completar motivo según historial
