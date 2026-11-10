import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, ArrowLeft, ArrowRight, CheckCircle2, FileText, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getVisibleProjectsQuery } from '@/lib/projects'
import { PROJECT_STATUS_LABELS, projectStatus } from '@/lib/permissions'
import { isDirectorRole } from '@/lib/roles'
import { formatDateOnly, formatDateTime } from '@/lib/dates'
import { signatureLabel } from '@/lib/signatures'
import { cleanNotes } from '@/lib/text'
import { ProjectActions } from '@/components/project-actions'
import { ArchiveReportButton } from '@/components/archive-report-button'

type Report = {
  id: string
  project_id: string
  area_id: string
  folio: string | null
  report_date: string
  status: string | null
  signature_url: string | null
  progress_notes: string | null
  archived_at: string | null
  project_areas: { name: string | null } | null
  creator: { full_name: string | null } | null
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Obras terminadas o archivadas con todas sus bitácoras, y bitácoras archivadas de obras activas
export default async function ArchivoPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const query = normalize(q.trim())

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, invited_by').eq('id', user.id).maybeSingle()
  const isDirector = isDirectorRole(profile?.role)
  const { data: projectRows } = await getVisibleProjectsQuery(supabase, user.id, profile)
  const projects = (projectRows || []) as { id: string; name: string; client_name?: string | null; location?: string | null; status?: string | null; closed_at?: string | null }[]
  const closed = projects.filter((p) => projectStatus(p.status) !== 'activa')
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || 'Obra'

  // Bitácoras de las obras cerradas, más las archivadas de obras activas
  const fields = 'id, project_id, area_id, folio, report_date, status, signature_url, progress_notes, archived_at, project_areas(name), creator:profiles!daily_reports_created_by_fkey(full_name)'
  const closedIds = closed.map((p) => p.id)
  const activeIds = projects.filter((p) => projectStatus(p.status) === 'activa').map((p) => p.id)
  const [closedRes, archivedRes] = await Promise.all([
    closedIds.length
      ? supabase.from('daily_reports').select(fields).in('project_id', closedIds).order('report_date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    activeIds.length
      ? supabase.from('daily_reports').select(fields).in('project_id', activeIds).not('archived_at', 'is', null).order('report_date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])
  const migrationMissing = !!(closedRes.error || archivedRes.error)
  const closedReports = ((closedRes.data || []) as unknown as Report[])
  const archivedReports = ((archivedRes.data || []) as unknown as Report[])

  const matchesReport = (r: Report) =>
    !query || normalize([r.folio, r.project_areas?.name, r.creator?.full_name, r.progress_notes, formatDateOnly(r.report_date)].filter(Boolean).join(' ')).includes(query)
  const matchesProject = (p: (typeof projects)[number]) => !query || normalize([p.name, p.client_name, p.location].filter(Boolean).join(' ')).includes(query)

  // Una obra aparece si coincide su nombre o alguna de sus bitácoras
  const groups = closed
    .map((p) => {
      const own = closedReports.filter((r) => r.project_id === p.id)
      const byProject = matchesProject(p)
      return { project: p, total: own.length, reports: byProject ? own : own.filter(matchesReport), byProject }
    })
    .filter((g) => g.byProject || g.reports.length > 0)
  const looseReports = archivedReports.filter((r) => matchesReport(r) || (!!query && normalize(projectName(r.project_id)).includes(query)))

  const ReportRow = ({ r, showProject }: { r: Report; showProject?: boolean }) => (
    <li className="flex items-start gap-3 p-3 sm:p-4">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <Link href={`/dashboard/projects/${r.project_id}/areas/${r.area_id}`} className="font-semibold text-slate-900 hover:text-[#144CC9] hover:underline">
          {r.folio ? `${r.folio} · ` : ''}{formatDateOnly(r.report_date, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Link>
        <p className="mt-0.5 text-xs text-slate-500">
          {showProject ? `${projectName(r.project_id)} · ` : ''}{r.project_areas?.name || 'General'}
          {r.creator?.full_name ? ` · Elaboró ${r.creator.full_name}` : ''} · {signatureLabel(r)}
          {r.archived_at ? ' · Archivada' : ''}
        </p>
        {r.progress_notes && <p className="mt-1 line-clamp-2 text-sm text-slate-700">{cleanNotes(r.progress_notes)}</p>}
      </div>
      {isDirector && r.archived_at && <ArchiveReportButton reportId={r.id} projectId={r.project_id} archived />}
    </li>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="space-y-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver al tablero
        </Link>
        <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          <Archive className="h-7 w-7 text-[#144CC9]" aria-hidden /> Archivo
        </h1>
        <p className="text-sm text-slate-500">Obras terminadas o archivadas con todas sus bitácoras. Nada se borra: aquí se consulta.</p>
      </div>

      <form action="/dashboard/archivo" className="flex gap-2" role="search">
        <label htmlFor="archivo-q" className="sr-only">Buscar en el archivo</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="archivo-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Buscar por obra, cliente, folio, área o texto de la bitácora"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#144CC9]"
          />
        </div>
        <button type="submit" className="h-11 rounded-xl bg-[#144CC9] px-4 text-sm font-bold text-white hover:bg-blue-700">Buscar</button>
        {q && <Link href="/dashboard/archivo" className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Limpiar</Link>}
      </form>

      {migrationMissing && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Falta aplicar la migración del archivo (20261110_archivo_y_colores.sql) para poder archivar obras y bitácoras.
        </p>
      )}

      <section aria-labelledby="obras-cerradas" className="space-y-3">
        <h2 id="obras-cerradas" className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Obras terminadas y archivadas ({groups.length})
        </h2>
        {groups.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
            {query ? `Ninguna obra o bitácora coincide con “${q}”.` : 'Aún no hay obras terminadas ni archivadas. Desde el tablero, el director puede marcar una obra como terminada o archivarla.'}
          </p>
        ) : (
          groups.map(({ project, total, reports }) => {
            const status = projectStatus(project.status)
            return (
              <details key={project.id} open={!!query || groups.length === 1} className="group overflow-hidden rounded-2xl border bg-white">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${status === 'terminada' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                    {status === 'terminada' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <Archive className="h-3.5 w-3.5" aria-hidden />}
                    {PROJECT_STATUS_LABELS[status]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-slate-900">{project.name}</span>
                    <span className="block text-xs text-slate-500">
                      {[project.client_name, project.location].filter(Boolean).join(' · ') || 'Sin cliente ni ubicación'}
                      {project.closed_at ? ` · desde el ${formatDateTime(project.closed_at, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    {total} {total === 1 ? 'bitácora' : 'bitácoras'}
                  </span>
                </summary>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-slate-50 px-4 py-2">
                  <Link href={`/dashboard/projects/${project.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#144CC9] hover:underline">
                    Abrir la obra <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  {isDirector && <ProjectActions projectId={project.id} status={status} />}
                </div>
                {reports.length === 0 ? (
                  <p className="border-t p-4 text-sm text-slate-500">{total === 0 ? 'Esta obra no tiene bitácoras.' : 'Ninguna bitácora de esta obra coincide con la búsqueda.'}</p>
                ) : (
                  <ul className="divide-y border-t">
                    {reports.map((r) => <ReportRow key={r.id} r={r} />)}
                  </ul>
                )}
              </details>
            )
          })
        )}
      </section>

      {(looseReports.length > 0 || (!query && archivedReports.length > 0)) && (
        <section aria-labelledby="bitacoras-archivadas" className="space-y-3">
          <h2 id="bitacoras-archivadas" className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Bitácoras archivadas de obras activas ({looseReports.length})
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-white">
            {looseReports.map((r) => <ReportRow key={r.id} r={r} showProject />)}
          </ul>
        </section>
      )}
    </div>
  )
}
