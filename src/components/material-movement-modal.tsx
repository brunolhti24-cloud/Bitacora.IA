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

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function MaterialMovementModal({
  materialId,
  materialName,
  unit,
  type,
  projectId,
  stock,
  areas = [],
}: {
  materialId: string
  materialName: string
  unit: string
  type: 'entrada' | 'salida'
  projectId: string
  stock: number
  areas?: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')

  const isEntrada = type === 'entrada'
  const qty = parseFloat(quantity) || 0
  const after = isEntrada ? stock + qty : stock - qty
  // Una salida no puede dejar la existencia en negativo
  const overdraw = !isEntrada && qty > stock
  const ids = { qty: `qty-${type}-${materialId}`, area: `area-${type}-${materialId}`, who: `who-${type}-${materialId}`, why: `why-${type}-${materialId}`, notes: `notes-${type}-${materialId}` }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    if (!qty || qty <= 0) {
      setError('Escribe una cantidad mayor a 0.')
      return
    }
    if (!isEntrada && qty > stock) {
      setError(`No hay suficiente existencia: quedan ${stock} ${unit}.`)
      return
    }

    setLoading(true)
    try {
      const res = await recordMaterialMovement(materialId, type, qty, projectId, {
        areaId: (form.get('area_id') as string) || null,
        receivedBy: form.get('received_by') as string,
        reason: form.get('reason') as string,
        notes: form.get('notes') as string,
      })
      if (res?.success) {
        setOpen(false)
        setQuantity('')
      } else {
        setError(res?.error || 'No se pudo registrar el movimiento.')
      }
    } catch {
      setError('No se pudo registrar el movimiento. Revisa tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
      <DialogTrigger
        aria-label={`Registrar ${type} de ${materialName}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
          isEntrada
            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
        }`}
      >
        {isEntrada ? (
          <>
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" aria-hidden /> + Entrada
          </>
        ) : (
          <>
            <MinusCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden /> - Salida
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Registrar {isEntrada ? 'Entrada' : 'Salida'} de Material</DialogTitle>
          <DialogDescription>
            {materialName}. Existencia actual: <strong>{stock} {unit}</strong>. La fecha, tu usuario y el saldo se guardan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={ids.qty}>Cantidad ({unit})</Label>
            <Input
              id={ids.qty}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max={isEntrada ? undefined : stock}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-describedby={`${ids.qty}-after`}
              aria-invalid={overdraw || undefined}
            />
            {overdraw ? (
              <p id={`${ids.qty}-after`} role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                No hay suficiente existencia: hay {stock} {unit} y quieres sacar {qty}. Corrige la cantidad.
              </p>
            ) : (
              <p id={`${ids.qty}-after`} className="text-sm text-slate-500">
                Saldo después del movimiento: <strong>{Math.round(after * 100) / 100} {unit}</strong>
              </p>
            )}
          </div>

          {!isEntrada && (
            <div className="space-y-2">
              <Label htmlFor={ids.area}>Destino (área o frente)</Label>
              <select id={ids.area} name="area_id" className={selectClass} defaultValue="">
                <option value="">General / sin área específica</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={ids.who}>{isEntrada ? 'Recibió en obra' : 'Persona que recibe'}</Label>
            <Input id={ids.who} name="received_by" required={!isEntrada} autoComplete="name" placeholder="Nombre completo" />
          </div>

          <div className="space-y-2">
            <Label htmlFor={ids.why}>{isEntrada ? 'Proveedor o remisión' : 'Motivo'}</Label>
            <Input id={ids.why} name="reason" required={!isEntrada} placeholder={isEntrada ? 'Materiales El Conductor, remisión 4829' : 'Colado de losa nivel 2'} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={ids.notes}>
              Notas <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id={ids.notes} name="notes" />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={loading || overdraw || qty <= 0}
              className={`gap-1.5 font-bold rounded-xl px-5 text-white ${isEntrada ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {loading ? 'Guardando...' : `Confirmar ${isEntrada ? 'Entrada' : 'Salida'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
