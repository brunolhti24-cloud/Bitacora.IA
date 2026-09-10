'use client'

import { useActionState, use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { createExpense } from '../../actions'

const initialState = {
  error: null as string | null,
  success: false as boolean | undefined
}

export default function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  
  const createActionWithId = createExpense.bind(null, projectId)
  const [state, action, isPending] = useActionState(createActionWithId, initialState)

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/projects/${projectId}`} className="text-sm text-blue-600 hover:underline">
          &larr; Volver al Proyecto
        </Link>
      </div>

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="text-2xl">Registrar Gasto</CardTitle>
          <CardDescription>
            Ingresa los detalles del gasto (materiales, mano de obra, viáticos).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <form action={action} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="expense_date">Fecha del Gasto *</Label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
                className="w-full text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Concepto / Descripción *</Label>
              <Input
                id="description"
                name="description"
                required
                placeholder="Ej. Compra de cemento, pago a plomero..."
                className="w-full text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <select 
                id="category" 
                name="category" 
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Materiales">Materiales</option>
                <option value="Mano de Obra">Mano de Obra</option>
                <option value="Herramientas">Herramientas/Maquinaria</option>
                <option value="Viáticos">Viáticos</option>
                <option value="Varios">Varios</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto ($) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
                className="w-full text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Foto de Ticket o Factura (Opcional)</Label>
              <Input
                id="receipt"
                name="receipt"
                type="file"
                accept="image/*,.pdf"
                className="w-full text-base file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {state?.error && (
              <p className="text-sm font-medium text-red-500">{state.error}</p>
            )}

            <div className="pt-4">
              <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar Gasto'}
              </Button>
            </div>
            
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
