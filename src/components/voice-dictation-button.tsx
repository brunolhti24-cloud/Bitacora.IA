'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Volume2 } from 'lucide-react'

export function VoiceDictationButton({
  getExistingText,
  onTranscript,
  className = '',
  label = 'Dictar por Voz'
}: {
  getExistingText: () => string
  onTranscript: (text: string) => void
  className?: string
  label?: string
}) {
  const [isListening, setIsListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  const getExistingTextRef = useRef(getExistingText)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    getExistingTextRef.current = getExistingText
    onTranscriptRef.current = onTranscript
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        setSupported(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }
    }
  }, [])

  const startListening = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta el reconocimiento por voz. Te sugerimos usar Google Chrome o Edge.')
      return
    }

    try {
      // Abortar cualquier instancia previa
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }

      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'es-MX'

      rec.onstart = () => {
        setIsListening(true)
      }

      rec.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' '
          }
        }
        if (transcript) {
          const current = getExistingTextRef.current()
          const separator = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : ''
          onTranscriptRef.current(current + separator + transcript)
        }
      }

      rec.onerror = (event: any) => {
        // 'no-speech' y 'aborted' son eventos normales cuando hay pausas o cancelaciones
        if (event.error === 'no-speech' || event.error === 'aborted') {
          setIsListening(false)
          return
        }

        if (event.error === 'not-allowed') {
          alert('Permiso de micrófono no otorgado. Por favor permite el acceso al micrófono en la barra de tu navegador.')
        } else {
          console.warn('Aviso de micrófono:', event.error)
        }
        setIsListening(false)
      }

      rec.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = rec
      rec.start()
      setIsListening(true)
    } catch (err: any) {
      if (err?.name !== 'InvalidStateError') {
        console.warn('Aviso al iniciar reconocimiento:', err)
      }
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setIsListening(false)
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  if (!supported) return null

  return (
    <Button
      type="button"
      onClick={toggleListening}
      variant={isListening ? "destructive" : "outline"}
      size="sm"
      className={`h-8 rounded-full font-bold text-xs gap-1.5 transition-all shadow-xs ${
        isListening
          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border-red-700'
          : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200 hover:text-blue-600'
      } ${className}`}
    >
      {isListening ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <MicOff className="w-3.5 h-3.5" /> Escuchando... habla ahora
        </>
      ) : (
        <>
          <Mic className="w-3.5 h-3.5 text-blue-600" /> {label}
        </>
      )}
    </Button>
  )
}
