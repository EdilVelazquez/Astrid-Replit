/*
  # Configuración completa del sistema de fotos del prefolio

  1. Configuración del Bucket
    - Asegura que existe el bucket 'prefolio-photos'
    - Configura como bucket privado con tamaño límite de 50MB por archivo
    
  2. Políticas de Storage (CRÍTICO)
    - Permite a usuarios autenticados subir archivos (INSERT)
    - Permite a usuarios autenticados ver sus archivos (SELECT)
    - Permite a usuarios autenticados actualizar archivos (UPDATE)
    - Permite a usuarios autenticados eliminar archivos (DELETE)
    
  3. Tabla prefolio_fotos
    - Recrea la tabla con estructura limpia
    - created_by se genera automáticamente con auth.uid()
    - Configuración correcta de RLS
    
  4. Seguridad
    - RLS habilitado en tabla
    - Políticas permisivas para usuarios autenticados
*/

-- =====================================================
-- 1. CONFIGURACIÓN DEL BUCKET
-- =====================================================

-- Insertar o actualizar el bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prefolio-photos',
  'prefolio-photos',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) 
DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  updated_at = now();

-- =====================================================
-- 2. POLÍTICAS DE STORAGE (CRÍTICO - ESTO FALTABA)
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

-- Política para SUBIR archivos (INSERT)
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prefolio-photos'
);

-- Política para VER archivos (SELECT)
CREATE POLICY "Authenticated users can view photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'prefolio-photos'
);

-- Política para ACTUALIZAR archivos (UPDATE)
CREATE POLICY "Authenticated users can update photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'prefolio-photos'
)
WITH CHECK (
  bucket_id = 'prefolio-photos'
);

-- Política para ELIMINAR archivos (DELETE)
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'prefolio-photos'
);

-- =====================================================
-- 3. TABLA PREFOLIO_FOTOS - RECREAR LIMPIA
-- =====================================================

-- Eliminar tabla existente y recrear
DROP TABLE IF EXISTS prefolio_fotos CASCADE;

-- Crear tabla limpia
CREATE TABLE prefolio_fotos (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  expediente_id bigint NOT NULL REFERENCES expedientes_servicio(id) ON DELETE CASCADE,
  campo text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- Habilitar RLS
ALTER TABLE prefolio_fotos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. POLÍTICAS RLS PARA LA TABLA
-- =====================================================

-- Política SELECT: usuarios autenticados pueden ver todas las fotos
CREATE POLICY "Authenticated users can view all prefolio photos"
ON prefolio_fotos
FOR SELECT
TO authenticated
USING (true);

-- Política INSERT: usuarios autenticados pueden insertar fotos
CREATE POLICY "Authenticated users can insert prefolio photos"
ON prefolio_fotos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política UPDATE: usuarios autenticados pueden actualizar fotos
CREATE POLICY "Authenticated users can update prefolio photos"
ON prefolio_fotos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política DELETE: usuarios autenticados pueden eliminar fotos
CREATE POLICY "Authenticated users can delete prefolio photos"
ON prefolio_fotos
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- 5. ÍNDICES PARA RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_prefolio_fotos_expediente_id 
ON prefolio_fotos(expediente_id);

CREATE INDEX IF NOT EXISTS idx_prefolio_fotos_campo 
ON prefolio_fotos(campo);

CREATE INDEX IF NOT EXISTS idx_prefolio_fotos_created_by 
ON prefolio_fotos(created_by);
