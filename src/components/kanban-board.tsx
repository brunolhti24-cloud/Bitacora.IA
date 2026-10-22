'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { updateTaskStatus, deleteTask, setTaskBlocked } from '@/app/dashboard/actions'
import { NewTaskModal } from './new-task-modal'
import { Trash2, CalendarClock, Ban, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatDateOnly, todayInObra } from '@/lib/dates'
import { roleLabel } from '@/lib/roles'

type Priority = 'baja' | 'normal' | 'alta' | 'urgente'

type Task = {
  id: string
  title: string
  description: string
  status: 'Pendiente' | 'En Proceso' | 'Terminada'
  due_date?: string | null
  priority?: Priority | null
  is_blocked?: boolean | null
  blocked_reason?: string | null
  area?: { name: string | null } | null
  assigned_to?: { id: string; full_name: string; role: string } | null
}

const COLUMNS: { id: Task['status']; title: string }[] = [
  { id: 'Pendiente', title: 'Por hacer' },
  { id: 'En Proceso', title: 'En proceso' },
  { id: 'Terminada', title: 'Terminadas' },
]

const PRIORITY: Record<Priority, { label: string; className: string; rank: number }> = {
  urgente: { label: 'Urgente', className: 'bg-destructive text-white', rank: 0 },
  alta: { label: 'Alta', className: 'bg-senal-soft text-senal border border-senal/30', rank: 1 },
  normal: { label: 'Normal', className: 'border border-border text-muted-foreground', rank: 2 },
  baja: { label: 'Baja', className: 'border border-border text-muted-foreground', rank: 3 },
}

const isOverdue = (t: Task, today: string) => !!t.due_date && t.status !== 'Terminada' && t.due_date < today

// Primero lo que requiere atención: bloqueadas, vencidas, prioridad y fecha compromiso
function sortTasks(list: Task[], today: string) {
  return [...list].sort((a, b) => {
    const score = (t: Task) => (t.is_blocked ? 0 : isOverdue(t, today) ? 1 : 2)
    if (score(a) !== score(b)) return score(a) - score(b)
    const pa = PRIORITY[a.priority || 'normal'].rank
    const pb = PRIORITY[b.priority || 'normal'].rank
    if (pa !== pb) return pa - pb
    return (a.due_date || '9999').localeCompare(b.due_date || '9999')
  })
}

