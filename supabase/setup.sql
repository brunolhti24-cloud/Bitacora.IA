-- 1. profiles (Extensión de auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'resident')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT,
  location TEXT,
  base_budget NUMERIC DEFAULT 0,
  start_date DATE,
  physical_progress NUMERIC DEFAULT 0 CHECK (physical_progress >= 0 AND physical_progress <= 100),
  image_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. project_members (Asignación de residentes a proyectos)
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('resident', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE project_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. daily_reports (Bitácoras)
CREATE TABLE daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  area_id UUID REFERENCES project_areas(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT NOT NULL,
  workers_count INTEGER DEFAULT 0,
  progress_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. report_photos
CREATE TABLE report_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. expenses (Tickets / Gastos)
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  concept TEXT NOT NULL,
  receipt_url TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. incomes (Ingresos, solo admin)
CREATE TABLE incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  concept TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. tasks (Kanban)
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En Proceso', 'Terminada')),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas RLS Básicas (Habilitación)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_areas ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para projects
CREATE POLICY "Admins can view all projects" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Residents can view projects they belong to" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
);
CREATE POLICY "Only admins can insert projects" ON projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can update projects" ON projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para project_members
CREATE POLICY "Members viewable by project members" ON project_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para incomes (Solo Admin)
CREATE POLICY "Only admins can view incomes" ON incomes FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can insert incomes" ON incomes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para daily_reports
CREATE POLICY "Reports viewable by project members" ON daily_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = daily_reports.project_id AND pm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Project members can insert reports" ON daily_reports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = daily_reports.project_id AND pm.user_id = auth.uid())
);

-- Políticas similares para report_photos, expenses, tasks
-- (Simplificado para permitir select/insert a miembros del proyecto)

CREATE POLICY "Photos viewable by project members" ON report_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM daily_reports dr 
    JOIN project_members pm ON pm.project_id = dr.project_id 
    WHERE dr.id = report_photos.daily_report_id AND pm.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Project members can insert expenses" ON expenses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = expenses.project_id AND pm.user_id = auth.uid())
);
CREATE POLICY "Expenses viewable by project members" ON expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = expenses.project_id AND pm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Tasks viewable and editable by project members" ON tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Areas viewable and editable by project members" ON project_areas FOR ALL USING (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_areas.project_id AND pm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
