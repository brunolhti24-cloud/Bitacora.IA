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
    <div className="plano-grid flex min-h-screen items-center justify-center p-6 text-white">
      <div role="alert" className="w-full max-w-md space-y-6 rounded-lg border border-white/15 bg-plano p-8">
        <AlertTriangle className="h-8 w-8 text-senal" aria-hidden />

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold">Esta página no cargó</h2>
          <p className="text-sm text-white/70">
            Hubo un error al traer la información. Vuelve a intentarlo; si sigue fallando, regresa a tus obras y entra de nuevo.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => reset()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-plano transition-colors hover:bg-white/85"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Home className="h-4 w-4" aria-hidden />
            Ir a mis obras
          </Link>
        </div>
      </div>
    </div>
  )
}
