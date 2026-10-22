'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { createArea } from '@/app/dashboard/projects/[id]/actions'

export function NewAreaForm({ projectId }: { projectId: string }) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setIsPending(true)
    const formData = new FormData()
    formData.append('name', name)
    
    await createArea(projectId, null, formData)
    
    setIsPending(false)
    setName('')
    setIsAdding(false)
  }

  if (!isAdding) {
    return (
      <Button onClick={() => setIsAdding(true)} variant="ghost" className="h-11 w-full gap-2 text-sm font-semibold text-obra hover:bg-accent hover:text-obra-strong">
        <Plus className="h-4 w-4" aria-hidden />
        Agregar área
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="new-area-name" className="sr-only">Nombre del área</label>
      <Input
        id="new-area-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Recámara principal, baño 1, losa nivel 2…"
        disabled={isPending}
        autoFocus
        className="h-11 flex-1"
      />
      <Button type="submit" disabled={isPending || !name.trim()} className="h-11 px-4">
        {isPending ? 'Guardando…' : 'Guardar área'}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} disabled={isPending} className="h-11 px-4">
        Cancelar
      </Button>
    </form>
  )
}
