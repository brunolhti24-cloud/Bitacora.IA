'use client'

import { useState } from 'react'
import { History, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/dates'

type Movement = {
  id: string
  type: 'entrada' | 'salida'
  quantity: number
  balance_after: number
  received_by: string | null
  reason: string | null
  notes: string | null
  created_at: string
  recorder: { full_name: string | null } | null
  project_areas: { name: string | null } | null
}

export function MaterialHistoryModal({ materialId, materialName, unit }: { materialId: string; materialName: string; unit: string }) {
  const [rows, setRows] = useState<Movement[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async (open: boolean) => {
    if (!open) return
    setError(null)
    const { data, error: err } = await createClient()
      .from('material_movements')
      .select('id, type, quantity, balance_after, received_by, reason, notes, created_at, recorder:profiles!material_movements_recorded_by_fkey(full_name), project_areas(name)')
      .eq('material_id', materialId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (err) setError('No se pudo cargar el historial. Si acabas de actualizar la app, falta aplicar la migración de base de datos.')
    setRows((data as unknown as Movement[]) || [])
  }

  return (
    <Dialog onOpenChange={load}>
      <DialogTrigger
        aria-label={`Historial de movimientos de ${materialName}`}
        title="Historial de movimientos"
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-plano"
      >
        <History className="h-4 w-4" aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Movimientos: {materialName}</DialogTitle>
          <DialogDescription>Cada entrada y salida con fecha, quién la registró y el saldo resultante.</DialogDescription>
        </DialogHeader>

        {rows === null && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando…
          </p>
        )}
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        {rows && rows.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            Sin movimientos registrados todavía. Los movimientos anteriores a esta versión no tienen detalle.
          </p>
        )}
        {rows && rows.length > 0 && (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-semibold">Fecha</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Movimiento</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Destino y motivo</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Registró</th>
                  <th scope="col" className="py-2 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((m) => (
                  <tr key={m.id} className="align-top">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-muted-foreground">{formatDateTime(m.created_at)}</td>
                    <td className={`whitespace-nowrap py-2.5 pr-3 font-semibold ${m.type === 'entrada' ? 'text-ok' : 'text-senal'}`}>
                      {m.type === 'entrada' ? '+' : '−'}{Number(m.quantity)} {unit}
                    </td>
                    <td className="py-2.5 pr-3 text-plano">
                      {m.type === 'salida' && <span className="block font-medium">{m.project_areas?.name || 'General'}</span>}
                      {m.reason && <span className="block">{m.reason}</span>}
                      {m.received_by && <span className="block text-muted-foreground">{m.type === 'entrada' ? 'Recibió' : 'Recibe'}: {m.received_by}</span>}
                      {m.notes && <span className="block text-muted-foreground">{m.notes}</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{m.recorder?.full_name || '—'}</td>
                    <td className="whitespace-nowrap py-2.5 text-right font-semibold text-plano">{Number(m.balance_after)} {unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
