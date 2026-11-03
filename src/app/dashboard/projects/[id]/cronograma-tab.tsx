import { createClient } from '@/lib/supabase/server'
import { GanttSchedule, type ScheduleTask } from '@/components/gantt-schedule'
import { getProjectMembers } from '@/app/dashboard/actions'
import { isDirectorRole } from '@/lib/roles'

export async function CronogramaTab({ projectId }: { projectId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userRole = 'operador'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role) userRole = profile.role
  }

  const query = (fields: string) =>
    supabase.from('tasks').select(fields).eq('project_id', projectId).order('created_at', { ascending: true })

  // '*' incluye start_date y progress cuando ya se aplicó la migración del cronograma;
  // si falta la de trazabilidad, se cargan las actividades sin el área
  let { data: tasks, error } = await query('*, assigned_to:profiles(id, full_name, role), area:project_areas(name)')
  if (error) ({ data: tasks, error } = await query('*, assigned_to:profiles(id, full_name, role)'))

  if (error) {
    console.error('Error fetching tasks:', error)
    return <p role="alert" className="text-red-600">No se pudieron cargar las actividades del cronograma.</p>
  }

  // Programan actividades: director, residente y contratista. El operador solo ve
  // y actualiza el avance de las actividades que tiene asignadas.
  const canPlan = isDirectorRole(userRole) || userRole === 'residente' || userRole === 'subcontratista'

  const [projectMembers, { data: areas }] = await Promise.all([
    getProjectMembers(projectId),
    supabase.from('project_areas').select('id, name').eq('project_id', projectId).order('name', { ascending: true }),
  ])

  return (
    <GanttSchedule
      initialTasks={(tasks || []) as unknown as ScheduleTask[]}
      projectId={projectId}
      canPlan={canPlan}
      currentUserId={user?.id || null}
      projectMembers={projectMembers}
      areas={areas || []}
    />
  )
}
