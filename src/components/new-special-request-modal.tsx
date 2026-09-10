'use client'

import { useState, useActionState, useEffect } from 'react'
import { createSpecialRequest } from '@/app/dashboard/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlusCircle, Package } from 'lucide-react'

interface Project {
  id: string
  name: string
}

export function NewSpecialRequestModal({ 
  projects = [], 
  defaultProjectId 
}: { 
  projects?: Project[]
  defaultProjectId?: string 
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createSpecialRequest, null)

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
    }
  }, [state])

  const selectClasses = "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium">
            <PlusCircle className="h-4 w-4" />
            Nueva Solicitud Especial
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[520px]">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-amber-600" />
              Solicitud Especial
            </DialogTitle>
            <DialogDescription>
              Solicita materiales, maquinaria, herramientas o equipo pesado. La solicitud le llegará al director para su aprobación.
            </DialogDescription>
          </DialogHeader>

          {state?.error && (
            <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {state.error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            {/* Proyecto */}
            {!defaultProjectId ? (
              <div className="grid gap-2">
                <Label htmlFor="project_id">Proyecto *</Label>
                <select id="project_id" name="project_id" className={selectClasses} required defaultValue={projects[0]?.id || ''}>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input type="hidden" name="project_id" value={defaultProjectId} />
            )}

            {/* Categoría */}
            <div className="grid gap-2">
              <Label htmlFor="category">Categoría del Recurso *</Label>
              <select id="category" name="category" className={selectClasses} required defaultValue="materiales">
                <option value="materiales">📦 Materiales (Cemento, varilla, arena...)</option>
                <option value="maquinaria">🚜 Maquinaria (Retroexcavadora, bailarina...)</option>
                <option value="herramientas">🛠️ Herramientas (Rotomartillo, niveles...)</option>
                <option value="equipo_pesado">🏗️ Equipo Pesado (Grúas, camiones volteo...)</option>
              </select>
            </div>

            {/* Título / Nombre */}
            <div className="grid gap-2">
              <Label htmlFor="title">Elemento / Nombre solicitado *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ej: Retroexcavadora CAT 416 o 50 Ton Cemento"
                required
              />
            </div>

            {/* Cantidad y Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unidad</Label>
                <Input
                  id="unit"
                  name="unit"
                  placeholder="Piezas, M3, Ton, Horas, Días..."
                  defaultValue="pzas"
                  required
                />
              </div>
            </div>

            {/* Urgencia */}
            <div className="grid gap-2">
              <Label htmlFor="urgency">Nivel de Urgencia</Label>
              <select id="urgency" name="urgency" className={selectClasses} defaultValue="normal">
                <option value="baja">Baja (Programable a futuro)</option>
                <option value="normal">Normal (Requerido esta semana)</option>
                <option value="alta">Alta (Requerido en 24-48 horas)</option>
                <option value="urgente">🚨 Urgente (Detiene la obra)</option>
              </select>
            </div>

            {/* Descripción / Justificación */}
            <div className="grid gap-2">
              <Label htmlFor="description">Justificación / Detalles técnicos</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Especifica el motivo, área de la obra donde se utilizará o especificaciones técnicas..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white font-medium">
              {isPending ? 'Enviando...' : 'Enviar Solicitud al Director'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
