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

const selectClass = 'flex h-11 w-full rounded-md border border-input bg-white px-3 text-base text-plano transition-colors focus-visible:border-obra md:text-sm'

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
        className={`inline-flex h-9 items-center gap-1 px-2.5 rounded-md text-sm font-semibold transition-colors ${
          isEntrada
            ? 'bg-ok-soft hover:bg-ok/15 text-ok border border-ok/30'
            : 'bg-senal-soft hover:bg-senal/15 text-senal border border-senal/30'
        }`}
      >
        {isEntrada ? <PlusCircle className="w-4 h-4" aria-hidden /> : <MinusCircle className="w-4 h-4" aria-hidden />}
        {isEntrada ? 'Entrada' : 'Salida'}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEntrada ? 'Registrar entrada' : 'Registrar salida'}: {materialName}</DialogTitle>
          <DialogDescription>
            Existencia actual: <strong className="text-plano">{stock} {unit}</strong>. La fecha, tu usuario y el saldo se guardan automáticamente.
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
            />
            <p id={`${ids.qty}-after`} className={`text-sm ${after < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              Saldo después del movimiento: <strong>{Math.round(after * 100) / 100} {unit}</strong>
            </p>
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
              disabled={loading}
              className={`gap-1.5 text-white ${isEntrada ? 'bg-ok hover:bg-ok/90' : 'bg-senal hover:bg-senal/90'}`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {loading ? 'Guardando…' : isEntrada ? 'Registrar entrada' : 'Registrar salida'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
