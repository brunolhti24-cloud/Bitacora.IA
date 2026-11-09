-- Seguridad por constructora.
-- 1. Cada usuario solo ve y modifica datos de SU constructora (antes cualquier
--    director veía las obras, ingresos y gastos de todas).
-- 2. Nadie puede cambiarse el rol ni el equipo desde el navegador: solo las
--    funciones del servidor (registro con invitación y edición del equipo).
-- 3. Los perfiles solo los ve el propio equipo.
-- Idempotente: se puede ejecutar más de una vez. Requiere las migraciones anteriores.
-- Reemplaza TODAS las políticas de las tablas de la app por las de este archivo.

-- ============================================================
-- 0. Columnas que el código ya usa (por si faltan en alguna base)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;

-- ============================================================
-- 1. Funciones de apoyo (SECURITY DEFINER: leen sin quedar atrapadas en RLS)
-- ============================================================

-- Constructora del usuario actual = el director que lo invitó, o él mismo
CREATE OR REPLACE FUNCTION public.my_company()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(invited_by, id) FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'director'));
$$;

-- ¿La obra es de mi constructora, o estoy asignado a ella?
-- (Antes: cualquier admin o director de cualquier empresa tenía acceso.)
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
      SELECT 1 FROM projects pr
      JOIN profiles owner ON owner.id = pr.created_by
      WHERE pr.id = p_project_id
        AND COALESCE(owner.invited_by, owner.id) = public.my_company()
    )
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid());
$$;

-- Director de obra de esa obra
CREATE OR REPLACE FUNCTION public.is_project_director(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_director() AND public.can_access_project(p_project_id);
$$;

-- Planean el cronograma: director, residente y contratista
CREATE OR REPLACE FUNCTION public.is_planner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.my_role() IN ('admin', 'director', 'residente', 'subcontratista'), false);
$$;

-- ¿Ese usuario es de mi constructora?
CREATE OR REPLACE FUNCTION public.same_company(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND COALESCE(invited_by, id) = public.my_company());
$$;