function BlockTaskButton({ task, projectId, onChange }: { task: Task; projectId?: string; onChange: (blocked: boolean, reason: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async (blocked: boolean) => {
    setSaving(true)
    setError(null)
    const res = await setTaskBlocked(task.id, blocked, blocked ? reason : null, projectId)
    setSaving(false)
    if (res?.error) return setError(res.error)
    onChange(blocked, blocked ? reason.trim() : null)
    setOpen(false)
    setReason('')
  }

  if (task.is_blocked) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); save(false) }}
        disabled={saving}
        className="min-h-9 rounded-md px-2 text-xs font-semibold text-obra hover:bg-accent"
      >
        Desbloquear
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={(e) => e.stopPropagation()}
        className="min-h-9 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-plano"
      >
        Marcar bloqueada
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar como bloqueada</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`block-${task.id}`}>¿Qué la está bloqueando?</Label>
          <Input id={`block-${task.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Falta material, espera de permiso…" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={() => save(true)} disabled={saving || !reason.trim()}>
            {saving ? 'Guardando…' : 'Marcar bloqueada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function KanbanBoard({
  initialTasks,
  projectId,
  hideNewTask = false,
  projectMembers = [],
  areas = [],
}: {
  initialTasks: any[]
  projectId?: string
  hideNewTask?: boolean
  projectMembers?: any[]
  areas?: { id: string; name: string }[]
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const today = todayInObra()

  // Sincronizar cuando vengan nuevas tareas del servidor (ej. al crear una nueva)
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const overdueCount = tasks.filter((t) => isOverdue(t, today)).length
  const blockedCount = tasks.filter((t) => t.is_blocked && t.status !== 'Terminada').length

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId as Task['status']

    // Update local state immediately for snappy UI
    setTasks(prev => prev.map(task =>
      task.id === draggableId ? { ...task, status: newStatus } : task
    ))

    // Update backend
    try {
      await updateTaskStatus(draggableId, newStatus, projectId || '')
    } catch (error) {
      console.error('Error updating task:', error)
      setTasks(initialTasks)
    }
  }

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta tarea permanentemente?')) return

    // Actualización optimista inmediata
    setTasks(prev => prev.filter(t => t.id !== taskId))

    try {
      await deleteTask(taskId, projectId)
    } catch (error) {
      console.error('Error deleting task:', error)
      setTasks(initialTasks)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-plano">Tablero de tareas</h2>
          {(overdueCount > 0 || blockedCount > 0) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {overdueCount > 0 && <span className="font-semibold text-destructive">{overdueCount} {overdueCount === 1 ? 'vencida' : 'vencidas'}</span>}
              {overdueCount > 0 && blockedCount > 0 && ' · '}
              {blockedCount > 0 && <span className="font-semibold text-senal">{blockedCount} {blockedCount === 1 ? 'bloqueada' : 'bloqueadas'}</span>}
            </p>
          )}
        </div>
        {!hideNewTask && projectId && <NewTaskModal projectId={projectId} projectMembers={projectMembers} areas={areas} />}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map(column => {
            const columnTasks = sortTasks(tasks.filter(t => t.status === column.id), today)
            return (
              <div key={column.id} className="rounded-lg border border-border bg-muted/50 p-3">
                <h3 className="mb-3 flex items-center justify-between px-1 text-sm font-bold text-plano">
                  <span>{column.title}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </h3>

                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="min-h-[200px] space-y-2.5"
                    >
                      {columnTasks.map((task, index) => {
                        const overdue = isOverdue(task, today)
                        const prio = PRIORITY[task.priority || 'normal']
                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps}>
                                <article
                                  className={`relative rounded-md border bg-white p-3.5 transition-colors ${
                                    task.is_blocked ? 'border-senal/50' : overdue ? 'border-destructive/50' : 'border-border hover:border-obra/60'
                                  } ${task.is_blocked || overdue ? 'border-l-4' : ''}`}
                                >
                                  <button
                                      type="button"
                                      onClick={(e) => handleDeleteTask(e, task.id)}
                                      title="Eliminar tarea"
                                      aria-label={`Eliminar tarea ${task.title}`}
                                      className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden />
                                    </button>

                                  <div
                                    {...provided.dragHandleProps}
                                    aria-label={`${task.title}. Arrastra para cambiar de columna`}
                                    className="cursor-grab rounded-sm pr-8 active:cursor-grabbing"
                                  >
                                  <p className="text-sm font-bold leading-tight text-plano">{task.title}</p>

                                  {task.description && (
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                                  )}

                                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                                    {task.priority && task.priority !== 'normal' && (
                                      <span className={`rounded px-1.5 py-0.5 font-semibold ${prio.className}`}>{prio.label}</span>
                                    )}
                                    {task.due_date && (
                                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${overdue ? 'bg-destructive/10 font-semibold text-destructive' : 'text-muted-foreground'}`}>
                                        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                                        {overdue ? 'Vencida: ' : ''}{formatDateOnly(task.due_date, { day: 'numeric', month: 'short' })}
                                      </span>
                                    )}
                                    {task.area?.name && (
                                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                                        {task.area.name}
                                      </span>
                                    )}
                                  </div>

                                  </div>

                                  {task.is_blocked && (
                                    <p className="mt-2 flex items-start gap-1.5 rounded bg-senal-soft px-2 py-1.5 text-xs text-senal">
                                      <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                      <span><strong>Bloqueada:</strong> {task.blocked_reason}</span>
                                    </p>
                                  )}

                                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2">
                                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                                      {task.assigned_to?.full_name
                                        ? `${task.assigned_to.full_name}${roleLabel(task.assigned_to.role) ? `, ${roleLabel(task.assigned_to.role)}` : ''}`
                                        : 'Sin asignar'}
                                    </span>
                                    {task.status !== 'Terminada' && (
                                      <BlockTaskButton
                                        task={task}
                                        projectId={projectId}
                                        onChange={(blocked, reason) =>
                                          setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_blocked: blocked, blocked_reason: reason } : t)))
                                        }
                                      />
                                    )}
                                  </div>
                                </article>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
