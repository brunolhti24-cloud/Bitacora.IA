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
      <DialogTrigger className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm bg-[#144CC9] hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-sm">
        <PackagePlus className="w-5 h-5" /> Registrar Material/Insumo
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Boxes className="w-5 h-5 text-blue-600" /> Registrar Nuevo Material en Obra
          </DialogTitle>
          <DialogDescription>
            Agrega insumos, herramientas o materiales recibidos para llevar el control de inventario y consumo.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Nombre del Material / Insumo *
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ej. Bulto Cemento Tolteca 50kg, Varilla 1/2, Arena..."
              className="h-11 rounded-xl bg-slate-50/50 text-slate-900 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Categoría *
              </Label>
              <select
                id="category"
                name="category"
                defaultValue="Estructura"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Cimentación">🧱 Cimentación</option>
                <option value="Estructura">🏗️ Estructura y Acero</option>
                <option value="Plomería">🚰 Plomería y Tubos</option>
                <option value="Eléctrico">⚡ Eléctrico y Cableado</option>
                <option value="Acabados">🎨 Acabados y Pintura</option>
                <option value="Herramientas">🔨 Herramientas y Equipos</option>
                <option value="Otros">📦 Otros Insumos</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Unidad de Medida *
              </Label>
              <select
                id="unit"
                name="unit"
                defaultValue="bultos"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
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
              <Label htmlFor="total_received" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Cantidad Inicial Recibida *
              </Label>
              <Input
                id="total_received"
                name="total_received"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue="100"
                className="h-11 rounded-xl bg-slate-50/50 text-slate-900 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min_stock" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Stock Mínimo Alerta *
              </Label>
              <Input
                id="min_stock"
                name="min_stock"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue="10"
                className="h-11 rounded-xl bg-slate-50/50 text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Notas / Proveedor (Opcional)
            </Label>
            <Input
              id="notes"
              name="notes"
              type="text"
              placeholder="Ej. Entregado por Materiales El Conductor, Remisión #4829..."
              className="h-11 rounded-xl bg-slate-50/50 text-slate-900"
            />
          </div>

          {state?.error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {state.error}
            </p>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Registrando...
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
