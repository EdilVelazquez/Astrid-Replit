# Sistema de Transiciones de Servicio

Este documento describe el sistema de notificaciones mediante webhooks que se ejecutan en momentos clave del flujo de servicio.

## Endpoint del Webhook

```
https://aiwebhookn8n.numaris.com/webhook/c8cb35f5-2567-4584-b7f1-319fdf830443
```

## Transiciones Implementadas

El sistema envía notificaciones en dos momentos críticos del flujo de servicio:

### 1. Start Work (Inicio del Trabajo)

**ID de transición:** `8531000000169063`
**Nombre:** Start Work
**Parámetro action:** `start_work`

**¿Cuándo se ejecuta?**
- Se ejecuta al completar el **PreFolio** (Fase 1 del servicio)
- Después de guardar todos los datos del formulario inicial:
  - Datos del vehículo (marca, modelo, VIN, placas, odómetro, color, etc.)
  - Datos del dispositivo (ESN, IMEI, modelo, línea SIM)
  - Fotos del vehículo (4 fotos), foto del odómetro, foto del VIN, foto de las placas
- Antes de iniciar las pruebas del dispositivo

**Parámetros enviados:**
```json
{
  "action": "start_work",
  "appointment_name": "AP-12345",
  "work_order_name": "WO-67890",
  "esn": "123456789012345",
  "technician_email": "tecnico@example.com"
}
```

**Archivo:** `src/components/PrefolioForm.tsx` (línea 568-588)

**Comportamiento:**
- Si el webhook falla, se muestra un diálogo de confirmación al técnico
- El técnico puede decidir continuar incluso si el webhook falla
- En modo de pruebas (ESN `000000000000000`), se simula una respuesta exitosa

---

### 2. Complete Work (Trabajo Completado)

**ID de transición:** `8531000000169060`
**Nombre:** Complete Work
**Parámetro action:** `complete_work`

**¿Cuándo se ejecuta?**
- Se ejecuta al completar el **Formulario de Cierre** (Fase 2 del servicio)
- Después de que todas las pruebas hayan sido completadas:
  - Pruebas pasivas (ignición, ubicación, botón de pánico)
  - Pruebas activas (bloqueo, desbloqueo, buzzer on/off)
- Después de completar el formulario de cierre:
  - 3 preguntas del técnico
  - 2 imágenes de evidencia final

**Parámetros enviados:**
```json
{
  "action": "complete_work",
  "appointment_name": "AP-12345",
  "work_order_name": "WO-67890",
  "esn": "123456789012345",
  "technician_email": "tecnico@example.com"
}
```

**Archivo:** `src/components/FormularioCierre.tsx` (línea 82-108)

**Comportamiento:**
- Si el webhook falla, se muestra un diálogo de confirmación al técnico
- El técnico puede decidir continuar incluso si el webhook falla
- En modo de pruebas (ESN `000000000000000`), se simula una respuesta exitosa
- Después de ejecutar el webhook, se finaliza el servicio automáticamente

---

## Flujo Completo del Servicio

```
┌─────────────────────────────────────┐
│  1. SELECCIÓN DEL SERVICIO          │
│     - Calendario de servicios       │
│     - Búsqueda por AP               │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  FASE 1: PREFOLIO                   │
│  ─────────────────────────────────  │
│  ✓ Datos del vehículo               │
│  ✓ Datos del dispositivo (ESN)      │
│  ✓ Fotos de evidencia               │
│  ✓ Búsqueda en inventario Zoho      │
└─────────────┬───────────────────────┘
              │
              ▼
      🔔 WEBHOOK: start_work
              │
              ▼
┌─────────────────────────────────────┐
│  FASE 2: PRUEBAS DEL DISPOSITIVO    │
│  ─────────────────────────────────  │
│  A) Pruebas Activas (manuales)      │
│     ✓ Bloqueo                       │
│     ✓ Desbloqueo                    │
│     ✓ Buzzer On                     │
│     ✓ Buzzer Off                    │
│                                     │
│  B) Pruebas Pasivas (automáticas)   │
│     ✓ Ignición                      │
│     ✓ Ubicación                     │
│     ✓ Botón de pánico               │
└─────────────┬───────────────────────┘
              │
              ▼
  ¿Todas las pruebas completadas?
              │
              ▼ Sí
┌─────────────────────────────────────┐
│  FASE 3: FORMULARIO DE CIERRE       │
│  ─────────────────────────────────  │
│  ✓ Pregunta 1: Cliente presente     │
│  ✓ Pregunta 2: Problemas            │
│  ✓ Pregunta 3: Observaciones        │
│  ✓ Imagen 1: Instalación completa   │
│  ✓ Imagen 2: Equipo instalado       │
└─────────────┬───────────────────────┘
              │
              ▼
     🔔 WEBHOOK: complete_work
              │
              ▼
┌─────────────────────────────────────┐
│  SERVICIO FINALIZADO                │
│  ─────────────────────────────────  │
│  ✓ Resumen de validación            │
│  ✓ Estado: COMPLETADO               │
│  ✓ Webhook final enviado            │
└─────────────────────────────────────┘
```

