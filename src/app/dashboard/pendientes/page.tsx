import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarX2, ClipboardList, FileSignature, MapPin, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getVisibleProjectsQuery } from '@/lib/projects'
import { formatDateOnly, todayInObra } from '@/lib/dates'
import { signatureLabel } from '@/lib/signatures'
import { roleLabel } from '@/lib/roles'

type Tipo = 'solicitudes' | 'vencidas' | 'firmas'

const TIPOS: { id: Tipo; label: string; icon: typeof ClipboardList; active: string }[] = [
  { id: 'solicitudes', label: 'Solicitudes pendientes', icon: ClipboardList, active: 'border-amber-400 bg-amber-50 text-amber-900' },
  { id: 'vencidas', label: 'Actividades vencidas', icon: CalendarX2, active: 'border-red-400 bg-red-50 text-red-900' },
  { id: 'firmas', label: 'Bitácoras por firmar', icon: FileSignature, active: 'border-blue-400 bg-blue-50 text-blue-900' },
]

const URGENCY: Record<string, string> = { urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baja: 'Baja' }

const daysLate = (date: string, today: string) => Math.round((Date.parse(today) - Date.parse(date)) / 86400000)

// Detalle de lo que requiere atención: qué solicitudes, actividades y bitácoras son
export default async function PendientesPage({ searchParams }: { searchParams: Promise<{ tipo?: string; obra?: string }> }) {
  const { tipo: tipoParam, obra } = await searchParams
  const tipo: Tipo = TIPOS.some((t) => t.id === tipoParam) ? (tipoParam as Tipo) : 'solicitudes'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, invited_by').eq('id', user.id).maybeSingle()
  const { data: projects } = await getVisibleProjectsQuery(supabase, user.id, profile)
  const allProjects = (projects || []) as { id: string; name: string }[]
  // Con ?obra= se limita a una obra (desde la página de la obra)
  const scoped = obra ? allProjects.filter((p) => p.id === obra) : allProjects
  const ids = scoped.map((p) => p.id)
  const projectName = (id: string) => allProjects.find((p) => p.id === id)?.name || 'Obra'
  const today = todayInObra()

  const empty = { data: [] as never[], count: 0 }
  const [requestsRes, tasksRes, reportsRes] = ids.length
    ? await Promise.all([
        supabase
          .from('special_requests')
          .select('id, project_id, title, quantity, unit, urgency, needed_by, created_at, profiles:requested_by(full_name)', { count: 'exact' })
          .in('project_id', ids)
          .eq('status', 'pendiente')
          .order('created_at', { ascending: true }),
        supabase
          .from('tasks')
          .select('id, project_id, title, due_date, status, area:project_areas(name), assigned_to:profiles(full_name, role)', { count: 'exact' })
          .in('project_id', ids)
          .neq('status', 'Terminada')
          .lt('due_date', today)
          .order('due_date', { ascending: true }),
        supabase
          .from('daily_reports')
          .select('id, project_id, area_id, folio, report_date, status, signature_url, project_areas(name), creator:profiles!daily_reports_created_by_fkey(full_name)', { count: 'exact' })
          .in('project_id', ids)
          .neq('status', 'firmada')
          .order('report_date', { ascending: true }),
      ])
    : [empty, empty, empty]

  const requests = (requestsRes.data || []) as Record<string, any>[]
  const requestsCount = requestsRes.count ?? 0
  const tasks = (tasksRes.data || []) as Record<string, any>[]
  const reports = (reportsRes.data || []) as Record<string, any>[]
  const counts: Record<Tipo, number> = { solicitudes: requestsCount, vencidas: tasksRes.count ?? 0, firmas: reportsRes.count ?? 0 }
  const qs = (t: Tipo) => `/dashboard/pendientes?tipo=${t}${obra ? `&obra=${obra}` : ''}`

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="space-y-3">
        <Link
          href={obra ? `/dashboard/projects/${obra}` : '/dashboard'}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> {obra ? `Volver a ${projectName(obra)}` : 'Volver al tablero'}
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Pendientes</h1>
        <p className="text-sm text-slate-500">
          {obra ? `Obra: ${projectName(obra)}.` : `En ${allProjects.length} ${allProjects.length === 1 ? 'obra' : 'obras'}.`} Toca un pendiente para abrirlo.
        </p>
      </div>

      <nav aria-label="Tipo de pendiente" className="grid gap-2 sm:grid-cols-3">
        {TIPOS.map((t) => (
          <Link
            key={t.id}
            href={qs(t.id)}
            aria-current={tipo === t.id ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-xl border-2 bg-white px-3.5 py-3 text-sm font-semibold transition-colors ${tipo === t.id ? t.active : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
          >
            <t.icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="flex-1">{t.label}</span>
            <span className="text-lg font-black">{counts[t.id]}</span>
          </Link>
        ))}
      </nav>

      <section aria-label={TIPOS.find((t) => t.id === tipo)?.label}>
        {counts[tipo] === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
            {tipo === 'solicitudes' ? 'No hay solicitudes esperando respuesta.' : tipo === 'vencidas' ? 'No hay actividades vencidas.' : 'Todas las bitácoras tienen firmas completas.'}
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-white">
            {tipo === 'solicitudes' &&
              requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/dashboard/projects/${r.project_id}?tab=solicitudes`} className="group flex items-center gap-3 p-4 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{r.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {projectName(r.project_id)} · {r.quantity} {r.unit}
                        {r.profiles?.full_name ? ` · Pidió ${r.profiles.full_name}` : ''}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        <span className={`rounded px-1.5 py-0.5 ${r.urgency === 'urgente' ? 'bg-red-600 text-white' : r.urgency === 'alta' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'}`}>
                          {URGENCY[r.urgency] || r.urgency}
                        </span>
                        {r.needed_by && (
                          <span className={`rounded px-1.5 py-0.5 ${r.needed_by < today ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                            Se necesita {formatDateOnly(r.needed_by, { day: 'numeric', month: 'short' })}
                            {r.needed_by < today ? ` · atrasada ${daysLate(r.needed_by, today)} d` : ''}
                          </span>
                        )}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-700" aria-hidden />
                  </Link>
                </li>
              ))}

            {tipo === 'vencidas' &&
              tasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/dashboard/projects/${t.project_id}?tab=cronograma`} className="group flex items-center gap-3 p-4 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{t.title}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
                        <span>{projectName(t.project_id)}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden />{t.area?.name || 'General'}</span>
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" aria-hidden />
                          {t.assigned_to?.full_name ? `${t.assigned_to.full_name}${roleLabel(t.assigned_to.role) ? `, ${roleLabel(t.assigned_to.role)}` : ''}` : 'Sin responsable'}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-red-700">
                        Término {formatDateOnly(t.due_date, { day: 'numeric', month: 'short', year: 'numeric' })} · {daysLate(t.due_date, today)}{' '}
                        {daysLate(t.due_date, today) === 1 ? 'día' : 'días'} de atraso
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-700" aria-hidden />
                  </Link>
                </li>
              ))}

            {tipo === 'firmas' &&
              reports.map((b) => (
                <li key={b.id}>
                  <Link href={`/dashboard/projects/${b.project_id}/areas/${b.area_id}`} className="group flex items-center gap-3 p-4 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {b.folio ? `${b.folio} · ` : ''}Reporte del {formatDateOnly(b.report_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {projectName(b.project_id)} · {b.project_areas?.name || 'General'}
                        {b.creator?.full_name ? ` · Elaboró ${b.creator.full_name}` : ''}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-blue-800">{signatureLabel(b)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-700" aria-hidden />
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}
