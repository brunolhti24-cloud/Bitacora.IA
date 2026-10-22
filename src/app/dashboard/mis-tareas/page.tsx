import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban-board'
import { redirect } from 'next/navigation'
import { CheckSquare } from 'lucide-react'

export default async function MisTareasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(name)
    `)
    .eq('assigned_to', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching mis tareas:', error)
    return <div className="text-destructive">Error cargando tus tareas.</div>
  }

  // Modificar el título de la tarea para mostrar el proyecto también
  const formattedTasks = tasks?.map(t => ({
    ...t,
    title: `[${t.project?.name}] ${t.title}`
  })) || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-plano flex items-center gap-2.5">
            <CheckSquare className="h-8 w-8 text-ok" />
            Mis tareas asignadas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arrastra las tarjetas de una columna a otra para notificar tu avance de obra en tiempo real.
          </p>
        </div>
      </div>

      <KanbanBoard initialTasks={formattedTasks} hideNewTask={true} />
    </div>
  )
}
