'use client'

import { useActionState, use, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { createDailyReport } from '../../actions'
import { SignaturePad } from '@/components/signature-pad'
import { AiBitacoraEnhancer } from '@/components/ai-bitacora-enhancer'
import { createClient } from '@/lib/supabase/client'

const initialState = {
  error: null as string | null,
  success: false as boolean | undefined
}

export default function NewBitacoraPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  
  const [progressNotes, setProgressNotes] = useState('')
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('project_areas')
      .select('id, name')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data) {
          setAreas(data)
          if (data.length > 0) {
            setSelectedAreaId(data[0].id)
          }
        }
      })
  }, [projectId])

  const createActionWithId = createDailyReport.bind(null, projectId)
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
          <CardTitle className="text-2xl">Nueva Bitácora</CardTitle>
          <CardDescription>
            Reporte diario de actividades en obra.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <form action={action} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="area_id">Área o Frente de Trabajo *</Label>
              <select
                id="area_id"
                name="area_id"
                required
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-slate-300 bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-bold"
              >
                <option value="">Selecciona un área...</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
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
            
            <div className="space-y-3">
              <Label htmlFor="progress_notes" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Avances y Actividades *
              </Label>
              
              {/* Módulo con Dictado por Voz, Plantillas de 1 Clic y Mejora con IA */}
              <AiBitacoraEnhancer
                getDraftNotes={() => progressNotes}
                setNotes={(enhanced) => setProgressNotes(enhanced)}
              />

              <textarea
                id="progress_notes"
                name="progress_notes"
                required
                rows={6}
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Escribe aquí las actividades y notas del avance de la obra..."
                className="flex w-full rounded-xl border border-slate-300 bg-background px-3 py-2.5 text-base placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
