'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { formatDateOnly, todayInObra } from '@/lib/dates'

/**
 * Fecha de la bitácora. Si es anterior al inicio de obra registrado, avisa y pide
 * justificarla como actividad preliminar en las notas.
 */
export function ReportDateField({ projectId }: { projectId: string }) {
  const [date, setDate] = useState(todayInObra())
  const [startDate, setStartDate] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .from('projects')
      .select('start_date')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => setStartDate(data?.start_date || null))
  }, [projectId])

  const beforeStart = !!startDate && !!date && date < startDate

  return (
    <div className="space-y-2">
      <Label htmlFor="report_date">Fecha del Reporte *</Label>
      <Input
        id="report_date"
        name="report_date"
        type="date"
        value={date}
        max={todayInObra()}
        onChange={(e) => setDate(e.target.value)}
        required
        aria-describedby={beforeStart ? 'report_date_warning' : undefined}
        className="w-full text-base"
      />
      {beforeStart && (
        <p id="report_date_warning" role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Esta fecha es anterior al inicio de obra registrado ({formatDateOnly(startDate!)}). Se marcará como
            actividad preliminar: explica en las notas qué se hizo antes del inicio.
          </span>
        </p>
      )}
    </div>
  )
}
