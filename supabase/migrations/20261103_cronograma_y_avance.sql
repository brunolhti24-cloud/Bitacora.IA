-- Cronograma de actividades y avance físico reportado.
-- Idempotente: se puede ejecutar más de una vez. Requiere 20261022_trazabilidad.sql.

-- ============================================================
-- 1. Avance físico: quién lo reportó y cuándo (se captura a mano)
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_updated_at TIMESTAMPTZ;

-- ============================================================
-- 2. Cronograma: fecha de inicio y porcentaje de avance por actividad.
--    La fecha de término es due_date. Las tareas existentes quedan sin
--    fechas ("Sin programar"): no se inventan.
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_progress_check CHECK (progress BETWEEN 0 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_dates_check CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Las tareas ya terminadas cuentan como 100 % de avance
UPDATE tasks SET progress = 100 WHERE status = 'Terminada' AND progress = 0;
