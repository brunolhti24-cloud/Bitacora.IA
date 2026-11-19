-- Foto propia para cada área o frente de trabajo (opcional).
-- Sin foto, la app usa una imagen de referencia según el nombre o un fondo gris.
-- Idempotente: se puede ejecutar más de una vez.

ALTER TABLE project_areas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Las fotos se guardan en el espacio project_images (carpeta areas/<obra>/) y solo
-- el director las sube; la política "Imagenes de obra: subir (director)" de
-- 20261028_ingresos_y_archivos.sql ya lo cubre. Para poder quitar o reemplazar una foto:
DROP POLICY IF EXISTS "Imagenes de obra: borrar las propias" ON storage.objects;
CREATE POLICY "Imagenes de obra: borrar las propias" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'project_images' AND owner = auth.uid());