## Archivos Clave

### Servicio de Transiciones
**Archivo:** `src/services/serviceTransitionService.ts`

Funciones principales:
- `enviarTransicionServicio()` - Función base para enviar webhooks
- `notificarInicioTrabajo()` - Wrapper para `start_work`
- `notificarTrabajoCompletado()` - Wrapper para `complete_work`

### Componentes

1. **PrefolioForm** (`src/components/PrefolioForm.tsx`)
   - Ejecuta `start_work` al guardar
   - Líneas clave: 568-588

2. **FormularioCierre** (`src/components/FormularioCierre.tsx`)
   - Formulario de cierre del servicio
   - Ejecuta `complete_work` al completar
   - Líneas clave: 82-108

3. **App** (`src/App.tsx`)
   - Controla el flujo general
   - Detecta cuando todas las pruebas están completadas (línea 719-726)
   - Muestra el FormularioCierre automáticamente
   - Líneas clave: 52-53, 485-490, 719-740, 994-1000

## Modo de Pruebas

Cuando se utiliza el ESN especial `000000000000000`:
- Los webhooks NO se envían al servidor real
- Se simulan respuestas exitosas automáticamente
- Se incluye un delay realista (800ms)
- Los logs muestran el prefijo `🧪 [TRANSICIÓN]`

## Manejo de Errores

### Error en start_work
Si el webhook de inicio falla:
1. Se muestra un diálogo al técnico con el error
2. El técnico puede cancelar o continuar
3. Si cancela, permanece en el PreFolio
4. Si continua, avanza a las pruebas

### Error en complete_work
Si el webhook de completado falla:
1. Se muestra un diálogo al técnico con el error
2. El técnico puede cancelar o continuar
3. Si cancela, permanece en el formulario de cierre
4. Si continua, finaliza el servicio

## Logs en Consola

El sistema genera logs detallados para cada transición:

```
✅ [PREFOLIO] Datos y fotos guardados exitosamente
🔔 [PREFOLIO] Enviando notificación de inicio de trabajo...
✅ [PREFOLIO] Notificación de inicio de trabajo enviada exitosamente
```

```
📝 [CIERRE] Guardando datos del formulario de cierre...
✅ [CIERRE] Datos del formulario guardados
🔔 [CIERRE] Enviando notificación de trabajo completado...
✅ [CIERRE] Notificación de trabajo completado enviada exitosamente
```

## Estructura de Respuesta

El webhook debe responder con:

```json
{
  "success": true,
  "message": "Transición procesada exitosamente",
  "data": {
    // Datos adicionales opcionales
  }
}
```

En caso de error:

```json
{
  "success": false,
  "error": "Descripción del error"
}
```

## Consideraciones Importantes

1. **Sincronización**: Los webhooks mantienen sincronizado el estado del servicio con n8n
2. **Trazabilidad**: Cada transición queda registrada en los logs del sistema
3. **Resiliencia**: El sistema permite continuar incluso si los webhooks fallan
4. **Modo pruebas**: El ESN de pruebas no envía webhooks reales, ideal para capacitación
5. **División clara**: El flujo está dividido en 2 fases bien definidas con sus respectivos webhooks
