'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, PenTool } from 'lucide-react'

export function SignaturePad({ name = 'signature_url' }: { name?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [signatureData, setSignatureData] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.parentElement?.clientWidth || 400
    canvas.height = 160

    // Setup line styles
    ctx.strokeStyle = '#0f172a' // Slate 900
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
    setSignatureData(canvas.toDataURL('image/png'))
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas && hasSignature) {
      setSignatureData(canvas.toDataURL('image/png'))
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    setSignatureData('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <PenTool className="w-4 h-4 text-blue-600" /> Firma Digital del Responsable *
        </label>
        {hasSignature && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 px-2"
          >
            <Eraser className="w-3 h-3" /> Limpiar firma
          </Button>
        )}
      </div>

      <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-40 cursor-crosshair touch-none"
        />

        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-medium">
            Dibuja tu firma aquí con el mouse o dedo ✍️
          </div>
        )}

        <div className="absolute bottom-2 left-4 right-4 pointer-events-none border-b border-slate-300" />
      </div>

      <input type="hidden" name={name} value={signatureData} />
    </div>
  )
}
