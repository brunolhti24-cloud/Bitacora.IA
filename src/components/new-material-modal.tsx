'use client'

import { useActionState, useState, useEffect } from 'react'
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
import { createMaterial } from '@/app/dashboard/projects/[id]/actions'
import { PackagePlus, Loader2, Boxes } from 'lucide-react'

const initialState: { error?: string; success?: boolean } = {
  error: undefined,
  success: false
}

export function NewMaterialModal({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const createMaterialWithId = createMaterial.bind(null, projectId)
  const [state, action, isPending] = useActionState(createMaterialWithId, initialState)

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong">
        <PackagePlus className="h-4 w-4" aria-hidden /> Registrar material
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-plano">
            <Boxes className="w-5 h-5 text-obra" /> Registrar nuevo material en obra
          </DialogTitle>
          <DialogDescription>
            Agrega insumos, herramientas o materiales recibidos para llevar el control de inventario y consumo.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nombre del material / insumo *
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ej. Bulto Cemento Tolteca 50kg, Varilla 1/2, Arena…"
              
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">
                Categoría *
              </Label>
              <select
                id="category"
                name="category"
                defaultValue="Estructura"
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 text-base text-plano transition-colors focus-visible:border-obra md:text-sm"
              >
                <option value="Cimentación">Cimentación</option>
                <option value="Estructura">Estructura y Acero</option>
                <option value="Plomería">Plomería y Tubos</option>
                <option value="Eléctrico">Eléctrico y Cableado</option>
                <option value="Acabados">Acabados y Pintura</option>
                <option value="Herramientas">Herramientas y Equipos</option>
                <option value="Otros">Otros Insumos</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit">
                Unidad de medida *
              </Label>
              <select
                id="unit"
                name="unit"
                defaultValue="bultos"
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 text-base text-plano transition-colors focus-visible:border-obra md:text-sm"
              >
                <option value="bultos">Bultos / Sacos</option>
                <option value="piezas">Piezas (Pzas)</option>
                <option value="metros">Metros Lineales (m)</option>
                <option value="m3">Metros Cúbicos (m³)</option>
                <option value="toneladas">Toneladas (Ton)</option>
                <option value="cajas">Cajas / Empaques</option>
                <option value="viajes">Viajes / Camiones</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="total_received">
                Cantidad inicial recibida *
              </Label>
              <Input
                id="total_received"
                name="total_received"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue="100"
                
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min_stock">
                Stock mínimo alerta *
              </Label>
              <Input
                id="min_stock"
                name="min_stock"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue="10"
                
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">
              Notas / proveedor (opcional)
            </Label>
            <Input
              id="notes"
              name="notes"
              type="text"
              placeholder="Ej. Entregado por Materiales El Conductor, Remisión #4829..."
              
            />
          </div>

          {state?.error && (
            <p className="text-xs font-semibold text-destructive bg-destructive/5 p-2.5 rounded-lg border border-destructive/30">
              {state.error}
            </p>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-md">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-obra hover:bg-obra-strong text-white font-bold rounded-md px-6">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Registrando…
                </>
              ) : (
                'Registrar Insumo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
