import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NewAreaForm } from '@/components/new-area-form'
import { FinanceTab } from './finance-tab'
import { KanbanTab } from './kanban-tab'
import { MaterialsTab } from './materials-tab'
import { NewSpecialRequestModal } from '@/components/new-special-request-modal'
import { UpdateProgressModal } from '@/components/update-progress-modal'
import { SpecialRequestsList, SpecialRequest } from '@/components/special-requests-list'
import { ExportProjectPdfButton } from '@/components/export-project-pdf-button'
import { DeleteAreaButton } from '@/components/delete-area-button'
import { ProgressTape } from '@/components/progress-tape'
import { MapPin, PlusCircle, ArrowLeft } from 'lucide-react'

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

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
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
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const role = profile?.role || 'admin'
    isAdmin = role === 'admin' || role === 'director'
    isOperador = role === 'operador'
  }

  // Obtener solicitudes especiales del proyecto
  const { data: rawRequests } = await supabase
    .from('special_requests')
    .select(`
      *,
      projects ( name ),
      profiles:requested_by ( full_name, role )
    `)
    .eq('project_id', resolvedParams.id)
    .order('created_at', { ascending: false })

  const specialRequests: SpecialRequest[] = (rawRequests || []).map((req: any) => ({
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
    projects: req.projects ? { name: req.projects.name } : undefined,
    profiles: req.profiles ? { full_name: req.profiles.full_name, role: req.profiles.role } : undefined
  }))

  // Obtener reportes diarios recientes para el PDF del proyecto
  const { data: rawReports } = await supabase
    .from('daily_reports')
    .select('id, report_date, progress_notes, created_by_name, project_areas(name)')
    .eq('project_id', resolvedParams.id)
    .order('report_date', { ascending: false })
    .limit(15)

  const recentReports = (rawReports || []).map((rep: any) => ({
    id: rep.id,
    report_date: rep.report_date,
    progress_notes: rep.progress_notes,
    created_by_name: rep.created_by_name,
    area_name: rep.project_areas?.name || 'General'
  }))

  // Obtener suma de gastos del proyecto
  const { data: projectExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('project_id', resolvedParams.id)

  const totalExpenses = (projectExpenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  const totalReportsCount = areas?.reduce((acc, a) => acc + (a.daily_reports[0]?.count || 0), 0) || 0

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-obra transition-colors hover:text-obra-strong"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Obras
        </Link>

        <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-3xl font-extrabold text-plano sm:text-4xl">{project.name}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {project.location || 'Sin ubicación'}
              </span>
              <span>{areas?.length || 0} {areas?.length === 1 ? 'área' : 'áreas'}</span>
              <span>{totalReportsCount} {totalReportsCount === 1 ? 'bitácora' : 'bitácoras'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportProjectPdfButton 
              project={project} 
              areasCount={areas?.length || 0} 
              recentReports={recentReports} 
              totalExpenses={totalExpenses} 
            />
          </div>
        </div>
      </div>

      {/* Avance físico global */}
      <section className="plano-grid flex flex-col gap-5 rounded-lg p-5 text-white sm:p-6 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-5">
          <p className="shrink-0 text-5xl font-extrabold leading-none text-brote [font-stretch:75%]">
            {project.physical_progress || 0}<span className="text-2xl">%</span>
          </p>
          <div className="flex-1 space-y-2">
            <h2 className="text-sm font-semibold text-white/80">Avance físico de la obra</h2>
            <ProgressTape
              value={project.physical_progress || 0}
              label="Avance físico de la obra"
              className="cinta-plano"
            />
          </div>
        </div>

        <div className="flex shrink-0">
          <UpdateProgressModal projectId={project.id} currentProgress={project.physical_progress || 0} />
        </div>
      </section>

      {/* Pestañas de la obra: subrayado, con scroll horizontal en celular */}
      <Tabs defaultValue="areas" className="w-full min-w-0 gap-6">
        <div className="-mx-3 min-w-0 overflow-x-auto border-b border-border px-3 sm:mx-0 sm:px-0">
          <TabsList variant="line" className="h-auto! gap-0 p-0">
            <TabsTrigger value="areas" className="h-11 flex-none rounded-none px-3 text-sm font-semibold text-muted-foreground hover:text-plano data-active:text-plano group-data-horizontal/tabs:after:bottom-0 after:h-[3px]! after:bg-obra! sm:px-4">
              Áreas <span className="ml-1 text-muted-foreground">{areas?.length || 0}</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="h-11 flex-none rounded-none px-3 text-sm font-semibold text-muted-foreground hover:text-plano data-active:text-plano group-data-horizontal/tabs:after:bottom-0 after:h-[3px]! after:bg-obra! sm:px-4">Materiales</TabsTrigger>
            <TabsTrigger value="kanban" className="h-11 flex-none rounded-none px-3 text-sm font-semibold text-muted-foreground hover:text-plano data-active:text-plano group-data-horizontal/tabs:after:bottom-0 after:h-[3px]! after:bg-obra! sm:px-4">Tareas</TabsTrigger>
            {!isOperador && (
              <TabsTrigger value="finances" className="h-11 flex-none rounded-none px-3 text-sm font-semibold text-muted-foreground hover:text-plano data-active:text-plano group-data-horizontal/tabs:after:bottom-0 after:h-[3px]! after:bg-obra! sm:px-4">{isAdmin ? 'Finanzas' : 'Gastos'}</TabsTrigger>
            )}
            <TabsTrigger value="solicitudes" className="h-11 flex-none rounded-none px-3 text-sm font-semibold text-muted-foreground hover:text-plano data-active:text-plano group-data-horizontal/tabs:after:bottom-0 after:h-[3px]! after:bg-obra! sm:px-4">Solicitudes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="areas" className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-plano">Áreas y frentes de trabajo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entra a un área para ver su historial de bitácoras o registrar una nueva.
            </p>
          </div>

          {(areas?.length || 0) > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {areas?.map((area) => {
                const count = area.daily_reports[0]?.count || 0

                return (
                  <li
                    key={area.id}
                    className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors duration-200 hover:border-obra/60"
                  >
                    <div className="relative h-32 w-full shrink-0 overflow-hidden bg-plano">
                      <img src={getAreaImage(area.name)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {isAdmin && (
                        <div className="absolute right-2 top-2 z-10">
                          <DeleteAreaButton areaId={area.id} areaName={area.name} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-plano">
                          <Link
                            href={`/dashboard/projects/${project.id}/areas/${area.id}`}
                            className="after:absolute after:inset-0 after:content-['']"
                          >
                            {area.name}
                          </Link>
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {count === 0 ? 'Sin bitácoras todavía' : `${count} ${count === 1 ? 'bitácora' : 'bitácoras'}`}
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/projects/${project.id}/areas/${area.id}/bitacoras/new`}
                        className="relative z-10 mt-auto inline-flex h-10 w-fit items-center gap-1.5 rounded-md bg-obra px-3.5 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                      >
                        <PlusCircle className="h-4 w-4" aria-hidden />
                        Nueva bitácora
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {(areas?.length || 0) === 0 && !isAdmin && (
            <p className="rounded-lg border-2 border-dashed border-junta bg-card p-6 text-sm text-muted-foreground">
              Esta obra todavía no tiene áreas. El director de obra puede crearlas.
            </p>
          )}

          {isAdmin && (
            <div className="rounded-lg border-2 border-dashed border-junta bg-card p-5 transition-colors hover:border-obra/50">
              <NewAreaForm projectId={project.id} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanTab projectId={project.id} />
        </TabsContent>

        {!isOperador && (
          <TabsContent value="finances">
            <FinanceTab projectId={project.id} baseBudget={project.base_budget} isAdmin={isAdmin} />
          </TabsContent>
        )}

        <TabsContent value="solicitudes" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-plano">Solicitudes de la obra</h2>
            <NewSpecialRequestModal defaultProjectId={project.id} />
          </div>
          <SpecialRequestsList requests={specialRequests} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

