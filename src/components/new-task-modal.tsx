'use client'

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

export function NewTaskModal({ 
  projectId,
  projectMembers = [] 
}: { 
  projectId: string
  projectMembers?: any[]
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
      <DialogTrigger render={<Button>+ Nueva Tarea</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Tarea</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required placeholder="Ej: Pintar fachada" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" placeholder="Detalles de la tarea..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Asignar a</Label>
            <select 
              id="assigned_to" 
              name="assigned_to" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">-- Sin asignar --</option>
              {projectMembers.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.full_name || 'Sin nombre'} ({member.role})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Se enviará un correo automático si el usuario tiene un email registrado.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Crear Tarea'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
