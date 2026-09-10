'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react'

interface SummaryData {
  statusSummary: string
  keyHighlights: string[]
  riskAlerts: string[]
  recommendations: string[]
}

export function AiProjectSummaryCard({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateSummary = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/project-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })

      const data = await res.json()
      if (res.ok && data.summary) {
        setSummary(data.summary)
      } else {
        setError(data.error || 'Error al generar el diagnóstico con IA')
      }
    } catch (err: any) {
      setError('Error de conexión con el servicio de Inteligencia Artificial.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border border-blue-200/80 shadow-md shadow-blue-500/5 rounded-2xl bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white overflow-hidden">
      <CardHeader className="p-5 sm:p-6 pb-3 border-b border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 ring-1 ring-blue-400/30 backdrop-blur-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-extrabold text-white flex items-center gap-2">
              Diagnóstico Ejecutivo IA
              <span className="text-[10px] font-semibold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                Inteligencia de Obra
              </span>
            </CardTitle>
            <p className="text-xs text-slate-300">
              Análisis automático de bitácoras, gastos acumulados y solicitudes pendientes.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGenerateSummary}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/25 shrink-0 gap-2 text-xs h-10 px-4"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analizando datos de obra...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>{summary ? 'Actualizar Diagnóstico IA' : 'Generar Diagnóstico IA'}</span>
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-medium">
            {error}
          </div>
        )}

        {!summary && !loading && !error && (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-medium text-slate-300">
              Haz clic en el botón superior para obtener un informe sintético generado por Inteligencia Artificial.
            </p>
            <p className="text-xs text-slate-400">
              Evalúa avances recientes, riesgos financieros y recomendaciones estratégicas en segundos.
            </p>
          </div>
        )}

        {summary && (
          <div className="space-y-5 text-xs text-slate-200 animate-in fade-in duration-300">
            {/* Párrafo de Estado */}
            <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-800/50 text-slate-200 text-sm leading-relaxed">
              <strong className="text-blue-300 block text-xs uppercase tracking-wider mb-1">Estado General:</strong>
              {summary.statusSummary}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Logros Clave */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" /> Logros y Avances
                </div>
                <ul className="space-y-1.5 pl-1">
                  {summary.keyHighlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Alertas de Riesgo */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" /> Alertas y Pendientes
                </div>
                <ul className="space-y-1.5 pl-1">
                  {summary.riskAlerts.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recomendaciones */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4" /> Recomendaciones IA
                </div>
                <ul className="space-y-1.5 pl-1">
                  {summary.recommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <span className="text-sky-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
