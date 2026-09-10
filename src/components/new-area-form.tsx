'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
        + Agregar Nueva Área
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej. Recámara Principal, Baño 1"
        disabled={isPending}
        autoFocus
        className="flex-1"
      />
      <Button type="submit" disabled={isPending || !name.trim()}>
        Guardar
      </Button>
      <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} disabled={isPending}>
        Cancelar
      </Button>
    </form>
  )
}
