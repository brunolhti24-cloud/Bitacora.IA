'use client'

import { deleteProject } from '@/app/dashboard/actions'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

export function ProjectActions({ projectId }: { projectId: string }) {
  return (
    <div className="flex items-center gap-1 z-10 relative" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/dashboard/projects/${projectId}/edit`}
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-obra"
        title="Editar obra"
        aria-label="Editar obra"
      >
        <Pencil className="w-4 h-4" aria-hidden />
      </Link>
      <form action={deleteProject}>
        <input type="hidden" name="id" value={projectId} />
        <button
          type="submit"
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Eliminar obra"
          aria-label="Eliminar obra"
          onClick={(e) => {
            if (!confirm('¿Eliminar esta obra permanentemente? Esta acción no se puede deshacer.')) {
              e.preventDefault()
            }
          }}
        >
          <Trash2 className="w-4 h-4" aria-hidden />
        </button>
      </form>
    </div>
  )
}
