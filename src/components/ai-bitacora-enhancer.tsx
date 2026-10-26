'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { VoiceDictationButton } from '@/components/voice-dictation-button'
import { Sparkles, Loader2, Check, Mic, MicOff } from 'lucide-react'

export function AiBitacoraEnhancer({
  getDraftNotes,
  setNotes,
  areaName,
  projectName
}: {
  getDraftNotes: () => string
  setNotes: (text: string) => void
  areaName?: string
  projectName?: string
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleEnhance = async () => {
    const draft = getDraftNotes()
    if (!draft || draft.trim().length === 0) {
      alert('Por favor dicta con el micrófono o escribe algunas notas borrador primero.')
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      const res = await fetch('/api/ai/enhance-bitacora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftNotes: draft, areaName, projectName })
      })

      const data = await res.json()
      if (res.ok && data.enhancedNotes) {
        setNotes(data.enhancedNotes)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        alert(data.error || 'Error al procesar con IA')
      }
    } catch (err: any) {
      alert('Error de conexión con la IA')
    } finally {
      setLoading(false)
    }
  }

  const insertTemplate = (templateText: string) => {
    const current = getDraftNotes()
    const prefix = current.length > 0 ? `${current}\n• ` : '• '
    setNotes(prefix + templateText)
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between gap-2">
        <VoiceDictationButton
          getExistingText={getDraftNotes}
          onTranscript={setNotes}
          label="Dictar con Micrófono"
        />

        <Button
          type="button"
          onClick={handleEnhance}
          disabled={loading}
          size="sm"
          className="h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pulido por IA...
            </>
          ) : success ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" /> ¡Reporte Pulido!
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Mejorar con IA
            </>
          )}
        </Button>
      </div>

      {/* Plantillas Rápidas de 1 Clic */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">RÁPIDOS:</span>
        <button
          type="button"
          onClick={() => insertTemplate('Colado de estructuras y losa principal.')}
          className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-xs border border-slate-200 transition-colors"
        >
          🧱 Colado
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('Recepción de material e insumos de construcción.')}
          className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-xs border border-slate-200 transition-colors"
        >
          📦 Materiales
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('Excavación y trabajos de cimentación.')}
          className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-xs border border-slate-200 transition-colors"
        >
          🔨 Cimentación
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('Instalación eléctrica e hidráulica.')}
          className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-xs border border-slate-200 transition-colors"
        >
          ⚡ Instalaciones
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('Limpieza general y retiro de escombros.')}
          className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-xs border border-slate-200 transition-colors"
        >
          🧹 Limpieza
        </button>
      </div>
    </div>
  )
}
