import { createClient } from '@/lib/supabase/server'
import { ProgressTape } from '@/components/progress-tape'
import { ProjectActions } from '@/components/project-actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, MapPin, PlusCircle, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, invited_by')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'
  const isSubcontratista = profile?.role === 'subcontratista'

  if (isSubcontratista) {
    redirect('/dashboard/mis-tareas')
  }

  let projectsQuery = supabase.from('projects').select('*')

  if (isAdmin) {
    projectsQuery = projectsQuery.eq('created_by', user.id)
  } else if (profile?.invited_by) {
    projectsQuery = projectsQuery.eq('created_by', profile.invited_by)
  } else {
    const { data: mainAdmin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()

    if (mainAdmin) {
      projectsQuery = projectsQuery.eq('created_by', mainAdmin.id)
    }
  }

  const { data: projects, error } = await projectsQuery.order('created_at', { ascending: false })

  const totalProjects = (projects || []).length
  const avgProgress = totalProjects > 0
    ? Math.round((projects || []).reduce((acc, p) => acc + (p.physical_progress || 0), 0) / totalProjects)
    : 0

  const list = projects || []
  const inProgress = list.filter((p) => (p.physical_progress || 0) < 100).length

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-plano sm:text-4xl">Obras</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Avance físico, bitácoras, gastos y materiales de cada obra.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          {totalProjects > 0 && (
            <dl className="flex gap-6">
              <div>
                <dt className="text-xs text-muted-foreground">Obras</dt>
                <dd className="text-2xl font-bold text-plano">{totalProjects}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">En ejecución</dt>
                <dd className="text-2xl font-bold text-plano">{inProgress}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Avance promedio</dt>
                <dd className="text-2xl font-bold text-obra">{avgProgress}%</dd>
              </div>
            </dl>
          )}
          {isAdmin && (
            <Link
              href="/dashboard/projects/new"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-obra px-5 text-sm font-semibold text-white transition-colors hover:bg-obra-strong sm:w-auto"
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              Nueva obra
            </Link>
          )}
        </div>
      </header>

      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>No se pudieron cargar las obras: {error.message}. Recarga la página para intentarlo de nuevo.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border-2 border-dashed border-junta bg-card p-8 sm:p-12">
          <Building2 className="h-10 w-10 text-obra" aria-hidden />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-plano">Todavía no hay obras</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {isAdmin
                ? 'Crea tu primera obra para llevar sus áreas, bitácoras y gastos en un solo lugar.'
                : 'Aún no tienes obras asignadas. Pide al director de obra que te agregue a una.'}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/dashboard/projects/new"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-obra px-5 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
            >
              <PlusCircle className="h-4 w-4" aria-hidden /> Crear primera obra
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((project) => {
            const progress = project.physical_progress || 0
            return (
              <li
                key={project.id}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors duration-200 hover:border-obra/60"
              >
                <div className="relative h-40 shrink-0 overflow-hidden bg-plano">
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="plano-grid flex h-full w-full items-center justify-center">
                      <Building2 className="h-10 w-10 text-brote/70" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-4 p-4">
                  <div className="min-w-0 space-y-1">
                    <h2 className="truncate text-lg font-bold text-plano">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="after:absolute after:inset-0 after:content-['']"
                      >
                        {project.name}
                      </Link>
                    </h2>
                    <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{project.location || 'Sin ubicación'}</span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Avance físico</span>
                      <span className="font-bold text-plano">{progress}%</span>
                    </div>
                    <ProgressTape value={progress} label={`Avance físico de ${project.name}`} />
                  </div>

                  {isAdmin && (
                    <div className="relative z-10 mt-auto flex justify-end border-t border-border pt-3">
                      <ProjectActions projectId={project.id} />
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
