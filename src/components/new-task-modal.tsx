'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createTask } from '@/app/dashboard/actions'
import { todayInObra } from '@/lib/dates'
import { roleLabel } from '@/lib/roles'

const selectClass = 'flex h-11 w-full rounded-md border border-input bg-white px-3 text-base text-plano transition-colors focus-visible:border-obra md:text-sm'

export function NewTaskModal({
  projectId,
  projectMembers = [],
  areas = [],
}: {
  projectId: string
  projectMembers?: any[]
  areas?: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append('project_id', projectId)

    try {
      const result = await createTask(null, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-11 gap-2 px-4"><Plus className="h-4 w-4" aria-hidden />Nueva tarea</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir tarea</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required placeholder="Pintar fachada norte" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" placeholder="Detalles de la tarea…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-due">Fecha compromiso</Label>
              <Input id="task-due" name="due_date" type="date" min={todayInObra()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Prioridad</Label>
              <select id="task-priority" name="priority" defaultValue="normal" className={selectClass}>
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-area">Área o frente</Label>
            <select id="task-area" name="area_id" defaultValue="" className={selectClass}>
              <option value="">General / sin área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Asignar a</Label>
            <select id="assigned_to" name="assigned_to" className={selectClass}>
              <option value="">Sin asignar</option>
              {projectMembers.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.full_name || 'Sin nombre'}{roleLabel(member.role) ? ` (${roleLabel(member.role)})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Se enviará un correo automático si el usuario tiene un email registrado.
            </p>
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando…' : 'Crear tarea'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