-- ============================================================
-- 2. Rol y equipo: solo los cambian las funciones del servidor
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Sin usuario en la petición (SQL Editor, llave de servicio, alta de cuenta) o
  -- dentro de complete_signup / update_team_member: se permite.
  IF auth.uid() IS NULL OR current_setting('bitacora.trusted', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Quien crea su perfil desde el navegador es director de su propia constructora;
    -- para unirse a un equipo se usa la invitación (complete_signup).
    NEW.role := 'admin';
    NEW.invited_by := NULL;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
    RAISE EXCEPTION 'No se puede cambiar el rol ni el equipo desde aquí. Pídelo al director de obra.';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Operación no permitida.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_guard ON profiles;
CREATE TRIGGER profiles_guard BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_changes();

-- Consulta un código de invitación (para la pantalla de registro)
CREATE OR REPLACE FUNCTION public.lookup_invite(p_code TEXT)
RETURNS TABLE (role TEXT, company_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ci.role, ci.company_name FROM company_invites ci WHERE ci.code = UPPER(TRIM(p_code)) LIMIT 1;
$$;

-- Completa el perfil al crear la cuenta. El rol sale de la invitación, nunca del navegador.
CREATE OR REPLACE FUNCTION public.complete_signup(p_full_name TEXT, p_code TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  existing profiles%ROWTYPE;
  inv company_invites%ROWTYPE;
  new_role TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No hay sesión activa.'; END IF;
  IF COALESCE(TRIM(p_full_name), '') = '' THEN RAISE EXCEPTION 'El nombre es obligatorio.'; END IF;
  PERFORM set_config('bitacora.trusted', 'on', true);

  SELECT * INTO existing FROM profiles WHERE id = uid;

  IF COALESCE(TRIM(p_code), '') <> '' THEN
    SELECT * INTO inv FROM company_invites WHERE code = UPPER(TRIM(p_code));
    IF NOT FOUND THEN RAISE EXCEPTION 'El código de invitación no es válido.'; END IF;

    -- Solo se une a un equipo quien aún no pertenece a otro (o ya es de este mismo)
    IF existing.id IS NULL OR existing.invited_by IS NULL OR existing.invited_by = inv.created_by THEN
      new_role := CASE WHEN inv.role IN ('admin') THEN 'residente' ELSE inv.role END;
      INSERT INTO profiles (id, full_name, role, invited_by, company_name)
      VALUES (uid, TRIM(p_full_name), new_role, inv.created_by, inv.company_name)
      ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name, role = EXCLUDED.role,
            invited_by = EXCLUDED.invited_by, company_name = EXCLUDED.company_name;
      IF existing.id IS NULL OR existing.invited_by IS NULL THEN
        UPDATE company_invites SET used_count = COALESCE(used_count, 0) + 1 WHERE id = inv.id;
      END IF;
      RETURN new_role;
    END IF;
  END IF;

  IF existing.id IS NULL THEN
    -- Cuenta nueva sin invitación: director de su propia constructora
    INSERT INTO profiles (id, full_name, role) VALUES (uid, TRIM(p_full_name), 'admin');
    RETURN 'admin';
  END IF;

  -- Perfil existente: conserva su rol y equipo
  UPDATE profiles SET full_name = TRIM(p_full_name) WHERE id = uid;
  RETURN existing.role;
END $$;

-- El director edita nombre y rol de alguien de su equipo
CREATE OR REPLACE FUNCTION public.update_team_member(p_member UUID, p_full_name TEXT, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_director() THEN
    RAISE EXCEPTION 'Solo el director de obra puede editar la información del equipo.';
  END IF;
  IF p_role NOT IN ('director', 'residente', 'administracion', 'subcontratista', 'operador') THEN
    RAISE EXCEPTION 'Rol no válido.';
  END IF;
  IF COALESCE(TRIM(p_full_name), '') = '' THEN RAISE EXCEPTION 'El nombre es obligatorio.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_member AND invited_by = auth.uid()) THEN
    RAISE EXCEPTION 'Ese usuario no pertenece a tu equipo.';
  END IF;
  PERFORM set_config('bitacora.trusted', 'on', true);
  UPDATE profiles SET full_name = TRIM(p_full_name), role = p_role WHERE id = p_member;
END $$;

REVOKE ALL ON FUNCTION public.complete_signup(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_team_member(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_invite(TEXT) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.complete_signup(TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.update_team_member(UUID, TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.lookup_invite(TEXT) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT EXECUTE ON FUNCTION public.lookup_invite(TEXT) TO anon;
  END IF;
END $$;

-- ============================================================
-- 3. Se borran TODAS las políticas anteriores de las tablas de la app
--    (algunas daban acceso global al rol admin) y se crean las nuevas.
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'profiles', 'projects', 'project_members', 'project_areas', 'daily_reports', 'report_photos',
      'daily_report_revisions', 'expenses', 'incomes', 'tasks', 'materials', 'material_movements',
      'special_requests', 'special_request_events', 'company_invites', 'notifications'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Perfiles: el propio y los de su constructora
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perfiles: ver los de mi constructora" ON profiles FOR SELECT
  USING (id = auth.uid() OR COALESCE(invited_by, id) = public.my_company());
CREATE POLICY "Perfiles: crear el propio" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Perfiles: editar el propio" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Obras
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Obras: ver" ON projects FOR SELECT USING (public.can_access_project(id));
CREATE POLICY "Obras: crear (director)" ON projects FOR INSERT WITH CHECK (public.is_director() AND created_by = auth.uid());
CREATE POLICY "Obras: editar (director)" ON projects FOR UPDATE USING (public.is_project_director(id));
CREATE POLICY "Obras: borrar (director)" ON projects FOR DELETE USING (public.is_project_director(id));

-- Asignación de obras al equipo
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Asignaciones: ver" ON project_members FOR SELECT USING (user_id = auth.uid() OR public.can_access_project(project_id));
CREATE POLICY "Asignaciones: crear (director)" ON project_members FOR INSERT
  WITH CHECK (public.is_project_director(project_id) AND public.same_company(user_id));
CREATE POLICY "Asignaciones: borrar (director)" ON project_members FOR DELETE USING (public.is_project_director(project_id));

-- Áreas o frentes
ALTER TABLE project_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Áreas: ver" ON project_areas FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "Áreas: crear (director)" ON project_areas FOR INSERT WITH CHECK (public.is_project_director(project_id));
CREATE POLICY "Áreas: editar (director)" ON project_areas FOR UPDATE USING (public.is_project_director(project_id));
CREATE POLICY "Áreas: borrar (director)" ON project_areas FOR DELETE USING (public.is_project_director(project_id));

-- Bitácoras (no se borran: trazabilidad)
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bitácoras: ver" ON daily_reports FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "Bitácoras: crear" ON daily_reports FOR INSERT WITH CHECK (public.can_access_project(project_id));
CREATE POLICY "Bitácoras: validar o firmar" ON daily_reports FOR UPDATE
  USING (public.can_access_project(project_id) AND (public.is_director() OR public.my_role() = 'residente'))
  WITH CHECK (public.can_access_project(project_id));

ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fotos: ver" ON report_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = report_photos.daily_report_id AND public.can_access_project(dr.project_id)));
CREATE POLICY "Fotos: agregar" ON report_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = report_photos.daily_report_id AND public.can_access_project(dr.project_id)));

ALTER TABLE daily_report_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Versiones: ver" ON daily_report_revisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_revisions.daily_report_id AND public.can_access_project(dr.project_id)));

-- Dinero: gastos los registra el equipo; ingresos solo el director
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gastos: ver" ON expenses FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "Gastos: registrar" ON expenses FOR INSERT WITH CHECK (public.can_access_project(project_id));

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ingresos: ver (director)" ON incomes FOR SELECT USING (public.is_project_director(project_id));
CREATE POLICY "Ingresos: registrar (director)" ON incomes FOR INSERT WITH CHECK (public.is_project_director(project_id));

-- Cronograma
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Actividades: ver" ON tasks FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "Actividades: crear" ON tasks FOR INSERT WITH CHECK (public.can_access_project(project_id) AND public.is_planner());
CREATE POLICY "Actividades: actualizar" ON tasks FOR UPDATE
  USING (public.can_access_project(project_id) AND (public.is_planner() OR assigned_to = auth.uid()))
  WITH CHECK (public.can_access_project(project_id));
CREATE POLICY "Actividades: borrar" ON tasks FOR DELETE USING (public.can_access_project(project_id) AND public.is_planner());

-- Materiales
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materiales: ver" ON materials FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "Materiales: crear" ON materials FOR INSERT
  WITH CHECK (public.can_access_project(project_id) AND (public.is_director() OR public.my_role() = 'residente'));
-- Las existencias las actualiza record_material_movement con la sesión de quien registra
CREATE POLICY "Materiales: actualizar existencias" ON materials FOR UPDATE USING (public.can_access_project(project_id));
CREATE POLICY "Materiales: borrar" ON materials FOR DELETE
  USING (public.can_access_project(project_id) AND (public.is_director() OR public.my_role() = 'residente'));

ALTER TABLE material_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Movimientos: ver" ON material_movements FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "Movimientos: registrar" ON material_movements FOR INSERT WITH CHECK (public.can_access_project(project_id));

-- Solicitudes
ALTER TABLE special_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solicitudes: ver" ON special_requests FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "Solicitudes: crear" ON special_requests FOR INSERT WITH CHECK (public.can_access_project(project_id));
CREATE POLICY "Solicitudes: seguimiento" ON special_requests FOR UPDATE USING (public.can_access_project(project_id));

ALTER TABLE special_request_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seguimiento: ver" ON special_request_events FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "Seguimiento: registrar" ON special_request_events FOR INSERT
  WITH CHECK (public.can_access_project(project_id) AND actor = auth.uid());

-- Invitaciones: solo las del director que las creó (el registro usa lookup_invite)
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invitaciones: las mías" ON company_invites FOR ALL
  USING (created_by = auth.uid() AND public.is_director())
  WITH CHECK (created_by = auth.uid() AND public.is_director());

-- Notificaciones: cada quien las suyas (si la tabla existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id') THEN
    EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "Notificaciones: las mías" ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;
