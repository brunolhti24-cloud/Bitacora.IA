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
        className={`inline-flex h-9 items-center gap-1 px-2.5 rounded-md text-sm font-semibold transition-colors ${
          isEntrada
            ? 'bg-ok-soft hover:bg-ok/15 text-ok border border-ok/30'
            : 'bg-senal-soft hover:bg-senal/15 text-senal border border-senal/30'
        }`}
      >
        {isEntrada ? (
          <>
            <PlusCircle className="w-4 h-4" aria-hidden /> Entrada
          </>
        ) : (
          <>
            <MinusCircle className="w-4 h-4" aria-hidden /> Salida
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xs rounded-lg">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isEntrada ? 'text-ok' : 'text-senal'}`}>
            {isEntrada ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
            Registrar {isEntrada ? 'Entrada' : 'Salida'} de material
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEntrada
              ? `Sumar bultos o piezas recibidas para ${materialName}.`
              : `Registrar consumo o uso en obra de ${materialName}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="quantity">
              Cantidad a {isEntrada ? 'ingresar' : 'descontar'} ({unit})
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
              className="h-11 rounded-md bg-muted/40 text-plano font-bold text-lg"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-md">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`font-bold rounded-md px-5 text-white ${
                isEntrada ? 'bg-ok hover:bg-ok/90' : 'bg-senal hover:bg-senal/90'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Guardando...
                </>
              ) : (
                `Registrar ${isEntrada ? 'entrada' : 'salida'}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
