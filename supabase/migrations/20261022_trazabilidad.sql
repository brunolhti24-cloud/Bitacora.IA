-- Trazabilidad: folios de bitácora, firmas con fecha, historial de correcciones,
-- movimientos de materiales, tareas con vencimiento y seguimiento de solicitudes.
-- Idempotente: se puede ejecutar más de una vez. Ejecutar en Supabase > SQL Editor
-- ANTES de desplegar el código que la usa.

-- Acceso estándar: miembro del proyecto, o admin/director.
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director'));
$$;

-- ============================================================
-- 1. Bitácoras: folio, fechas de firma, versión e historial
-- ============================================================
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS folio_number INTEGER;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS folio TEXT;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Folios para bitácoras existentes: consecutivo por obra en orden de captura
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at, id) AS n
  FROM daily_reports WHERE folio_number IS NULL
), base AS (
  SELECT project_id, COALESCE(MAX(folio_number), 0) AS max_n FROM daily_reports GROUP BY project_id
)
UPDATE daily_reports dr
SET folio_number = b.max_n + numbered.n,
    folio = 'BIT-' || UPPER(SUBSTRING(dr.project_id::TEXT, 1, 4)) || '-' || LPAD((b.max_n + numbered.n)::TEXT, 4, '0')
FROM numbered, base b
WHERE dr.id = numbered.id AND b.project_id = dr.project_id;

-- Firmas ya hechas sin fecha: se toma la mejor aproximación disponible
UPDATE daily_reports SET signed_at = COALESCE(accepted_at, created_at)
WHERE status = 'firmada' AND signed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_reports_project_folio_idx ON daily_reports(project_id, folio_number);

CREATE OR REPLACE FUNCTION public.assign_report_folio()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.folio_number IS NULL THEN
    -- Bloqueo por obra para que dos capturas simultáneas no reciban el mismo folio
    PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::TEXT));
    SELECT COALESCE(MAX(folio_number), 0) + 1 INTO NEW.folio_number
    FROM daily_reports WHERE project_id = NEW.project_id;
  END IF;
  NEW.folio := 'BIT-' || UPPER(SUBSTRING(NEW.project_id::TEXT, 1, 4)) || '-' || LPAD(NEW.folio_number::TEXT, 4, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS daily_reports_folio ON daily_reports;
CREATE TRIGGER daily_reports_folio BEFORE INSERT ON daily_reports
FOR EACH ROW EXECUTE FUNCTION public.assign_report_folio();

-- Historial de correcciones: si cambia el contenido de una bitácora ya aceptada
-- o firmada, se guarda la versión anterior y se incrementa la versión.
CREATE TABLE IF NOT EXISTS daily_report_revisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  report_date DATE,
  progress_notes TEXT,
  special_request TEXT,
  status TEXT,
  edited_by UUID REFERENCES profiles(id),
  edited_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE daily_report_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Revisions viewable by project members" ON daily_report_revisions;
CREATE POLICY "Revisions viewable by project members" ON daily_report_revisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_revisions.daily_report_id AND public.can_access_project(dr.project_id))
);

CREATE OR REPLACE FUNCTION public.keep_report_revision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IN ('aceptada', 'firmada') AND (
       NEW.progress_notes IS DISTINCT FROM OLD.progress_notes
    OR NEW.report_date IS DISTINCT FROM OLD.report_date
    OR NEW.special_request IS DISTINCT FROM OLD.special_request
  ) THEN
    INSERT INTO daily_report_revisions (daily_report_id, version, report_date, progress_notes, special_request, status, edited_by)
    VALUES (OLD.id, OLD.version, OLD.report_date, OLD.progress_notes, OLD.special_request, OLD.status, auth.uid());
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS daily_reports_revision ON daily_reports;
CREATE TRIGGER daily_reports_revision BEFORE UPDATE ON daily_reports
FOR EACH ROW EXECUTE FUNCTION public.keep_report_revision();

