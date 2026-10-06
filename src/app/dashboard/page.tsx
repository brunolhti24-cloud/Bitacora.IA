import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectActions } from '@/components/project-actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FolderKanban, Building2, MapPin, ArrowRight, PlusCircle, Layers, Activity, ShieldAlert, Sparkles } from 'lucide-react'

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Premium Light Glassmorphism Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md p-6 md:p-8 text-slate-800 shadow-md border border-slate-200/90">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold uppercase tracking-widest">
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Command Center de Obras
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              Obras en Ejecución
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Supervisión en tiempo real de avance físico, bitácoras firmadas, tickets financieros e inventario de materiales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 hover:scale-[1.02] transition-all transform border border-blue-500/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nuevo Proyecto / Obra</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mini Métricas del Dashboard */}
        <div className="grid grid-cols-2 gap-3 pt-6 mt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-200/60">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Proyectos</span>
            <p className="text-2xl font-black text-slate-950 mt-1">{totalProjects}</p>
          </div>
          <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-200/60">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Avance Físico Promedio</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{avgProgress}%</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-50 p-6 text-red-700 border border-red-200 font-medium">
          ⚠️ Error al cargar los proyectos: {error.message}
        </div>
      ) : projects?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed border-2 border-slate-300 rounded-3xl bg-white/80 backdrop-blur-md shadow-xs">
          <CardHeader className="space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2 border border-blue-200">
              <Building2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">No tienes obras activas</CardTitle>
            <CardDescription className="max-w-md text-slate-500 text-sm">
              {isAdmin
                ? 'Comienza creando tu primera obra para gestionar áreas, bitácoras y contabilidad en un solo lugar.'
                : 'Aún no se te ha asignado ninguna obra. Por favor contacta al administrador o director de tu constructora.'}
            </CardDescription>
          </CardHeader>
          {isAdmin && (
            <Link
              href="/dashboard/projects/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-all"
            >
              <PlusCircle className="w-4 h-4" /> Crear Mi Primer Proyecto
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Card
              key={project.id}
              className="group overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-md shadow-md hover:shadow-2xl hover:border-blue-500/60 transition-all duration-300 flex flex-col relative transform hover:-translate-y-1"
            >
              <CardHeader className="relative p-0 h-44 overflow-hidden bg-slate-900 shrink-0">
                <Link href={`/dashboard/projects/${project.id}`} className="absolute inset-0 z-0 block">
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-400">
                      <Building2 className="w-12 h-12 opacity-40 mb-2 text-blue-400" />
                      <span className="text-xs font-extrabold uppercase tracking-widest text-blue-300">OBRA Bitacor.AI</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />

                  <div className="absolute bottom-3.5 left-4 right-4 text-white">
                    <h3 className="font-extrabold text-lg truncate drop-shadow-md text-white">{project.name}</h3>
                    <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5 truncate font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{project.location || 'Ubicación no especificada'}</span>
                    </p>
                  </div>
                </Link>
              </CardHeader>

              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                      <Layers className="w-4 h-4 text-blue-600" /> Avance Físico Global:
                    </span>
                    <span className="text-blue-600 font-black text-sm">{project.physical_progress || 0}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-2xs">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-full transition-all duration-500 shadow-2xs"
                      style={{ width: `${project.physical_progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <div>
                    {isAdmin && <ProjectActions projectId={project.id} />}
                  </div>
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-extrabold text-xs transition-all shadow-2xs group/btn"
                  >
                    <span>Entrar a la Obra</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


