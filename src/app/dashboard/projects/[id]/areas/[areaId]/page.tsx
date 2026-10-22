import { formatDateOnly, formatDateTime } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportBitacoraPdfButton } from '@/components/export-bitacora-pdf-button'
import { AcceptBitacoraButton } from '@/components/accept-bitacora-button'
import { SignBitacoraModal } from '@/components/sign-bitacora-modal'
import { EditAreaModal } from '@/components/edit-area-modal'
import { CheckCircle2, FileCheck2, AlertCircle, Clock, ArrowLeft, PlusCircle } from 'lucide-react'

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
    .select('*, creator:profiles!daily_reports_created_by_fkey(full_name), acceptor:profiles!daily_reports_accepted_by_fkey(full_name), signer:profiles!daily_reports_signed_by_fkey(full_name)')
    .eq('area_id', resolvedParams.areaId)
    .order('report_date', { ascending: false })

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="space-y-4">
        <Link
          href={`/dashboard/projects/${resolvedParams.id}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-obra transition-colors hover:text-obra-strong"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> {area.projects?.name || 'Obra'}
        </Link>

        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-3xl font-extrabold text-plano sm:text-4xl">{area.name}</h1>
              <EditAreaModal areaId={area.id} currentName={area.name} projectId={resolvedParams.id} />
            </div>
            <p className="text-sm text-muted-foreground">
              {reports?.length || 0} {(reports?.length || 0) === 1 ? 'nota' : 'notas'} de bitácora
            </p>
          </div>
          <Link
            href={`/dashboard/projects/${resolvedParams.id}/areas/${area.id}/bitacoras/new`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-obra px-5 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
          >
            <PlusCircle className="h-4 w-4" aria-hidden /> Nueva bitácora
          </Link>
        </header>
      </div>

      <div>
        {reports?.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-junta bg-card p-8">
            <h2 className="text-lg font-bold text-plano">Esta área todavía no tiene bitácoras</h2>
            <p className="mt-1 text-sm text-muted-foreground">Registra la primera nota del día con sus avances y fotos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports?.map((report, idx) => {
              // El folio lo asigna la base de datos; el número de posición queda solo como respaldo
              const noteLabel = report.folio ? `Folio ${report.folio}` : `Nota ${String((reports?.length || 0) - idx).padStart(3, '0')}`
              const status = report.status || 'pendiente'
              const creatorName = report.creator?.full_name || 'Personal de Obra'
              const acceptorName = report.acceptor?.full_name || 'Residente'
              const directorName = (report.signer as any)?.full_name || (report.acceptor as any)?.full_name || 'Director de Obra'

              return (
                <Card key={report.id} className="gap-0 py-0">
                  <CardHeader className="border-b border-border bg-muted/40 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-obra">
                          {noteLabel}
                          {(report.version || 1) > 1 && <span className="ml-2 font-normal text-muted-foreground">Versión {report.version}</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg font-bold text-plano">
                            {formatDateOnly(report.report_date, {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </CardTitle>
                          
                          {/* Badges de Estado */}
                          {status === 'firmada' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ok-soft text-ok border border-ok/30">
                              <FileCheck2 className="w-3.5 h-3.5" aria-hidden /> Firmada por el director
                            </span>
                          ) : status === 'aceptada' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-obra-strong border border-obra/25">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> Aceptada por {acceptorName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-senal-soft text-senal border border-senal/30">
                              <Clock className="w-3.5 h-3.5" aria-hidden /> Falta aceptación del residente
                            </span>
                          )}
                        </div>
                        
                        <CardDescription className="mt-1 text-sm text-muted-foreground">
                          Registró <strong className="text-plano/80">{creatorName}</strong>
                        </CardDescription>
                      </div>

                      {/* Botones de Acción (Aceptar / Firmar / PDF) */}
                      <div className="flex flex-wrap items-center gap-2">
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
                            director_signature_url: report.director_signature_url,
                            director_name: directorName,
                            status: status,
                            company_name: companyName,
                            company_logo_url: companyLogoUrl
                          }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 py-5">
                    <div className="max-w-prose whitespace-pre-line text-base leading-relaxed text-plano">
                      <h3 className="sr-only">Avances y actividades</h3>
                      {report.progress_notes}
                    </div>

                    {/* Alerta de Solicitud Especial para Director */}
                    {report.special_request && (
                      <div className="p-3.5 rounded-md bg-senal-soft border border-senal/30 text-senal space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-senal">
                          <AlertCircle className="w-4 h-4 text-senal shrink-0" />
                          <span>Solicitud para el director</span>
                        </div>
                        <p className="text-sm font-medium pl-5 text-plano">
                          {report.special_request}
                        </p>
                      </div>
                    )}

                    {/* Visualización de Firmas */}
                    {(report.signature_url || report.director_signature_url) && (
                      <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                        {report.signature_url && report.signature_url !== report.director_signature_url && (
                          <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md border border-border">
                            <div>
                              <span className="font-semibold text-plano block text-xs">Firma del responsable</span>
                              <span className="text-xs text-muted-foreground">{creatorName}</span>
                              <span className="block text-xs text-muted-foreground">{formatDateTime(report.created_at)}</span>
                            </div>
                            <img
                              src={report.signature_url}
                              alt={`Firma de ${creatorName}`}
                              className="h-10 border rounded bg-white p-1 max-w-[130px] object-contain shadow-2xs"
                            />
                          </div>
                        )}
                        {report.director_signature_url && (
                          <div className="flex items-center justify-between p-2.5 bg-ok-soft rounded-md border border-ok/30">
                            <div>
                              <span className="font-semibold text-ok block text-xs">Visto bueno del director</span>
                              <span className="text-xs text-ok font-medium">{directorName}</span>
                              {report.signed_at && <span className="block text-xs text-ok/80">{formatDateTime(report.signed_at)}</span>}
                            </div>
                            <img
                              src={report.director_signature_url}
                              alt={`Firma de ${directorName}`}
                              className="h-10 border border-ok/30 rounded bg-white p-1 max-w-[130px] object-contain shadow-2xs"
                            />
                          </div>
                        )}
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
