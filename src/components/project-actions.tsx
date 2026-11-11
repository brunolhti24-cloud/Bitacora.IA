'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { deleteProject, setProjectStatus } from '@/app/dashboard/actions'
import type { ProjectStatus } from '@/lib/permissions'

const iconButton = 'flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors disabled:opacity-50'
const labelButton = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:opacity-50'

/** Acciones del director sobre una obra: terminar, archivar, reactivar, editar y eliminar. */
export function ProjectActions({ projectId, status = 'activa' }: { projectId: string; status?: ProjectStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const change = (next: ProjectStatus, question: string) => {
    if (!confirm(question)) return
    setError(null)
    startTransition(async () => {
      const res = await setProjectStatus(projectId, next)
      if (res?.error) return setError(res.error)
      // Terminar una obra es un logro: se celebra al llegar a "Terminadas"
      if (next === 'terminada') router.push(`/dashboard/archivo?estado=terminada&logro=${projectId}`)
    })
  }

  return (
    <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {status === 'activa' ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => change('terminada', '¿Marcar esta obra como terminada? Pasará a Terminadas con todas sus bitácoras y podrás reactivarla después.')}
                className={`${labelButton} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Terminar obra
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => change('archivada', '¿Archivar esta obra? Saldrá del tablero y quedará en Archivadas con todas sus bitácoras.')}
                className={`${labelButton} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <Archive className="h-4 w-4" aria-hidden /> Archivar
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => change('activa', '¿Reactivar esta obra? Volverá al tablero de obras en proceso.')}
              className={`${labelButton} border-blue-200 bg-blue-50 text-[#144CC9] hover:bg-blue-100`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Reactivar
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {status === 'activa' && (
            <Link
              href={`/dashboard/projects/${projectId}/edit`}
              aria-label="Editar obra"
              title="Editar obra"
              className={`${iconButton} hover:bg-blue-50 hover:text-blue-600`}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Link>
          )}
          <form action={deleteProject}>
            <input type="hidden" name="id" value={projectId} />
            <button
              type="submit"
              aria-label="Eliminar obra"
              title="Eliminar obra"
              className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
              onClick={(e) => {
                if (!confirm('¿Eliminar esta obra permanentemente? Se borran también sus bitácoras. Si solo quieres quitarla del tablero, archívala.')) {
                  e.preventDefault()
                }
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
