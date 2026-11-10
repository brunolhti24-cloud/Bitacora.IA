-- Colores de áreas y archivo de obras y bitácoras.
-- Idempotente: se puede ejecutar más de una vez.

-- ============================================================
-- 1. Áreas: color de la tarjeta (clave de la paleta de la app; vacío = automático)
-- ============================================================
ALTER TABLE project_areas ADD COLUMN IF NOT EXISTS color TEXT;

-- ============================================================
-- 2. Obras: activa, terminada o archivada. No se borra nada: una obra terminada
--    o archivada conserva todas sus bitácoras y se consulta en "Archivo".
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'activa';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('activa', 'terminada', 'archivada'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. Bitácoras archivadas: salen del historial del área y quedan en "Archivo"
-- ============================================================
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS daily_reports_archived_idx ON daily_reports(project_id) WHERE archived_at IS NOT NULL;
