'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createArea } from '@/app/dashboard/projects/[id]/actions'

export function NewAreaForm({ projectId }: { projectId: string }) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setIsPending(true)
    const formData = new FormData()
    formData.append('name', name)

    setError(null)
    const res = await createArea(projectId, null, formData)
    setIsPending(false)
    if (res?.error) return setError(res.error)

    setName('')
    setIsAdding(false)
  }

  if (!isAdding) {
    return (
      <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
        + Agregar Nueva Área
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="new-area-name" className="sr-only">Nombre del área</label>
        <Input
          id="new-area-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Recámara Principal, Baño 1"
          disabled={isPending}
          autoFocus
          className="min-w-48 flex-1"
        />
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} disabled={isPending}>
          Cancelar
        </Button>
      </div>
      <p className="text-xs text-slate-500">La portada se elige sola según el nombre. Después puedes poner una foto real desde “Editar área”.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </form>
  )
}
