'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SignaturePad } from '@/components/signature-pad'
import { signDailyReport } from '@/app/dashboard/projects/[id]/actions'
import { FileCheck2, Loader2, Sparkles } from 'lucide-react'

export function SignBitacoraModal({
  reportId,
  projectId,
  areaId
}: {
  reportId: string
  projectId: string
  areaId: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [signed, setSigned] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const signatureUrl = formData.get('signature_url') as string

    if (!signatureUrl) {
      alert('Por favor dibuja tu firma antes de aprobar la bitácora.')
      setLoading(false)
      return
    }

    try {
      const res = await signDailyReport(reportId, projectId, areaId, signatureUrl)
      if (res?.success) {
        setSigned(true)
        setOpen(false)
      } else if (res?.error) {
        alert(res.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (signed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-ok-soft text-ok border border-ok/30">
        <FileCheck2 className="w-3.5 h-3.5 text-ok" /> Firmada por Director
      </span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-ok px-3.5 text-sm font-semibold text-white transition-colors hover:bg-ok/90">
        <FileCheck2 className="h-4 w-4" aria-hidden /> Firmar y aprobar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-ok">
            <Sparkles className="w-5 h-5 text-ok" /> Firma oficial de director
          </DialogTitle>
          <DialogDescription>
            Como Director, estampa tu firma digital para validar y cerrar oficialmente esta bitácora de obra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <SignaturePad name="signature_url" />

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-md">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-ok hover:bg-ok/90 text-white font-bold rounded-md px-6">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Firmando...
                </>
              ) : (
                'Confirmar y Firmar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
