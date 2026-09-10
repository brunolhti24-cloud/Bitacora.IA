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
import { recordMaterialMovement } from '@/app/dashboard/projects/[id]/actions'
import { PlusCircle, MinusCircle, Loader2 } from 'lucide-react'

export function MaterialMovementModal({
  materialId,
  materialName,
  unit,
  type,
  projectId
}: {
  materialId: string
  materialName: string
  unit: string
  type: 'entrada' | 'salida'
  projectId: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState<string>('')

  const isEntrada = type === 'entrada'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const num = parseFloat(quantity)
    if (!num || num <= 0) {
      alert('Ingresa una cantidad válida mayor a 0.')
      return
    }

    setLoading(true)
    try {
      const res = await recordMaterialMovement(materialId, type, num, projectId)
      if (res?.success) {
        setOpen(false)
        setQuantity('')
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
      <DialogTrigger
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
          isEntrada
            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
        }`}
      >
        {isEntrada ? (
          <>
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> + Entrada
          </>
        ) : (
          <>
            <MinusCircle className="w-3.5 h-3.5 text-amber-600" /> - Salida
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isEntrada ? 'text-emerald-700' : 'text-amber-800'}`}>
            {isEntrada ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
            Registrar {isEntrada ? 'Entrada' : 'Salida'} de Material
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEntrada
              ? `Sumar bultos o piezas recibidas para ${materialName}.`
              : `Registrar consumo o uso en obra de ${materialName}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="quantity" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Cantidad a {isEntrada ? 'Ingresar' : 'Descontar'} ({unit}) *
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej. 15"
              className="h-11 rounded-xl bg-slate-50/50 text-slate-900 font-bold text-lg"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`font-bold rounded-xl px-5 text-white ${
                isEntrada ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Guardando...
                </>
              ) : (
                `Confirmar ${isEntrada ? 'Entrada' : 'Salida'}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
