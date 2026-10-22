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
          className="h-9 rounded-md bg-plano hover:bg-plano-soft text-white text-sm gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pulido por IA...
            </>
          ) : success ? (
            <>
              <Check className="w-3.5 h-3.5 text-brote" aria-hidden /> Texto mejorado
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-brote" aria-hidden /> Mejorar con IA
            </>
          )}
        </Button>
      </div>

      {/* Plantillas Rápidas de 1 Clic */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs font-semibold text-muted-foreground mr-1">RÁPIDOS:</span>
        <button
          type="button"
          onClick={() => insertTemplate('Colado de estructuras y losa principal.')}
          className="min-h-9 px-3 rounded-full bg-white hover:bg-accent hover:text-obra-strong text-plano/80 text-sm border border-border transition-colors"
        >
          Colado
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('Recepción de material e insumos de construcción.')}
          className="min-h-9 px-3 rounded-full bg-white hover:bg-accent hover:text-obra-strong text-plano/80 text-sm border border-border transition-colors"
        >
          Materiales
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('Excavación y trabajos de cimentación.')}
          className="min-h-9 px-3 rounded-full bg-white hover:bg-accent hover:text-obra-strong text-plano/80 text-sm border border-border transition-colors"
        >
          Cimentación
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('Instalación eléctrica e hidráulica.')}
          className="min-h-9 px-3 rounded-full bg-white hover:bg-accent hover:text-obra-strong text-plano/80 text-sm border border-border transition-colors"
        >
          Instalaciones
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('Limpieza general y retiro de escombros.')}
          className="min-h-9 px-3 rounded-full bg-white hover:bg-accent hover:text-obra-strong text-plano/80 text-sm border border-border transition-colors"
        >
          Limpieza
        </button>
      </div>
    </div>
  )
}
