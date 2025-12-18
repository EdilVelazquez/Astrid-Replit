# Modo de Pruebas

## ESN de Pruebas: `000000000000000`

El sistema incluye un modo especial de pruebas que permite ejecutar el flujo completo de instalación sin dependencia del backend real. Este modo se activa automáticamente cuando se utiliza el ESN especial `000000000000000`.

## Comportamiento del Modo de Pruebas

### 1. Búsqueda de Equipo en Inventario (Zoho)

**Archivo:** `src/services/zohoInventoryService.ts`

Cuando el ESN es `000000000000000`:
- NO se realiza llamada real al Edge Function
- Se simula una respuesta exitosa inmediata
- Se devuelven datos de prueba:
  - **ID:** TEST-ID-123456789
  - **Modelo:** DISPOSITIVO DE PRUEBA
  - **IMEI:** 999999999999999
  - **Línea:** 5555555555

### 2. Envío de Comandos al Dispositivo

**Archivo:** `src/services/commandService.ts`

Cuando el ESN es `000000000000000`:
- NO se envían comandos reales al webhook
- Se simula un envío exitoso
- Se incluye un delay de 500ms para simular tiempo de red
- El técnico puede confirmar manualmente el comando (igual que en flujo normal)

Comandos soportados en modo pruebas:
- Bloqueo (comando 1)
- Desbloqueo (comando 2)
- Buzzer On (comando 3)
- Buzzer Off (comando 4)

### 3. Consultas de Estatus Pasivo

**Archivo:** `src/hooks/useDevicePassiveStatus.ts`

Cuando el ESN es `000000000000000`:
- NO se realizan llamadas reales al Edge Function `estatusgral`
- Se simula una respuesta del servidor con datos de prueba
- Se incluye un delay de 1000ms para simular latencia de red
- Se generan datos simulados con:
  - Ignición activada (inputs.ignition = '1')
  - Ubicación en CDMX (19.432608, -99.133209)
  - Fecha/hora actual

## Características del Modo de Pruebas

### Lo que SE mantiene igual:
- Flujo completo de pasos (prefolio, pruebas activas, pruebas pasivas)
- Validaciones de campos obligatorios
- Captura de fotos
- Confirmación manual del técnico para cada prueba
- Guardado en base de datos
- Logs en consola
- Interfaz de usuario completa

### Lo que NO ocurre:
- Llamadas HTTP a servicios externos (Zoho, webhooks, estatusgral)
- Envío de comandos reales a dispositivos físicos
- Dependencia de conectividad de red

## Caso de Uso

El modo de pruebas es ideal para:
- Capacitación de nuevos técnicos
- Demostración del sistema sin hardware
- Pruebas de desarrollo sin afectar dispositivos reales
- Validación del flujo completo sin dependencias externas

## Flujo de Trabajo con ESN de Pruebas

1. En el módulo de PreFolio, capturar o escribir el ESN: `000000000000000`
2. El sistema busca automáticamente y llena los datos del dispositivo
3. Completar el resto del formulario normalmente
4. En Pruebas Activas:
   - Enviar comandos (se simulan automáticamente)
   - Confirmar manualmente cada comando como exitoso/fallido
5. En Pruebas Pasivas:
   - El sistema consulta automáticamente el estatus (simulado)
   - Confirmar manualmente ignición, botón de pánico y ubicación
6. Completar el servicio normalmente

## Identificación Visual

En los logs de consola, las operaciones en modo de pruebas se identifican con el prefijo `🧪 [PRUEBAS]`.
