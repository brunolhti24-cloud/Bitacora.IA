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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Firmada por Director
      </span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-sm transition-colors cursor-pointer">
        <FileCheck2 className="w-3.5 h-3.5" /> Firmar y Aprobar (Director)
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Sparkles className="w-5 h-5 text-emerald-600" /> Firma Oficial de Director
          </DialogTitle>
          <DialogDescription>
            Como Director, estampa tu firma digital para validar y cerrar oficialmente esta bitácora de obra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <SignaturePad name="signature_url" />

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6">
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
