'use client'

import { todayInObra } from '@/lib/dates'
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

  const selectClasses = "flex h-11 w-full rounded-md border border-input bg-white px-3 text-base text-plano transition-colors focus-visible:border-obra md:text-sm"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-11 gap-2 px-4">
            <PlusCircle className="h-4 w-4" aria-hidden />
            Nueva solicitud
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[520px]">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-senal" />
              Solicitud especial
            </DialogTitle>
            <DialogDescription>
              Solicita materiales, maquinaria, herramientas o equipo pesado. La solicitud le llegará al director para su aprobación.
            </DialogDescription>
          </DialogHeader>

          {state?.error && (
            <div className="mt-2 rounded-md bg-destructive/5 p-3 text-sm text-destructive border border-destructive/30">
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
              <Label htmlFor="category">Categoría del recurso *</Label>
              <select id="category" name="category" className={selectClasses} required defaultValue="materiales">
                <option value="materiales">Materiales (Cemento, varilla, arena...)</option>
                <option value="maquinaria">Maquinaria (Retroexcavadora, bailarina...)</option>
                <option value="herramientas">Herramientas (Rotomartillo, niveles...)</option>
                <option value="equipo_pesado">Equipo Pesado (Grúas, camiones volteo...)</option>
              </select>
            </div>

            {/* Título / Nombre */}
            <div className="grid gap-2">
              <Label htmlFor="title">Elemento / nombre solicitado *</Label>
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
                  placeholder="Piezas, M3, Ton, Horas, Días…"
                  defaultValue="pzas"
                  required
                />
              </div>
            </div>

            {/* Urgencia y fecha requerida */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="urgency">Urgencia</Label>
                <select id="urgency" name="urgency" className={selectClasses} defaultValue="normal">
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente (detiene la obra)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="needed_by">Se necesita en obra el</Label>
                <Input id="needed_by" name="needed_by" type="date" required min={todayInObra()} />
              </div>
            </div>

            {/* Descripción / Justificación */}
            <div className="grid gap-2">
              <Label htmlFor="description">Justificación / detalles técnicos</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Especifica el motivo, área de la obra donde se utilizará o especificaciones técnicas…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-senal hover:bg-senal/90 text-white font-medium">
              {isPending ? 'Enviando…' : 'Enviar Solicitud al Director'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
