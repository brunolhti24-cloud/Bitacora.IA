import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban-board'
import { getProjectMembers } from '@/app/dashboard/actions'

export async function KanbanTab({ projectId }: { projectId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userRole = 'operador'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role) userRole = profile.role
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_to:profiles(id, full_name, role)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error)
    return <p className="text-red-500">Error cargando las tareas</p>
  }

  // Operador solo ve tareas; Contratista, Residente y Director pueden crear tareas
  const canCreateTask = userRole === 'admin' || userRole === 'director' || userRole === 'residente' || userRole === 'subcontratista'

  // Obtener todos los miembros que tienen acceso a este proyecto
  const projectMembers = await getProjectMembers(projectId)

  return (
    <div className="space-y-4">
      <KanbanBoard 
        initialTasks={tasks || []} 
        projectId={projectId} 
        hideNewTask={!canCreateTask}
        projectMembers={projectMembers}
      />
    </div>
  )
}
