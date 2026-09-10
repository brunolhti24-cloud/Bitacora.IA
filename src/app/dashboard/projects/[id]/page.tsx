import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Folder, HardHat, ArrowRight, Building2, MapPin, Layers, FileText, PlusCircle, ArrowLeft, Activity, Boxes, ClipboardList, Wallet } from 'lucide-react'

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
    .single()

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
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
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
            <ExportProjectPdfButton 
              project={project} 
              areasCount={areas?.length || 0} 
              recentReports={recentReports} 
              totalExpenses={totalExpenses} 
            />
          </div>
        </div>
      </div>

      {/* Tarjeta de Avance Físico Global */}
      <div className="p-5 sm:p-6 bg-[#031033] text-white rounded-[2rem] shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-6 flex-1">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-[#144CC9] text-white font-black text-2xl shrink-0 shadow-lg">
            {project.physical_progress}%
          </div>

          <div className="space-y-3 flex-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold uppercase tracking-widest text-white">
                Avance Global de la Obra
              </span>
            </div>

            <div className="h-4 w-full bg-slate-100/20 rounded-full overflow-hidden p-0">
              <div
                className="h-full bg-gradient-to-r from-teal-300 to-[#A7EC80] rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${project.physical_progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-0 flex shrink-0">
          <UpdateProgressModal projectId={project.id} currentProgress={project.physical_progress || 0} />
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="areas" className="w-full">
        <TabsList className={`w-full flex md:grid ${(!isOperador) ? 'md:grid-cols-5' : 'md:grid-cols-4'} p-1.5 bg-[#A7EC80] rounded-3xl md:rounded-full mb-8 shadow-sm h-auto md:h-12 overflow-x-auto justify-start`}>
          <TabsTrigger
            value="areas"
            className="rounded-full font-semibold text-sm text-[#031033] hover:text-[#031033]/80 data-[state=active]:bg-white data-[state=active]:text-[#031033] data-[state=active]:shadow-md transition-all h-full"
          >
            Áreas ({areas?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className="rounded-full font-semibold text-sm text-[#031033] hover:text-[#031033]/80 data-[state=active]:bg-white data-[state=active]:text-[#031033] data-[state=active]:shadow-md transition-all h-full"
          >
            Materiales
          </TabsTrigger>
          <TabsTrigger
            value="kanban"
            className="rounded-full font-semibold text-sm text-[#031033] hover:text-[#031033]/80 data-[state=active]:bg-white data-[state=active]:text-[#031033] data-[state=active]:shadow-md transition-all h-full"
          >
            Kanban
          </TabsTrigger>
          {!isOperador && (
            <TabsTrigger
              value="finances"
              className="rounded-full font-semibold text-sm text-[#031033] hover:text-[#031033]/80 data-[state=active]:bg-white data-[state=active]:text-[#031033] data-[state=active]:shadow-md transition-all h-full"
            >
              {isAdmin ? 'Finanzas' : 'Gastos'}
            </TabsTrigger>
          )}
          <TabsTrigger
            value="solicitudes"
            className="rounded-full font-semibold text-sm text-[#031033] hover:text-[#031033]/80 data-[state=active]:bg-white data-[state=active]:text-[#031033] data-[state=active]:shadow-md transition-all h-full"
          >
            Solicitudes
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

        <TabsContent value="kanban">
          <KanbanTab projectId={project.id} />
        </TabsContent>

        {!isOperador && (
          <TabsContent value="finances">
            <FinanceTab projectId={project.id} baseBudget={project.base_budget} isAdmin={isAdmin} />
          </TabsContent>
        )}

        <TabsContent value="solicitudes" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Solicitudes del Proyecto</h2>
            <NewSpecialRequestModal defaultProjectId={project.id} />
          </div>
          <SpecialRequestsList requests={specialRequests} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