-- ============================================================
-- 2. Materiales: registro de cada movimiento
-- ============================================================
CREATE TABLE IF NOT EXISTS material_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'salida')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  area_id UUID REFERENCES project_areas(id) ON DELETE SET NULL,
  received_by TEXT,
  reason TEXT,
  notes TEXT,
  balance_after NUMERIC NOT NULL,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS material_movements_material_idx ON material_movements(material_id, created_at DESC);
ALTER TABLE material_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Movements viewable by project members" ON material_movements;
CREATE POLICY "Movements viewable by project members" ON material_movements FOR SELECT USING (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Movements insertable by project members" ON material_movements;
CREATE POLICY "Movements insertable by project members" ON material_movements FOR INSERT WITH CHECK (public.can_access_project(project_id));

-- Actualiza existencias y registra el movimiento en una sola transacción.
-- SECURITY INVOKER: respeta las políticas RLS de quien llama.
CREATE OR REPLACE FUNCTION public.record_material_movement(
  p_material_id UUID,
  p_type TEXT,
  p_quantity NUMERIC,
  p_area_id UUID DEFAULT NULL,
  p_received_by TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS material_movements
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  m materials%ROWTYPE;
  new_balance NUMERIC;
  mov material_movements%ROWTYPE;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;
  IF p_type NOT IN ('entrada', 'salida') THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;

  SELECT * INTO m FROM materials WHERE id = p_material_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Material no encontrado';
  END IF;

  IF p_type = 'entrada' THEN
    UPDATE materials SET total_received = COALESCE(total_received, 0) + p_quantity WHERE id = p_material_id;
    new_balance := COALESCE(m.total_received, 0) + p_quantity - COALESCE(m.total_used, 0);
  ELSE
    IF COALESCE(m.total_received, 0) - COALESCE(m.total_used, 0) < p_quantity THEN
      RAISE EXCEPTION 'No hay suficiente existencia: quedan % y se intentan sacar %',
        COALESCE(m.total_received, 0) - COALESCE(m.total_used, 0), p_quantity;
    END IF;
    UPDATE materials SET total_used = COALESCE(total_used, 0) + p_quantity WHERE id = p_material_id;
    new_balance := COALESCE(m.total_received, 0) - COALESCE(m.total_used, 0) - p_quantity;
  END IF;

  INSERT INTO material_movements (material_id, project_id, type, quantity, area_id, received_by, reason, notes, balance_after, recorded_by)
  VALUES (p_material_id, m.project_id, p_type, p_quantity, p_area_id, NULLIF(TRIM(p_received_by), ''), NULLIF(TRIM(p_reason), ''), NULLIF(TRIM(p_notes), ''), new_balance, auth.uid())
  RETURNING * INTO mov;

  RETURN mov;
END $$;

-- ============================================================
-- 3. Tareas: vencimiento, prioridad, área y bloqueo
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES project_areas(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('baja', 'normal', 'alta', 'urgente'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 4. Solicitudes: fecha requerida y seguimiento por etapa
-- ============================================================
ALTER TABLE special_requests ADD COLUMN IF NOT EXISTS needed_by DATE;
ALTER TABLE special_requests ADD COLUMN IF NOT EXISTS stage TEXT;
DO $$ BEGIN
  ALTER TABLE special_requests ADD CONSTRAINT special_requests_stage_check
    CHECK (stage IS NULL OR stage IN ('aprobada', 'comprada', 'entregada', 'recibida'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS special_request_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES special_requests(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('solicitada', 'aprobada', 'rechazada', 'comprada', 'entregada', 'recibida')),
  note TEXT,
  actor UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS special_request_events_request_idx ON special_request_events(request_id, created_at);
ALTER TABLE special_request_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Request events viewable by project members" ON special_request_events;
CREATE POLICY "Request events viewable by project members" ON special_request_events FOR SELECT USING (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Request events insertable by project members" ON special_request_events;
CREATE POLICY "Request events insertable by project members" ON special_request_events FOR INSERT WITH CHECK (public.can_access_project(project_id) AND actor = auth.uid());
