'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Archive, CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { deleteProject, setProjectStatus } from '@/app/dashboard/actions'
import type { ProjectStatus } from '@/lib/permissions'

const iconButton = 'flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors disabled:opacity-50'

/** Acciones del director sobre una obra: editar, terminar, archivar, reactivar y eliminar. */
export function ProjectActions({ projectId, status = 'activa' }: { projectId: string; status?: ProjectStatus }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const change = (next: ProjectStatus, question: string) => {
    if (!confirm(question)) return
    setError(null)
    startTransition(async () => {
      const res = await setProjectStatus(projectId, next)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-0.5">
        {status === 'activa' ? (
          <>
            <Link
              href={`/dashboard/projects/${projectId}/edit`}
              aria-label="Editar obra"
              title="Editar obra"
              className={`${iconButton} hover:bg-blue-50 hover:text-blue-600`}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              disabled={pending}
              aria-label="Marcar obra como terminada"
              title="Marcar como terminada"
              onClick={() => change('terminada', '¿Marcar esta obra como terminada? Pasará a Archivo con todas sus bitácoras y podrás reactivarla después.')}
              className={`${iconButton} hover:bg-emerald-50 hover:text-emerald-700`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              disabled={pending}
              aria-label="Archivar obra"
              title="Archivar obra"
              onClick={() => change('archivada', '¿Archivar esta obra? Saldrá del tablero y quedará en Archivo con todas sus bitácoras.')}
              className={`${iconButton} hover:bg-slate-100 hover:text-slate-800`}
            >
              <Archive className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => change('activa', '¿Reactivar esta obra? Volverá al tablero de obras en ejecución.')}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-[#144CC9] hover:bg-blue-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reactivar
          </button>
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
      {error && <p role="alert" className="mt-1 max-w-56 text-xs text-red-600">{error}</p>}
    </div>
  )
}
