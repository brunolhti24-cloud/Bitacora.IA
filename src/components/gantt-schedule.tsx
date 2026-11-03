'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, ChevronLeft, ChevronRight, MapPin, Pencil, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NewTaskModal } from '@/components/new-task-modal'
import { deleteTask, setTaskBlocked, updateTaskSchedule } from '@/app/dashboard/actions'
import { addDays, formatDateOnly, todayInObra } from '@/lib/dates'
import { roleLabel } from '@/lib/roles'

export type ScheduleTask = {
  id: string
  title: string
  description?: string | null
  status: 'Pendiente' | 'En Proceso' | 'Terminada'
  start_date?: string | null
  due_date?: string | null
  progress?: number | null
  is_blocked?: boolean | null
  blocked_reason?: string | null
  area?: { name: string | null } | null
  assigned_to?: { id: string; full_name: string | null; role: string | null } | null
}

type State = 'pendiente' | 'proceso' | 'completada' | 'bloqueada'
type View = 'semana' | 'mes'

const STATE: Record<State, { label: string; badge: string; bar: string; fill: string }> = {
  pendiente: { label: 'Pendiente', badge: 'border-slate-300 bg-white text-slate-700', bar: 'bg-slate-200', fill: 'bg-slate-500' },
  proceso: { label: 'En proceso', badge: 'border-blue-200 bg-blue-50 text-blue-800', bar: 'bg-blue-100', fill: 'bg-[#144CC9]' },
  completada: { label: 'Completada', badge: 'border-emerald-200 bg-emerald-50 text-emerald-800', bar: 'bg-emerald-100', fill: 'bg-emerald-600' },
  bloqueada: { label: 'Bloqueada', badge: 'border-amber-300 bg-amber-50 text-amber-900', bar: 'bg-amber-100', fill: 'bg-amber-500' },
}

const WEEKDAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const DAY_MS = 86400000

const toUtc = (d: string) => Date.parse(d.slice(0, 10) + 'T00:00:00Z')
const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / DAY_MS)
const weekday = (d: string) => new Date(toUtc(d)).getUTCDay()
const mondayOf = (d: string) => addDays(d, -((weekday(d) + 6) % 7))
const monthStart = (d: string) => d.slice(0, 8) + '01'
const monthLength = (d: string) => {
  const [y, m] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
const addMonths = (d: string, n: number) => {
  const [y, m] = d.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + n, 1))
  return t.toISOString().slice(0, 10)
}

export const taskState = (t: ScheduleTask): State =>
  t.status === 'Terminada' ? 'completada' : t.is_blocked ? 'bloqueada' : t.status === 'En Proceso' ? 'proceso' : 'pendiente'

export const isTaskOverdue = (t: ScheduleTask, today: string) => !!t.due_date && t.status !== 'Terminada' && t.due_date < today

const taskProgress = (t: ScheduleTask) => (t.status === 'Terminada' ? 100 : Math.max(0, Math.min(100, Number(t.progress) || 0)))

