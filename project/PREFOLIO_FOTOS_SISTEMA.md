# Sistema de Fotos del Prefolio - Documentación Técnica

## Descripción General

El sistema de fotos del prefolio permite a los técnicos capturar y almacenar evidencia fotográfica durante el proceso de instalación/verificación de dispositivos. Este sistema ha sido completamente reestructurado para garantizar seguridad, robustez y facilidad de uso.

## Arquitectura del Sistema

### 1. Base de Datos

#### Tabla: `prefolio_fotos`
```sql
CREATE TABLE prefolio_fotos (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  expediente_id bigint NOT NULL REFERENCES expedientes_servicio(id) ON DELETE CASCADE,
  campo text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
```

**Campos:**
- `id`: Identificador único autogenerado
- `expediente_id`: Referencia al expediente de servicio (con CASCADE DELETE)
- `campo`: Tipo de foto (ej: 'foto_vehiculo_frente', 'foto_odometro', etc.)
- `file_path`: Ruta del archivo en el storage
- `created_at`: Timestamp de creación
- `created_by`: UUID del usuario que subió la foto (automático via `auth.uid()`)

**Índices:**
- `idx_prefolio_fotos_expediente_id` - Para búsquedas por expediente
- `idx_prefolio_fotos_campo` - Para búsquedas por tipo de foto
- `idx_prefolio_fotos_created_by` - Para auditoría

### 2. Storage Bucket: `prefolio-photos`

**Configuración:**
- **Nombre**: `prefolio-photos`
- **Tipo**: Privado (no público)
- **Límite de tamaño**: 50 MB por archivo
- **Tipos MIME permitidos**:
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`

**Estructura de carpetas:**
```
prefolio-photos/
  └── prefolio/
      └── {expediente_id}/
          ├── foto_vehiculo_frente/
          │   └── {timestamp}.{ext}
          ├── foto_vehiculo_costado_izquierdo/
          │   └── {timestamp}.{ext}
          ├── foto_vehiculo_costado_derecho/
          │   └── {timestamp}.{ext}
          ├── foto_vehiculo_trasera/
          │   └── {timestamp}.{ext}
          ├── foto_odometro/
          │   └── {timestamp}.{ext}
          └── foto_vin/
              └── {timestamp}.{ext}
