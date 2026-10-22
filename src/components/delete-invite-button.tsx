'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteInviteButton({ inviteId, inviteCode }: { inviteId: string; inviteCode: string }) {
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
      const { error } = await supabase.from('company_invites').delete().eq('id', inviteId)

      if (error) {
        alert(`Error al revocar invitación: ${error.message}`)
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
        className="flex items-center gap-1 bg-destructive/5 border border-destructive/30 text-destructive text-xs px-2 py-0.5 rounded-lg"
      >
        <span>¿Eliminar?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="font-bold text-destructive hover:text-destructive underline ml-1"
        >
          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Sí'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-muted-foreground hover:text-plano/80 ml-1"
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
      className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md transition-colors"
      title={`Eliminar código de invitación ${inviteCode}`}
      aria-label={`Eliminar código de invitación ${inviteCode}`}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  )
}