function StateBadge({ task, today }: { task: ScheduleTask; today: string }) {
  const s = STATE[taskState(task)]
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${s.badge}`}>{s.label}</span>
      {isTaskOverdue(task, today) && (
        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">Vencida</span>
      )}
    </span>
  )
}

function EditTaskDialog({
  task,
  projectId,
  canPlan,
  onClose,
  onSaved,
}: {
  task: ScheduleTask
  projectId: string
  canPlan: boolean
  onClose: () => void
  onSaved: (patch: Partial<ScheduleTask> | null) => void
}) {
  const [start, setStart] = useState(task.start_date || '')
  const [due, setDue] = useState(task.due_date || '')
  const [progress, setProgress] = useState(String(taskProgress(task)))
  const [status, setStatus] = useState<ScheduleTask['status']>(task.status)
  const [blocked, setBlocked] = useState(!!task.is_blocked)
  const [reason, setReason] = useState(task.blocked_reason || '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const datesInvalid = !!start && !!due && start > due
  const pct = Number(progress)
  const pctInvalid = progress === '' || !Number.isFinite(pct) || pct < 0 || pct > 100

  const save = async () => {
    setSaving(true)
    setError(null)
    const res = await updateTaskSchedule(task.id, { start_date: start || null, due_date: due || null, progress: pct, status }, projectId)
    if (res?.error) {
      setSaving(false)
      return setError(res.error)
    }
    if (blocked !== !!task.is_blocked || (blocked && reason.trim() !== (task.blocked_reason || ''))) {
      const b = await setTaskBlocked(task.id, blocked, blocked ? reason : null, projectId)
      if (b?.error) {
        setSaving(false)
        return setError(b.error)
      }
    }
    const finalStatus = Math.round(pct) === 100 ? 'Terminada' : status
    onSaved({
      start_date: start || null,
      due_date: due || null,
      status: finalStatus,
      progress: finalStatus === 'Terminada' ? 100 : Math.round(pct),
      is_blocked: blocked,
      blocked_reason: blocked ? reason.trim() : null,
    })
  }

  const remove = async () => {
    if (!confirm('¿Eliminar esta actividad del cronograma?')) return
    setSaving(true)
    try {
      await deleteTask(task.id, projectId)
      onSaved(null)
    } catch (e) {
      setSaving(false)
      setError(e instanceof Error ? e.message : 'No se pudo eliminar.')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Programar actividad</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gantt-start">Fecha de inicio</Label>
              <Input id="gantt-start" type="date" value={start} max={due || undefined} onChange={(e) => setStart(e.target.value)} disabled={!canPlan} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gantt-due">Fecha de término</Label>
              <Input id="gantt-due" type="date" value={due} min={start || undefined} onChange={(e) => setDue(e.target.value)} disabled={!canPlan} aria-invalid={datesInvalid} />
            </div>
          </div>
          {datesInvalid && <p role="alert" className="text-sm text-destructive">La fecha de inicio no puede ser posterior a la de término.</p>}
          {!canPlan && <p className="text-xs text-muted-foreground">Las fechas las programa el director, el residente o el contratista.</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gantt-progress">Avance de la actividad (%)</Label>
              <Input id="gantt-progress" type="number" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(e.target.value)} aria-invalid={pctInvalid} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gantt-status">Estado</Label>
              <select
                id="gantt-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ScheduleTask['status'])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En Proceso">En proceso</option>
                <option value="Terminada">Completada</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">El avance de las actividades no cambia el avance físico reportado de la obra.</p>

          <div className="space-y-2 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} className="h-4 w-4" />
              Actividad bloqueada
            </label>
            {blocked && (
              <div className="space-y-1.5">
                <Label htmlFor="gantt-reason">¿Qué la está bloqueando?</Label>
                <Input id="gantt-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Falta material, espera de permiso…" />
              </div>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          {canPlan ? (
            <Button type="button" variant="ghost" onClick={remove} disabled={saving} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden /> Eliminar
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={save} disabled={saving || datesInvalid || pctInvalid || (blocked && !reason.trim())}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function GanttSchedule({
  initialTasks,
  projectId,
  canPlan,
  currentUserId,
  projectMembers = [],
  areas = [],
}: {
  initialTasks: ScheduleTask[]
  projectId: string
  canPlan: boolean
  currentUserId: string | null
  projectMembers?: { id: string; full_name: string | null; role: string | null }[]
  areas?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const today = todayInObra()
  const [tasks, setTasks] = useState(initialTasks)
  // Si el servidor manda actividades nuevas (al crear una), se reemplaza la copia local
  const [serverTasks, setServerTasks] = useState(initialTasks)
  if (serverTasks !== initialTasks) {
    setServerTasks(initialTasks)
    setTasks(initialTasks)
  }
  const [view, setView] = useState<View>('semana')
  const [anchor, setAnchor] = useState(today)
  const [editing, setEditing] = useState<ScheduleTask | null>(null)

  // Ventana visible: dos semanas desde el lunes, o el mes completo
  const { from, days } = useMemo(() => {
    if (view === 'semana') return { from: mondayOf(anchor), days: 14 }
    const start = monthStart(anchor)
    return { from: start, days: monthLength(start) }
  }, [view, anchor])
  const to = addDays(from, days - 1)
  const columns = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days])

  const unscheduled = tasks.filter((t) => !t.start_date && !t.due_date)
  const scheduled = tasks
    .filter((t) => t.start_date || t.due_date)
    .sort((a, b) => (a.start_date || a.due_date || '').localeCompare(b.start_date || b.due_date || ''))
  const overdue = tasks.filter((t) => isTaskOverdue(t, today)).length
  const blocked = tasks.filter((t) => t.is_blocked && t.status !== 'Terminada').length

  const move = (dir: -1 | 1) => setAnchor((a) => (view === 'semana' ? addDays(a, 7 * dir) : addMonths(a, dir)))
  const rangeLabel =
    view === 'semana'
      ? `${formatDateOnly(from, { day: 'numeric', month: 'short' })} – ${formatDateOnly(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : formatDateOnly(from, { month: 'long', year: 'numeric' })
  const todayIndex = daysBetween(from, today)
  const colWidth = view === 'semana' ? 48 : 30

  const canEdit = (t: ScheduleTask) => canPlan || (!!currentUserId && t.assigned_to?.id === currentUserId)

  const onSaved = (patch: Partial<ScheduleTask> | null) => {
    const id = editing?.id
    setEditing(null)
    setTasks((prev) => (patch ? prev.map((t) => (t.id === id ? { ...t, ...patch } : t)) : prev.filter((t) => t.id !== id)))
    router.refresh()
  }

  const who = (t: ScheduleTask) =>
    t.assigned_to?.full_name
      ? `${t.assigned_to.full_name}${roleLabel(t.assigned_to.role || '') ? `, ${roleLabel(t.assigned_to.role || '')}` : ''}`
      : 'Sin responsable'

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cronograma de actividades</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'actividad' : 'actividades'}
            {overdue > 0 && <> · <span className="font-semibold text-red-700">{overdue} {overdue === 1 ? 'vencida' : 'vencidas'}</span></>}
            {blocked > 0 && <> · <span className="font-semibold text-amber-800">{blocked} {blocked === 1 ? 'bloqueada' : 'bloqueadas'}</span></>}
            {unscheduled.length > 0 && <> · {unscheduled.length} sin programar</>}
          </p>
        </div>
        {canPlan && <NewTaskModal projectId={projectId} projectMembers={projectMembers} areas={areas} />}
      </div>

      {/* Controles: escala y navegación */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-2">
        <div role="group" aria-label="Escala del cronograma" className="inline-flex rounded-lg bg-slate-100 p-1">
          {(['semana', 'mes'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`min-h-9 rounded-md px-3 text-sm font-semibold transition-colors ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {v === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => move(-1)} aria-label={view === 'semana' ? 'Semana anterior' : 'Mes anterior'} className="h-9 w-9 p-0">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold capitalize text-slate-800" aria-live="polite">{rangeLabel}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => move(1)} aria-label={view === 'semana' ? 'Semana siguiente' : 'Mes siguiente'} className="h-9 w-9 p-0">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAnchor(today)} className="ml-1 h-9">
            Hoy
          </Button>
        </div>
      </div>

      {/* Diagrama */}
      {scheduled.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
          Aún no hay actividades con fechas. {canPlan ? 'Crea una actividad o programa las que están sin fecha.' : ''}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <div style={{ minWidth: 224 + days * colWidth }}>
            {/* Encabezado de días */}
            <div className="flex border-b bg-slate-50">
              <div className="sticky left-0 z-20 w-56 shrink-0 border-r bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actividad
              </div>
              <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
                {columns.map((d) => {
                  const isToday = d === today
                  const weekend = weekday(d) === 0 || weekday(d) === 6
                  return (
                    <div
                      key={d}
                      className={`border-l py-1.5 text-center text-[11px] leading-tight ${isToday ? 'bg-red-50 font-bold text-red-700' : weekend ? 'bg-slate-100 text-slate-400' : 'text-slate-500'}`}
                      aria-current={isToday ? 'date' : undefined}
                    >
                      <span className="block">{WEEKDAY[weekday(d)]}</span>
                      <span className="block font-semibold">{Number(d.slice(8))}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Filas */}
            <ul>
              {scheduled.map((t) => {
                const state = taskState(t)
                const s = STATE[state]
                const late = isTaskOverdue(t, today)
                const pct = taskProgress(t)
                const hasRange = !!t.start_date && !!t.due_date
                // Fechas parciales: se marca solo el día conocido, sin inventar el otro
                const barStart = t.start_date || t.due_date!
                const barEnd = t.due_date || t.start_date!
                const startIdx = daysBetween(from, barStart)
                const endIdx = daysBetween(from, barEnd)
                const visible = endIdx >= 0 && startIdx < days
                const left = (Math.max(startIdx, 0) / days) * 100
                const width = ((Math.min(endIdx, days - 1) - Math.max(startIdx, 0) + 1) / days) * 100
                const datesText = hasRange
                  ? `${formatDateOnly(t.start_date!, { day: 'numeric', month: 'short' })} – ${formatDateOnly(t.due_date!, { day: 'numeric', month: 'short' })}`
                  : t.due_date
                  ? `Término ${formatDateOnly(t.due_date, { day: 'numeric', month: 'short' })} · sin fecha de inicio`
                  : `Inicio ${formatDateOnly(t.start_date!, { day: 'numeric', month: 'short' })} · sin fecha de término`
                const summary = `${t.title}. ${datesText}. ${s.label}${late ? ', vencida' : ''}. Avance ${pct} %.`

                return (
                  <li key={t.id} className={`flex border-b last:border-b-0 ${late ? 'bg-red-50/40' : ''}`}>
                    <div className={`sticky left-0 z-10 w-56 shrink-0 border-r px-3 py-2 ${late ? 'bg-red-50' : 'bg-white'}`}>
                      <div className="flex items-start justify-between gap-1">
                        <p className="min-w-0 text-sm font-semibold leading-snug text-slate-900">{t.title}</p>
                        {canEdit(t) && (
                          <button
                            type="button"
                            onClick={() => setEditing(t)}
                            aria-label={`Programar ${t.title}`}
                            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {t.area?.name || 'General'} · {who(t)}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <StateBadge task={t} today={today} />
                        <span className="text-[11px] font-semibold text-slate-700">{pct}%</span>
                      </div>
                    </div>

                    <div className="relative flex-1" title={summary}>
                      {/* Fines de semana y hoy */}
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }} aria-hidden>
                        {columns.map((d) => (
                          <div key={d} className={`border-l ${weekday(d) === 0 || weekday(d) === 6 ? 'bg-slate-50' : ''}`} />
                        ))}
                      </div>
                      {todayIndex >= 0 && todayIndex < days && (
                        <div className="absolute inset-y-0 w-0.5 bg-red-500" style={{ left: `${((todayIndex + 0.5) / days) * 100}%` }} aria-hidden />
                      )}

                      {visible ? (
                        hasRange ? (
                          <div
                            role="img"
                            aria-label={summary}
                            className={`absolute top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-md ${s.bar} ${late ? 'ring-2 ring-red-600' : ''}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <div className={`h-full ${s.fill}`} style={{ width: `${pct}%` }} />
                          </div>
                        ) : (
                          <div
                            role="img"
                            aria-label={summary}
                            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 ${s.fill} ${late ? 'ring-2 ring-red-600 ring-offset-1' : ''}`}
                            style={{ left: `${((startIdx + 0.5) / days) * 100}%` }}
                          />
                        )
                      ) : (
                        <p className="absolute inset-0 flex items-center px-3 text-[11px] text-slate-400">
                          {endIdx < 0 ? '← Antes de este periodo' : 'Después de este periodo →'} · {datesText}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Simbología */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Simbología">
        {(Object.keys(STATE) as State[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-5 rounded-sm ${STATE[k].fill}`} aria-hidden /> {STATE[k].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm ring-2 ring-red-600" aria-hidden /> Vencida</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-red-500" aria-hidden /> Hoy</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-slate-500" aria-hidden /> Solo una fecha registrada</li>
      </ul>

      {/* Sin programar: actividades sin fechas, no se les asignan fechas inventadas */}
      {unscheduled.length > 0 && (
        <section aria-labelledby="sin-programar" className="space-y-2">
          <h3 id="sin-programar" className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CalendarClock className="h-4 w-4 text-slate-500" aria-hidden /> Sin programar ({unscheduled.length})
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {unscheduled.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-2 rounded-lg border border-dashed bg-white p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden />{t.area?.name || 'General'}</span>
                    <span className="inline-flex items-center gap-1"><User className="h-3 w-3" aria-hidden />{who(t)}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StateBadge task={t} today={today} />
                    <span className="text-[11px] font-semibold text-slate-700">{taskProgress(t)}%</span>
                  </div>
                </div>
                {canEdit(t) && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditing(t)} className="h-8 shrink-0 text-xs">
                    Programar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <EditTaskDialog task={editing} projectId={projectId} canPlan={canPlan} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}
    </div>
  )
}
