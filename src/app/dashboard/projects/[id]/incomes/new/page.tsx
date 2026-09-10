'use client'

import { useActionState, use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { createIncome } from '../../actions'

const initialState = {
  error: null as string | null,
}

export default function NewIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  
  const createActionWithId = createIncome.bind(null, projectId)
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
          <CardTitle className="text-2xl">Registrar Ingreso / Anticipo</CardTitle>
          <CardDescription>
            Registra una entrada de dinero para la obra (solo Admins).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <form action={action} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="income_date">Fecha del Ingreso *</Label>
              <Input
                id="income_date"
                name="income_date"
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
                placeholder="Ej. Anticipo inicial, Pago semana 3..."
                className="w-full text-base"
              />
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

            {state?.error && (
              <p className="text-sm font-medium text-red-500">{state.error}</p>
            )}

            <div className="pt-4">
              <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar Ingreso'}
              </Button>
            </div>
            
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
