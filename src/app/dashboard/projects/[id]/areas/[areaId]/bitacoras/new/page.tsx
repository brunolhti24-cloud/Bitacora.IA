'use client'

import { useActionState, use, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { createDailyReport } from '../../../../actions'
import { SignaturePad } from '@/components/signature-pad'
import { AiBitacoraEnhancer } from '@/components/ai-bitacora-enhancer'

const initialState = {
  error: null as string | null,
  success: false as boolean | undefined
}

export default function NewBitacoraAreaPage({ params }: { params: Promise<{ id: string, areaId: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  const areaId = resolvedParams.areaId
  
  const [progressNotes, setProgressNotes] = useState('')

  const createActionWithId = createDailyReport.bind(null, projectId)
  const [state, action, isPending] = useActionState(createActionWithId, initialState)

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/projects/${projectId}/areas/${areaId}`} className="text-sm text-blue-600 hover:underline">
          &larr; Volver al Área
        </Link>
      </div>

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="text-2xl">Nueva Bitácora del Área</CardTitle>
          <CardDescription>
            Reporte diario de actividades específicas de esta área.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <form action={action} className="space-y-6">
            <input type="hidden" name="area_id" value={areaId} />
            
            <div className="space-y-2">
              <Label htmlFor="report_date">Fecha del Reporte *</Label>
              <Input
                id="report_date"
                name="report_date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
                className="w-full text-base"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="progress_notes">Avances y Actividades *</Label>
                <AiBitacoraEnhancer 
                  getDraftNotes={() => progressNotes} 
                  setNotes={(enhanced) => setProgressNotes(enhanced)} 
                />
              </div>
              <textarea
                id="progress_notes"
                name="progress_notes"
                required
                rows={6}
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Escribe aquí las actividades y notas detalladas del avance de la obra..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="physical_progress">Actualizar % Avance Físico Global (Opcional)</Label>
              <Input
                id="physical_progress"
                name="physical_progress"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Ej. 15.5"
                className="w-full text-base"
              />
            </div>

            <SignaturePad name="signature_url" />

            {state?.error && (
              <p className="text-sm font-medium text-red-500">{state.error}</p>
            )}

            <div className="pt-4">
              <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isPending}>
                {isPending ? 'Guardando Reporte...' : 'Registrar Bitácora'}
              </Button>
            </div>
            
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
