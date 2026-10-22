'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react'

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
    <Card className="plano-grid bg-plano rounded-lg border-0 text-white overflow-hidden">
      <CardHeader className="p-5 sm:p-6 pb-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brote/15 text-brote">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-white">
              Diagnóstico de la obra con IA
            </CardTitle>
            <p className="text-sm text-white/70">
              Análisis automático de bitácoras, gastos acumulados y solicitudes pendientes.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGenerateSummary}
          disabled={loading}
          className="h-11 shrink-0 gap-2 rounded-md bg-brote px-4 text-sm font-semibold text-plano hover:bg-brote/85"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>Analizando la obra…</span>
            </>
          ) : (
            <>
              <span>{summary ? 'Actualizar diagnóstico' : 'Generar diagnóstico'}</span>
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {error && (
          <div role="alert" className="rounded-md border border-[#FCA5A5]/40 bg-destructive/25 p-3 text-sm text-[#FECACA]">
            {error}
          </div>
        )}

        {!summary && !loading && !error && (
          <div className="py-4 space-y-1">
            <p className="text-sm text-white/80">
              Genera un resumen de las bitácoras recientes, los gastos y las solicitudes pendientes.
            </p>
            <p className="text-sm text-white/60">
              Incluye avances, riesgos y recomendaciones.
            </p>
          </div>
        )}

        {summary && (
          <div className="space-y-5 text-sm text-white/85 animate-in fade-in duration-300">
            {/* Párrafo de Estado */}
            <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/90">
              <strong className="mb-1 block text-sm text-brote">Estado general</strong>
              {summary.statusSummary}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Logros Clave */}
              <div className="space-y-2 rounded-md border border-white/10 bg-plano/70 p-4">
                <div className="flex items-center gap-1.5 text-[#86EFAC] font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Avances
                </div>
                <ul className="space-y-1.5 pl-1">
                  {summary.keyHighlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-sm text-white/80">
                      <span className="text-[#86EFAC] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Alertas de Riesgo */}
              <div className="space-y-2 rounded-md border border-white/10 bg-plano/70 p-4">
                <div className="flex items-center gap-1.5 text-[#FDBA74] font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" aria-hidden /> Riesgos y pendientes
                </div>
                <ul className="space-y-1.5 pl-1">
                  {summary.riskAlerts.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-sm text-white/80">
                      <span className="text-[#FDBA74] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recomendaciones */}
              <div className="space-y-2 rounded-md border border-white/10 bg-plano/70 p-4">
                <div className="flex items-center gap-1.5 text-brote font-semibold text-sm">
                  <Lightbulb className="h-4 w-4" aria-hidden /> Recomendaciones
                </div>
                <ul className="space-y-1.5 pl-1">
                  {summary.recommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-sm text-white/80">
                      <span className="text-brote font-bold">•</span>
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
