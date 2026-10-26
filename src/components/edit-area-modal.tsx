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
      <DialogTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer shadow-2xs">
        <Pencil className="w-3.5 h-3.5 text-blue-600" /> Editar Nombre
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Layers className="w-5 h-5 text-blue-600" /> Editar Nombre del Área
          </DialogTitle>
          <DialogDescription>
            Cambia el nombre del área o espacio de la obra (ej. Recámara 3, Cocina, Fachada).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="area_name" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Nombre del Área *
            </Label>
            <Input
              id="area_name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Recámara Principal, Cocina, Baño..."
              className="h-11 rounded-xl bg-slate-50/50 text-slate-900 font-semibold"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Guardando...
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