```

### 3. Políticas de Seguridad (RLS)

#### Políticas de Storage (storage.objects)

**INSERT - "Authenticated users can upload photos"**
```sql
WITH CHECK (bucket_id = 'prefolio-photos')
```
Permite a usuarios autenticados subir archivos al bucket.

**SELECT - "Authenticated users can view photos"**
```sql
USING (bucket_id = 'prefolio-photos')
```
Permite a usuarios autenticados ver archivos del bucket.

**UPDATE - "Authenticated users can update photos"**
```sql
USING (bucket_id = 'prefolio-photos')
WITH CHECK (bucket_id = 'prefolio-photos')
```
Permite a usuarios autenticados actualizar archivos del bucket.

**DELETE - "Authenticated users can delete photos"**
```sql
USING (bucket_id = 'prefolio-photos')
```
Permite a usuarios autenticados eliminar archivos del bucket.

#### Políticas de Tabla (prefolio_fotos)

Todas las operaciones (SELECT, INSERT, UPDATE, DELETE) están permitidas para usuarios autenticados con `USING (true)` y `WITH CHECK (true)`.

## Flujo de Operación

### 1. Guardar Fotos del Prefolio

```typescript
const resultado = await guardarPrefolioFotos(
  expedienteId,
  fotosVehiculo,    // Array de 4 archivos (frente, trasera, ambos costados)
  fotoOdometro,     // File | null
  fotoVin           // File | null
);
```

**Proceso:**
1. Valida la sesión del usuario
2. Para cada foto:
   - Genera un nombre único basado en timestamp
   - Sube el archivo al storage en la carpeta correspondiente
   - Guarda la metadata en la tabla `prefolio_fotos`
   - Si falla, elimina el archivo del storage (rollback)
3. Retorna resultado con `{ success: boolean, error?: string }`

### 2. Obtener Fotos del Prefolio

```typescript
const fotos = await obtenerFotosPrefolio(expedienteId);
```

Retorna un array de objetos `PrefolioFoto[]` con toda la información de las fotos almacenadas.

### 3. Obtener URL Pública de una Foto

```typescript
const url = await obtenerUrlFotoPrefolio(filePath);
```

Retorna la URL pública para visualizar la foto.

### 4. Eliminar Prefolio Completo

```typescript
const resultado = await eliminarPrefolioCompleto(expedienteId);
```

**Proceso (Reinicio Completo del Servicio):**
1. Obtiene todas las fotos del expediente
2. Elimina todos los archivos del storage
3. Elimina todos los registros de `prefolio_fotos`
4. **REINICIA LAS PRUEBAS PASIVAS**: Elimina el registro de `device_test_sessions` para el expediente
   - Esto resetea todas las pruebas pasivas: ignición, botón pánico, ubicación, bloqueo, desbloqueo, buzzer on/off
   - El servicio vuelve a estado inicial, como si nunca se hubiera iniciado
5. Limpia los campos del prefolio en `expedientes_servicio`
6. Establece `prefolio_realizado = false`

**IMPORTANTE**: Esta acción es como reiniciar el servicio completo. El técnico deberá:
- Volver a llenar el prefolio desde cero
- Volver a tomar todas las fotos requeridas
- Volver a completar todas las pruebas pasivas
- No podrá avanzar hasta completar nuevamente todo el proceso

**Confirmación**: El sistema requiere confirmación del usuario antes de ejecutar esta acción, advirtiendo que reiniciará todo el servicio incluyendo las pruebas pasivas.

## Manejo de Errores

El sistema implementa manejo robusto de errores:

1. **Validación de Sesión**: Verifica que el usuario esté autenticado antes de cualquier operación
2. **Rollback en Storage**: Si falla el guardado en BD, elimina el archivo del storage
3. **Logging Detallado**: Usa console.log con emojis para facilitar debugging
4. **Mensajes Claros**: Retorna mensajes de error descriptivos al usuario

## Logs del Sistema

El sistema usa emojis para identificar fácilmente el tipo de operación:

- 📸 Subiendo foto
- ✓ Sesión verificada
- 📤 Subiendo archivo a storage
- ✅ Operación exitosa
- 💾 Guardando metadata
- ❌ Error
- 🗑️ Eliminando archivos

## Tipos TypeScript

```typescript
interface PrefolioFoto {
  id: number;
  expediente_id: number;
  campo: string;
  file_path: string;
  created_at: string;
  created_by?: string;
}

interface PrefolioDatos {
  prefolio_realizado: boolean;
  prefolio_vehiculo_texto?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_vin?: string;
  vehicle_odometer?: number;
  vehicle_license_plate?: string;
  vehicle_color?: string;
  vehicle_numero_economico?: string;
  vehicle_year?: string;
  service_type?: string;
  prefolio_modelo_dispositivo?: string;
  device_esn?: string;
  prefolio_imei_dispositivo?: string;
  prefolio_telefono_sim?: string;
}
```

## Consideraciones de Seguridad

1. **Autenticación Obligatoria**: Todas las operaciones requieren usuario autenticado
2. **RLS Habilitado**: Row Level Security activado en tabla y storage
3. **Bucket Privado**: El bucket NO es público, requiere autenticación
4. **Validación de Tipos MIME**: Solo acepta formatos de imagen específicos
5. **Límite de Tamaño**: Máximo 50 MB por archivo
6. **created_by Automático**: Se usa `auth.uid()` para evitar manipulación

## Resolución de Problemas

### Error: "Usuario no autenticado"
**Causa**: La sesión expiró o el usuario no está logueado
**Solución**: El usuario debe iniciar sesión nuevamente

### Error: "Error uploading file to storage"
**Causa**: Problemas con las políticas de storage o permisos
**Solución**: Verificar que las políticas de storage estén correctamente configuradas

### Error: "Error saving photo metadata"
**Causa**: Problemas con las políticas RLS de la tabla o datos inválidos
**Solución**: Verificar las políticas RLS y la estructura de datos

### Las fotos no se guardan
**Causa**: Falta la migración `fix_prefolio_storage_complete`
**Solución**: Aplicar la migración que configura el bucket y las políticas

## Mantenimiento

### Limpiar Storage Huérfano

Si hay archivos en el storage sin registro en la BD:

```sql
-- Obtener archivos del storage
SELECT name, metadata FROM storage.objects
WHERE bucket_id = 'prefolio-photos';

