'use client'

import { useState, useTransition } from 'react'
import { Archive, RotateCcw } from 'lucide-react'
import { archiveDailyReport } from '@/app/dashboard/projects/[id]/actions'

/** Archiva una bitácora (sale del historial del área y queda en Archivo) o la restaura. */
export function ArchiveReportButton({ reportId, projectId, archived = false }: { reportId: string; projectId: string; archived?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    if (!archived && !confirm('¿Archivar esta bitácora? Saldrá del historial del área y quedará en Archivo; podrás restaurarla.')) return
    setError(null)
    startTransition(async () => {
      const res = await archiveDailyReport(reportId, projectId, !archived)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {archived ? <RotateCcw className="h-3.5 w-3.5" aria-hidden /> : <Archive className="h-3.5 w-3.5" aria-hidden />}
        {pending ? 'Guardando…' : archived ? 'Restaurar' : 'Archivar'}
      </button>
      {error && <span role="alert" className="max-w-48 text-right text-[11px] text-red-600">{error}</span>}
    </span>
  )
}
