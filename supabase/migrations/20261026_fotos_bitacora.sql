-- Fotos de evidencia en las bitácoras.
-- Idempotente: se puede ejecutar más de una vez. Requiere la migración
-- 20261022_trazabilidad.sql (usa public.can_access_project).

-- 1. Espacio de almacenamiento público para las fotos (las URLs se muestran en la app y en el PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('report_photos', 'report_photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Solo se sube a la carpeta de una obra en la que participa el usuario: <project_id>/<foto>.jpg
DROP POLICY IF EXISTS "Fotos de bitacora: subir a obras propias" ON storage.objects;
CREATE POLICY "Fotos de bitacora: subir a obras propias" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report_photos'
  AND public.can_access_project(((storage.foldername(name))[1])::uuid)
);

-- Quien subió la foto puede quitarla (por ejemplo, si la quita antes de guardar la bitácora)
DROP POLICY IF EXISTS "Fotos de bitacora: borrar las propias" ON storage.objects;
CREATE POLICY "Fotos de bitacora: borrar las propias" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'report_photos' AND owner = auth.uid());

-- 3. La tabla report_photos solo tenía permiso de lectura: se permite registrar
--    fotos en bitácoras de obras a las que el usuario tiene acceso
DROP POLICY IF EXISTS "Project members can insert report photos" ON report_photos;
CREATE POLICY "Project members can insert report photos" ON report_photos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_reports dr
    WHERE dr.id = report_photos.daily_report_id
      AND public.can_access_project(dr.project_id)
  )
);
