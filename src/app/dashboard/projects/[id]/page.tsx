import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NewAreaForm } from '@/components/new-area-form'
import { FinanceTab } from './finance-tab'
import { CronogramaTab } from './cronograma-tab'
import { MaterialsTab } from './materials-tab'
import { NewSpecialRequestModal } from '@/components/new-special-request-modal'
import { UpdateProgressModal } from '@/components/update-progress-modal'
import { SpecialRequestsList, SpecialRequest } from '@/components/special-requests-list'
import { ExportProjectPdfButton } from '@/components/export-project-pdf-button'
import { DeleteAreaButton } from '@/components/delete-area-button'
import { Folder, ArrowRight, MapPin, ArrowLeft, ClipboardList, CalendarX2, FileSignature } from 'lucide-react'
import { formatDateTime, todayInObra } from '@/lib/dates'

function getAreaImage(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('baño') || lower.includes('bano')) return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=600&auto=format&fit=crop'
  if (lower.includes('recámara') || lower.includes('recamara') || lower.includes('habitación') || lower.includes('cuarto')) return 'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=600&auto=format&fit=crop'
  if (lower.includes('cocina')) return 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=600&auto=format&fit=crop'
  if (lower.includes('sala') || lower.includes('estancia')) return 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=600&auto=format&fit=crop'
  if (lower.includes('comedor')) return 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=600&auto=format&fit=crop'
  if (lower.includes('cochera') || lower.includes('estacionamiento') || lower.includes('garage')) return 'https://images.unsplash.com/photo-1605810757271-9f939eec4d54?q=80&w=600&auto=format&fit=crop'
  if (lower.includes('jardín') || lower.includes('jardin') || lower.includes('patio') || lower.includes('terraza')) return 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=600&auto=format&fit=crop'
  if (lower.includes('cimentación') || lower.includes('losa') || lower.includes('estructura')) return 'https://images.unsplash.com/photo-1541888087625-f814d1f2e153?q=80&w=600&auto=format&fit=crop'
  if (lower.includes('fachada') || lower.includes('muro')) return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=600&auto=format&fit=crop'
  return 'https://images.unsplash.com/photo-1504307651254-35680f356f58?q=80&w=600&auto=format&fit=crop'
}

const TABS = ['areas', 'materials', 'cronograma', 'finances', 'solicitudes']

