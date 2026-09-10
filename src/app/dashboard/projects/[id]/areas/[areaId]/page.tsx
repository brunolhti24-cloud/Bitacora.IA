import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExportBitacoraPdfButton } from '@/components/export-bitacora-pdf-button'
import { AcceptBitacoraButton } from '@/components/accept-bitacora-button'
import { SignBitacoraModal } from '@/components/sign-bitacora-modal'
import { EditAreaModal } from '@/components/edit-area-modal'
import { CheckCircle2, FileCheck2, AlertCircle, Clock } from 'lucide-react'

export default async function AreaDetailsPage({ params }: { params: Promise<{ id: string, areaId: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userRole = 'operador'
  let companyName = ''
  let companyLogoUrl: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_name, company_logo_url')
      .eq('id', user.id)
      .single()

    if (profile?.role) userRole = profile.role
    if (profile?.company_name) companyName = profile.company_name
    if (profile?.company_logo_url) companyLogoUrl = profile.company_logo_url
  }

  const isAdmin = userRole === 'admin' || userRole === 'director'
  const isResidente = userRole === 'residente'

  // Obtener detalles del área y proyecto
  const { data: area } = await supabase
    .from('project_areas')
    .select('*, projects(*, creatorProfile:profiles!projects_created_by_fkey(company_name, company_logo_url))')
    .eq('id', resolvedParams.areaId)
    .single()

  // Fallback si el usuario no tiene logo pero el creador del proyecto sí
  const projectCreator = (area?.projects as any)?.creatorProfile
  if (!companyLogoUrl && projectCreator?.company_logo_url) {
    companyLogoUrl = projectCreator.company_logo_url
  }
  if (!companyName && projectCreator?.company_name) {
    companyName = projectCreator.company_name
  }

  if (!area) {
    return <div>Área no encontrada</div>
  }

  // Obtener las bitácoras del área
  const { data: reports } = await supabase
    .from('daily_reports')
    .select('*, creator:profiles!daily_reports_created_by_fkey(full_name), acceptor:profiles!daily_reports_accepted_by_fkey(full_name)')
    .eq('area_id', resolvedParams.areaId)
    .order('report_date', { ascending: false })

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href={`/dashboard/projects/${resolvedParams.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
            &larr; Volver a {area.projects?.name}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {area.name}
            </h1>
            <EditAreaModal areaId={area.id} currentName={area.name} projectId={resolvedParams.id} />
          </div>
          <p className="text-gray-500 text-sm">Historial de Bitácoras del Área</p>
        </div>
        <Link href={`/dashboard/projects/${resolvedParams.id}/areas/${area.id}/bitacoras/new`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
            + Nueva Bitácora
          </Button>
        </Link>
      </div>

      <div>
        {reports?.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 rounded-2xl border-dashed">
            <CardDescription className="text-sm">No hay bitácoras registradas para esta área.</CardDescription>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports?.map(report => {
              const status = report.status || 'pendiente'
              const creatorName = report.creator?.full_name || 'Personal de Obra'
              const acceptorName = report.acceptor?.full_name || 'Residente'

              return (
                <Card key={report.id} className="hover:shadow-md transition-all border rounded-2xl overflow-hidden">
                  <CardHeader className="py-4 bg-slate-50/50 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold text-slate-900">
                            Reporte del {new Date(report.report_date).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </CardTitle>
                          
                          {/* Badges de Estado */}
                          {status === 'firmada' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <FileCheck2 className="w-3.5 h-3.5" /> Firmada por Director
                            </span>
                          ) : status === 'aceptada' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aceptada por {acceptorName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5" /> Pendiente de Residente
                            </span>
                          )}
                        </div>
                        
                        <CardDescription className="text-xs text-slate-500 mt-1">
                          Registrado por: <strong className="text-slate-700">{creatorName}</strong>
                        </CardDescription>
                      </div>

                      {/* Botones de Acción (Aceptar / Firmar / PDF) */}
                      <div className="flex items-center gap-2">
                        {(isResidente || isAdmin) && status === 'pendiente' && (
                          <AcceptBitacoraButton
                            reportId={report.id}
                            projectId={resolvedParams.id}
                            areaId={resolvedParams.areaId}
                          />
                        )}

                        {isAdmin && status === 'aceptada' && (
                          <SignBitacoraModal
                            reportId={report.id}
                            projectId={resolvedParams.id}
                            areaId={resolvedParams.areaId}
                          />
                        )}

                        <ExportBitacoraPdfButton
                          report={{
                            id: report.id,
                            report_date: report.report_date,
                            progress_notes: report.progress_notes,
                            created_by_name: creatorName,
                            area_name: area.name,
                            project_name: area.projects?.name,
                            signature_url: report.signature_url,
                            company_name: companyName,
                            company_logo_url: companyLogoUrl
                          }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="py-4 space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-sm text-slate-800 whitespace-pre-line">
                      <strong className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Avances y Actividades:</strong>
                      {report.progress_notes}
                    </div>

                    {/* Alerta de Solicitud Especial para Director */}
                    {report.special_request && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Solicitud Especial para el Director:</span>
                        </div>
                        <p className="text-sm font-medium pl-5 text-amber-950">
                          {report.special_request}
                        </p>
                      </div>
                    )}

                    {report.signature_url && (
                      <div className="pt-2 border-t flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Firma del Director / Responsable:</span>
                        <img
                          src={report.signature_url}
                          alt="Firma digital"
                          className="h-10 border rounded bg-white p-1 max-w-[140px] object-contain shadow-xs"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