-- Comparar con registros en BD
SELECT file_path FROM prefolio_fotos;
```

### Auditoría de Fotos

```sql
-- Ver quién subió qué foto y cuándo
SELECT
  pf.id,
  pf.expediente_id,
  pf.campo,
  pf.created_at,
  pf.created_by,
  au.email as uploaded_by_email
FROM prefolio_fotos pf
LEFT JOIN auth.users au ON au.id = pf.created_by
ORDER BY pf.created_at DESC;
```

## Migraciones Aplicadas

1. **20251211223036_add_prefolio_system.sql** - Sistema inicial de prefolio
2. **20251212001012_fix_prefolio_fotos_rls_policies.sql** - Arreglo de políticas RLS
3. **20251212013015_fix_prefolio_fotos_rls_authenticated.sql** - Políticas para authenticated
4. **20251212014821_fix_prefolio_fotos_insert_policy.sql** - Arreglo de política INSERT
5. **fix_prefolio_storage_complete.sql** - **MIGRACIÓN CRÍTICA** - Configuración completa del storage

## Nueva Funcionalidad: Escaneo de VIN con IA

### VinScannerWithPhoto

El sistema ahora incluye un escáner inteligente de VIN que permite capturar la foto del VIN y extraer automáticamente el texto del VIN mediante IA.

#### Características:

1. **Captura automática del VIN**:
   - El usuario hace clic en "Escanear VIN con IA"
   - Toma una foto del VIN con la cámara
   - La IA analiza la imagen y extrae el VIN automáticamente
   - Si es exitoso, rellena el campo de VIN y guarda la foto

2. **Validación de VIN**:
   - Verifica que el VIN tenga exactamente 17 caracteres
   - Valida que no contenga las letras prohibidas (I, O, Q)
   - Verifica el formato correcto con el checksum

3. **Flujo de usuario**:
   - Botón "Escanear VIN con IA" visible en el campo de VIN
   - Opción de tomar foto o subir imagen existente
   - Muestra el VIN detectado para confirmación
   - Al confirmar, rellena automáticamente el campo y guarda la foto
   - También permite captura manual si el escaneo falla

4. **Integración con PrefolioForm**:
   - Componente integrado directamente en el campo de VIN
   - Al detectar el VIN, actualiza automáticamente:
     - El campo de texto del VIN
     - La foto del VIN (guardada como evidencia)
   - Muestra indicador visual cuando la foto está capturada
   - Permite eliminar y volver a capturar si es necesario

#### Implementación técnica:

**Componente**: `VinScannerWithPhoto.tsx`

```typescript
interface VinScannerWithPhotoProps {
  onVinDetected: (vin: string, photo: File) => void;
  currentVin?: string;
}
```

**Integración en PrefolioForm**:

```typescript
const handleVinDetected = (detectedVin: string, photo: File) => {
  setVin(detectedVin);
  setFotoVin(photo);
  setError('');
};

<VinScannerWithPhoto
  onVinDetected={handleVinDetected}
  currentVin={vin}
/>
```

**Webhook de IA**: `https://aiwebhookn8n.numaris.com/webhook/70f38fe9-98a8-462d-9a6f-7e088e1a861e`

#### Ventajas:

- Reduce errores de transcripción manual
- Captura evidencia fotográfica automáticamente
- Acelera el proceso de llenado del prefolio
- Mejora la experiencia del usuario técnico
- Validación en tiempo real del VIN

#### Fallback manual:

Si el escaneo falla o el usuario prefiere capturar la foto manualmente:
- Puede usar el botón "Tomar/Elegir foto manualmente"
- Ingresa el VIN manualmente en el campo de texto
- La foto se guarda de igual manera como evidencia

## Última Actualización

**Fecha**: 12 de diciembre de 2024
**Versión**: 2.2 (Reinicio completo del servicio al eliminar prefolio)
**Estado**: Producción Ready ✅

### Cambios en versión 2.2:

1. **Reinicio Completo del Servicio**: Cuando se elimina el prefolio, ahora también se reinician las pruebas pasivas
   - Se elimina el registro de `device_test_sessions` correspondiente al expediente
   - Se resetean todos los estados de pruebas pasivas en el frontend
   - El servicio vuelve a estado inicial completamente
   - El técnico debe volver a completar todo el proceso desde cero

2. **Confirmación Mejorada**: El mensaje de confirmación ahora advierte claramente que se reiniciará todo el servicio

3. **Logging Mejorado**: Los logs del sistema ahora indican claramente cuando se reinician las pruebas pasivas
