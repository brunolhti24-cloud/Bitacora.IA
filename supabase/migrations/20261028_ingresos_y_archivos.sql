-- Ingresos y archivos: corrige "Could not find the 'description' column of 'incomes'"
-- y "Error subiendo imagen: new row violates row-level security policy".
-- Idempotente: se puede ejecutar más de una vez. Requiere 20261022_trazabilidad.sql.

-- ¿El usuario actual es director de obra? (admin o director)
CREATE OR REPLACE FUNCTION public.is_director()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'director'));
$$;

-- ============================================================
-- 1. Ingresos: la app usa description e income_date; el esquema original
--    tenía concept y date. Se agregan las columnas y se copian los datos.
-- ============================================================
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS income_date DATE;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES profiles(id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'incomes' AND column_name = 'concept') THEN
    UPDATE incomes SET description = concept WHERE description IS NULL;
    ALTER TABLE incomes ALTER COLUMN concept DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'incomes' AND column_name = 'date') THEN
    UPDATE incomes SET income_date = "date" WHERE income_date IS NULL;
  END IF;
END $$;

UPDATE incomes SET income_date = created_at::date WHERE income_date IS NULL AND created_at IS NOT NULL;
ALTER TABLE incomes ALTER COLUMN income_date SET DEFAULT CURRENT_DATE;

-- El director (admin o director) registra y consulta ingresos de sus obras
DROP POLICY IF EXISTS "Directors can view incomes" ON incomes;
CREATE POLICY "Directors can view incomes" ON incomes FOR SELECT USING (public.is_director());
DROP POLICY IF EXISTS "Directors can insert incomes" ON incomes;
CREATE POLICY "Directors can insert incomes" ON incomes FOR INSERT WITH CHECK (public.is_director());

-- ============================================================
-- 2. Archivos: espacios de almacenamiento y permisos de subida
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('project_images', 'project_images', true), ('receipts', 'receipts', true), ('company_logos', 'company_logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Imagen de la obra: solo el director
DROP POLICY IF EXISTS "Imagenes de obra: subir (director)" ON storage.objects;
CREATE POLICY "Imagenes de obra: subir (director)" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project_images'
  AND public.is_director()
);

-- Comprobantes de gastos: cualquier usuario con sesión (residentes, administración, contratistas)
DROP POLICY IF EXISTS "Comprobantes: subir" ON storage.objects;
CREATE POLICY "Comprobantes: subir" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Logotipo de la empresa: se sube con upsert, así que también requiere actualizar
DROP POLICY IF EXISTS "Logotipos: subir" ON storage.objects;
CREATE POLICY "Logotipos: subir" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company_logos');
-- upsert = INSERT ... ON CONFLICT: necesita poder leer y actualizar el archivo propio
DROP POLICY IF EXISTS "Logotipos: leer los propios" ON storage.objects;
CREATE POLICY "Logotipos: leer los propios" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'company_logos' AND owner = auth.uid());
DROP POLICY IF EXISTS "Logotipos: reemplazar los propios" ON storage.objects;
CREATE POLICY "Logotipos: reemplazar los propios" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'company_logos' AND owner = auth.uid());
