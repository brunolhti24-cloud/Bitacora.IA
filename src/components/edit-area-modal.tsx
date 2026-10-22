'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { updateArea } from '@/app/dashboard/projects/[id]/actions'
import { Pencil, Loader2, Layers } from 'lucide-react'

export function EditAreaModal({
  areaId,
  currentName,
  projectId
}: {
  areaId: string
  currentName: string
  projectId: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(currentName)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('El nombre del área es obligatorio.')
      return
    }

    setLoading(true)
    try {
      const res = await updateArea(areaId, name, projectId)
      if (res?.success) {
        setOpen(false)
      } else if (res?.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-plano/80 transition-colors hover:bg-muted hover:text-plano">
        <Pencil className="h-4 w-4" aria-hidden /> Renombrar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-plano">
            <Layers className="w-5 h-5 text-obra" /> Editar nombre del área
          </DialogTitle>
          <DialogDescription>
            Cambia el nombre del área o espacio de la obra (ej. Recámara 3, Cocina, Fachada).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="area_name">
              Nombre del área *
            </Label>
            <Input
              id="area_name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Recámara Principal, Cocina, Baño…"
              className="h-11 rounded-md bg-muted/40 text-plano font-semibold"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-md">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-obra hover:bg-obra-strong text-white font-bold rounded-md px-6">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Guardando…
                </>
              ) : (
                'Guardar Nombre'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
