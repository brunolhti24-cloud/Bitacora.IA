'use client'

import { deleteProject } from '@/app/dashboard/actions'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

export function ProjectActions({ projectId }: { projectId: string }) {
  return (
    <div className="flex items-center gap-1 z-10 relative" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/dashboard/projects/${projectId}/edit`}
        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
        title="Editar proyecto"
      >
        <Pencil className="w-4 h-4" />
      </Link>
      <form action={deleteProject}>
        <input type="hidden" name="id" value={projectId} />
        <button
          type="submit"
          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          title="Eliminar proyecto"
          onClick={(e) => {
            if (!confirm('¿Estás seguro de eliminar este proyecto permanentemente?')) {
              e.preventDefault()
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
