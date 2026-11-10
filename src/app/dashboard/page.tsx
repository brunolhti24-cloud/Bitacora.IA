import { todayInObra } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { isDirectorRole } from '@/lib/roles'
import { getVisibleProjectsQuery } from '@/lib/projects'
import { projectStatus } from '@/lib/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectActions } from '@/components/project-actions'
import { DashboardSummary } from '@/components/dashboard-summary'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, Building2, MapPin, ArrowRight, PlusCircle, Layers } from 'lucide-react'

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
  const canCreate = isDirectorRole(profile?.role)
  const isSubcontratista = profile?.role === 'subcontratista'

  if (isSubcontratista) {
    redirect('/dashboard/mis-tareas')
  }

  const { data: projects, error } = await getVisibleProjectsQuery(supabase, user.id, profile)

  // El tablero muestra las obras activas; las terminadas y archivadas viven en Archivo
  const allProjects = projects || []
  const list = allProjects.filter((p) => projectStatus(p.status) === 'activa')
  const closedCount = allProjects.length - list.length
  const totalProjects = list.length
  const inProgress = list.filter((p) => (p.physical_progress || 0) < 100).length
  const avgProgress = totalProjects > 0
    ? Math.round(list.reduce((acc, p) => acc + (p.physical_progress || 0), 0) / totalProjects)
    : 0

  // Pendientes que requieren acción del director
  const projectIds = list.map((p) => p.id)
  const today = todayInObra()
  const [{ count: unsignedReports }, { count: pendingRequests }, { count: overdueTasks }] = projectIds.length
    ? await Promise.all([
        supabase.from('daily_reports').select('id', { count: 'exact', head: true }).in('project_id', projectIds).neq('status', 'firmada'),
        supabase.from('special_requests').select('id', { count: 'exact', head: true }).in('project_id', projectIds).eq('status', 'pendiente'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', projectIds).neq('status', 'Terminada').lt('due_date', today),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }]

  // Primero lo que requiere atención; el avance queda como dato de contexto
  const metrics = [
    { label: 'Solicitudes pendientes', value: `${pendingRequests ?? 0}`, hint: (pendingRequests ?? 0) > 0 ? 'Esperan respuesta del director' : 'Sin solicitudes por responder', alert: (pendingRequests ?? 0) > 0, href: '/dashboard/pendientes?tipo=solicitudes' },
    { label: 'Actividades vencidas', value: `${overdueTasks ?? 0}`, hint: (overdueTasks ?? 0) > 0 ? 'Pasaron su fecha de término' : 'Ninguna actividad vencida', danger: (overdueTasks ?? 0) > 0, href: '/dashboard/pendientes?tipo=vencidas' },
    { label: 'Bitácoras por firmar', value: `${unsignedReports ?? 0}`, hint: (unsignedReports ?? 0) > 0 ? 'Les falta alguna firma' : 'Todas con firmas completas', alert: (unsignedReports ?? 0) > 0, href: '/dashboard/pendientes?tipo=firmas' },
    { label: 'Obras en ejecución', value: `${inProgress}`, hint: `de ${totalProjects} · avance reportado promedio ${avgProgress}%` },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <DashboardSummary metrics={metrics} canCreate={canCreate} />

      {closedCount > 0 && (
        <Link
          href="/dashboard/archivo"
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-slate-500" aria-hidden />
            {closedCount} {closedCount === 1 ? 'obra terminada o archivada' : 'obras terminadas o archivadas'}
          </span>
          <span className="flex items-center gap-1 text-[#144CC9]">Ver archivo <ArrowRight className="h-4 w-4" aria-hidden /></span>
        </Link>
      )}

      {error ? (
        <div className="rounded-2xl bg-red-50 p-6 text-red-700 border border-red-200 font-medium">
          ⚠️ Error al cargar los proyectos: {error.message}
        </div>
      ) : list.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-12 sm:p-16 text-center border-dashed border-2 border-slate-300 rounded-3xl bg-white/80 backdrop-blur-md shadow-xs">
          <CardHeader className="w-full max-w-2xl justify-items-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2 border border-blue-200">
              <Building2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">No tienes obras activas</CardTitle>
            <CardDescription className="max-w-xl text-slate-500 text-sm sm:text-base">
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
          {list.map((project) => (
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
                      <Layers className="w-4 h-4 text-blue-600" /> Avance físico reportado:
                    </span>
                    <span className="text-blue-600 font-black text-sm">{project.physical_progress || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#144CC9] rounded-full"
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


