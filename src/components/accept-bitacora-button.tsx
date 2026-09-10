'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { acceptDailyReport } from '@/app/dashboard/projects/[id]/actions'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function AcceptBitacoraButton({
  reportId,
  projectId,
  areaId
}: {
  reportId: string
  projectId: string
  areaId: string
}) {
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      const res = await acceptDailyReport(reportId, projectId, areaId)
      if (res?.success) {
        setAccepted(true)
      } else if (res?.error) {
        alert(res.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (accepted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <CheckCircle2 className="w-3.5 h-3.5" /> Aceptada por Residente
      </span>
    )
  }

  return (
    <Button
      type="button"
      onClick={handleAccept}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-lg gap-1.5 shadow-sm"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aceptando...
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" /> Aceptar Bitácora
        </>
      )}
    </Button>
  )
}
