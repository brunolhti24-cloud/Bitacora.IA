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
        className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded-lg z-10"
      >
        <span>¿Eliminar?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="font-bold text-red-600 hover:text-red-800 underline ml-1"
        >
          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Sí'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-slate-500 hover:text-slate-700 ml-1"
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
      className="h-8 w-8 p-0 text-slate-300 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors z-10"
      title={`Eliminar área "${areaName}"`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
