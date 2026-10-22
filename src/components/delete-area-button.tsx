'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteAreaButton({ areaId, areaName }: { areaId: string; areaName: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    try {
      setIsDeleting(true)
      const { error } = await supabase.from('project_areas').delete().eq('id', areaId)

      if (error) {
        alert(`Error al eliminar área: ${error.message}`)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      alert(`Error inesperado: ${err.message}`)
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirm(false)
  }

  if (showConfirm) {
    return (
      <div 
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-2 rounded-md border border-destructive/30 bg-white px-3 py-2 text-sm text-destructive shadow-sm z-10"
      >
        <span>¿Eliminar?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="min-h-8 px-1 font-semibold underline hover:text-destructive/80"
        >
          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Sí'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-8 px-1 text-muted-foreground hover:text-plano"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      className="h-10 w-10 p-0 rounded-md bg-plano/75 text-white hover:bg-destructive hover:text-white transition-colors z-10"
      title={`Eliminar área "${areaName}"`}
      aria-label={`Eliminar área ${areaName}`}
    >
      <Trash2 className="w-4 h-4" aria-hidden />
    </Button>
  )
}
