'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-white">
            Algo no cargó correctamente
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            Ocurrió un error al cargar la información. Puedes intentar recargar la página o volver al panel de control.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/30"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