export default async function ProjectDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const resolvedParams = await params
  // Pestaña inicial desde la URL (ej. ?tab=cronograma al venir de "Requiere atención")
  const { tab } = await searchParams
  const supabase = await createClient()

  // Obtener detalles del proyecto
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', resolvedParams.id)
    .maybeSingle()

  if (!project) {
    return <div>Proyecto no encontrado</div>
  }

  // Obtener las áreas del proyecto
  const { data: areas } = await supabase
    .from('project_areas')
    .select('*, daily_reports(count)')
    .eq('project_id', resolvedParams.id)
    .order('created_at', { ascending: true })

  // Obtener rol del usuario
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  let isOperador = false
  let role = 'operador'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    role = profile?.role || 'admin'
    isAdmin = role === 'admin' || role === 'director'
    isOperador = role === 'operador'
  }

  // Obtener solicitudes especiales del proyecto
  const requestsQuery = (fields: string) =>
    supabase.from('special_requests').select(fields).eq('project_id', resolvedParams.id).order('created_at', { ascending: false })

  // Si la migración de trazabilidad aún no se aplica, se cargan sin el historial de etapas
  const withEvents = await requestsQuery(
    '*, projects ( name ), profiles:requested_by ( full_name, role ), events:special_request_events ( stage, note, created_at, actor:profiles!special_request_events_actor_fkey ( full_name ) )'
  )
  const rawRequests = withEvents.error
    ? (await requestsQuery('*, projects ( name ), profiles:requested_by ( full_name, role )')).data
    : withEvents.data

  const specialRequests: SpecialRequest[] = ((rawRequests || []) as unknown as Record<string, any>[]).map((req: any) => ({
    id: req.id,
    project_id: req.project_id,
    category: req.category,
    title: req.title,
    description: req.description,
    quantity: req.quantity,
    unit: req.unit,
    urgency: req.urgency,
    status: req.status,
    director_comment: req.director_comment,
    created_at: req.created_at,
    needed_by: req.needed_by,
    stage: req.stage,
    events: (req.events || []).sort((x: any, y: any) => x.created_at.localeCompare(y.created_at)),
    projects: req.projects ? { name: req.projects.name } : undefined,
    profiles: req.profiles ? { full_name: req.profiles.full_name, role: req.profiles.role } : undefined
  }))

  // Avance físico reportado: quién y cuándo
  const progress = Number(project.physical_progress) || 0
  const progressUpdatedAt: string | null = project.progress_updated_at || null
  let progressUpdatedBy: string | null = null
  if (project.progress_updated_by) {
    const { data: updater } = await supabase.from('profiles').select('full_name').eq('id', project.progress_updated_by).maybeSingle()
    progressUpdatedBy = updater?.full_name || null
  }
  const canEditProgress = isAdmin || role === 'residente'

  // Pendientes de la obra
  const today = todayInObra()
  const [{ count: overdueCount }, { count: unsignedCount }] = await Promise.all([
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('project_id', resolvedParams.id).neq('status', 'Terminada').lt('due_date', today),
    supabase.from('daily_reports').select('id', { count: 'exact', head: true }).eq('project_id', resolvedParams.id).neq('status', 'firmada'),
  ])
  const pendingRequestsCount = specialRequests.filter((r) => r.status === 'pendiente').length
  const attention = [
    { label: 'Solicitudes pendientes', count: pendingRequestsCount, hint: 'Esperan respuesta del director', empty: 'Sin solicitudes por responder', icon: ClipboardList, tone: 'border-amber-300 bg-amber-50/60', iconTone: 'text-amber-600', href: '?tab=solicitudes' },
    { label: 'Actividades vencidas', count: overdueCount ?? 0, hint: 'Pasó su fecha de término', empty: 'Ninguna actividad vencida', icon: CalendarX2, tone: 'border-red-300 bg-red-50/60', iconTone: 'text-red-600', href: '?tab=cronograma' },
    { label: 'Bitácoras por firmar', count: unsignedCount ?? 0, hint: 'Les falta alguna firma', empty: 'Todas con firmas completas', icon: FileSignature, tone: 'border-blue-300 bg-blue-50/60', iconTone: 'text-[#144CC9]', href: `/dashboard/pendientes?tipo=firmas&obra=${resolvedParams.id}` },
  ]

  const totalReportsCount = areas?.reduce((acc, a) => acc + (a.daily_reports[0]?.count || 0), 0) || 0

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* High-Tech Header Banner del Proyecto */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Proyectos
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 font-bold text-[11px] border border-slate-400 shadow-sm">
                Obra Activa
              </span>
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 font-bold text-[11px] border border-slate-400 shadow-sm">
                {areas?.length || 0} Áreas Registradas
              </span>
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 font-bold text-[11px] border border-slate-400 shadow-sm">
                {totalReportsCount} Bitácoras en total
              </span>
            </div>

            <h1 className="text-3xl font-black text-[#031033] tracking-tight">{project.name}</h1>

            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#144CC9]" />
              <span>{project.location || 'Ubicación no especificada'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportProjectPdfButton project={project} />
          </div>
        </div>
      </div>

      {/* Lo que requiere atención: solicitudes, actividades vencidas y bitácoras por firmar */}
      <section aria-labelledby="atencion-titulo" className="space-y-3">
        <h2 id="atencion-titulo" className="text-sm font-bold uppercase tracking-wider text-slate-500">Requiere atención</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {attention.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#144CC9] ${item.count > 0 ? item.tone : 'border-slate-200'}`}
            >
              <item.icon className={`mt-0.5 h-5 w-5 shrink-0 ${item.count > 0 ? item.iconTone : 'text-slate-400'}`} aria-hidden />
              <div className="min-w-0">
                <p className={`text-2xl font-black leading-none ${item.count > 0 ? 'text-[#031033]' : 'text-slate-400'}`}>{item.count}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{item.count > 0 ? item.hint : item.empty}</p>
                {item.count > 0 && <p className="mt-1 text-xs font-semibold text-[#144CC9] group-hover:underline">Ver cuáles</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Avance físico reportado: se captura a mano, no es un cálculo automático */}
      <section aria-labelledby="avance-titulo" className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="avance-titulo" className="text-sm font-bold text-slate-800">Avance físico reportado</h2>
            <span className="text-lg font-black text-[#031033]">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-labelledby="avance-titulo">
            <div className="h-full rounded-full bg-[#144CC9]" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-slate-500">
            Captura manual.{' '}
            {progressUpdatedAt
              ? <>Actualizado por <strong className="font-semibold text-slate-700">{progressUpdatedBy || 'usuario sin nombre'}</strong> el {formatDateTime(progressUpdatedAt)}.</>
              : 'Sin registro de quién lo actualizó.'}
          </p>
        </div>
        {canEditProgress && (
          <div className="flex shrink-0">
            <UpdateProgressModal projectId={project.id} currentProgress={progress} />
          </div>
        )}
      </section>

      {/* Tabs Navigation */}
      <Tabs key={tab || 'areas'} defaultValue={tab && TABS.includes(tab) && !(tab === 'finances' && isOperador) ? tab : 'areas'} className="w-full">
        <TabsList className={`w-full flex md:grid ${(!isOperador) ? 'md:grid-cols-5' : 'md:grid-cols-4'} p-1.5 bg-slate-100 border border-slate-200 rounded-3xl md:rounded-full mb-8 h-auto md:h-12 overflow-x-auto justify-start`}>
          <TabsTrigger
            value="areas"
            className="rounded-full font-semibold text-sm text-slate-600 hover:text-[#031033] data-active:bg-white data-active:text-[#031033] data-active:shadow-md transition-all h-full"
          >
            Áreas ({areas?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className="rounded-full font-semibold text-sm text-slate-600 hover:text-[#031033] data-active:bg-white data-active:text-[#031033] data-active:shadow-md transition-all h-full"
          >
            Materiales
          </TabsTrigger>
          <TabsTrigger
            value="cronograma"
            className="rounded-full font-semibold text-sm text-slate-600 hover:text-[#031033] data-active:bg-white data-active:text-[#031033] data-active:shadow-md transition-all h-full"
          >
            Cronograma
          </TabsTrigger>
          {!isOperador && (
            <TabsTrigger
              value="finances"
              className="rounded-full font-semibold text-sm text-slate-600 hover:text-[#031033] data-active:bg-white data-active:text-[#031033] data-active:shadow-md transition-all h-full"
            >
              {isAdmin ? 'Finanzas' : 'Gastos'}
            </TabsTrigger>
          )}
          <TabsTrigger
            value="solicitudes"
            className="rounded-full font-semibold text-sm text-slate-600 hover:text-[#031033] data-active:bg-white data-active:text-[#031033] data-active:shadow-md transition-all h-full"
          >
            Solicitudes
            {pendingRequestsCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white" aria-label={`${pendingRequestsCount} pendientes`}>
                {pendingRequestsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#031033] flex items-center gap-2">
                <Folder className="w-6 h-6 text-[#144CC9]" />
                Áreas y frentes de trabajo
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Haz clic en cualquier área para revisar bitácoras diarias o crear reportes instantáneos.
              </p>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {areas?.map((area) => {
              const count = area.daily_reports[0]?.count || 0

              return (
                <Card
                  key={area.id}
                  className="h-full border border-slate-200 rounded-[1.5rem] bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden"
                >
                  {/* Imagen Header */}
                  <div className="relative h-36 w-full overflow-hidden bg-slate-100 shrink-0">
                    <img 
                      src={getAreaImage(area.name)} 
                      alt={area.name} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    
                    {/* Botones Flotantes (Badges y Delete) sobre la imagen */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {count > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/40 flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#A7EC80]"></span>
                          {count} {count === 1 ? 'bitácora' : 'bitácoras'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20 flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          0 bitácoras
                        </span>
                      )}
                      {isAdmin && <DeleteAreaButton areaId={area.id} areaName={area.name} />}
                    </div>

                    <div className="absolute bottom-3 left-4">
                      <h3 className="font-extrabold text-xl text-white drop-shadow-md">
                        {area.name}
                      </h3>
                      <p className="text-xs text-slate-200 font-medium mt-0.5">Frente de Trabajo</p>
                    </div>
                  </div>
                  
                  {/* Body del Card */}
                  <div className="p-4 pt-5 flex items-center justify-between gap-2 mt-auto">
                    <Link
                      href={`/dashboard/projects/${project.id}/areas/${area.id}/bitacoras/new`}
                      className="px-3 py-1.5 rounded-full bg-[#144CC9] hover:bg-blue-600 text-white font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                    >
                      + Bitácora
                    </Link>

                    <Link
                      href={`/dashboard/projects/${project.id}/areas/${area.id}`}
                      className="text-xs font-bold text-[#144CC9] hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                      <span>Ver historial</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>

          {isAdmin && (
            <Card className="p-6 bg-white/70 backdrop-blur-md border-2 border-dashed border-slate-300 rounded-3xl hover:border-blue-400 transition-colors">
              <NewAreaForm projectId={project.id} />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="cronograma">
          <CronogramaTab projectId={project.id} />
        </TabsContent>

        {!isOperador && (
          <TabsContent value="finances">
            <FinanceTab projectId={project.id} baseBudget={project.base_budget} isAdmin={isAdmin} />
          </TabsContent>
        )}

        <TabsContent value="solicitudes" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Solicitudes de la obra</h2>
            <NewSpecialRequestModal defaultProjectId={project.id} />
          </div>
          <SpecialRequestsList requests={specialRequests} isAdmin={isAdmin} userRole={role} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

