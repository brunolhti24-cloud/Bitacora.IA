'use client'

import { useState, useActionState, useEffect } from 'react'
import { updateProjectProgress } from '@/app/dashboard/projects/[id]/actions'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Percent, Save, Activity } from 'lucide-react'

export function UpdateProgressModal({
  projectId,
  currentProgress
}: {
  projectId: string
  currentProgress: number
}) {
  const [open, setOpen] = useState(false)
  const [progressValue, setProgressValue] = useState(currentProgress)

  const actionWithId = updateProjectProgress.bind(null, projectId)
  const [state, action, isPending] = useActionState(actionWithId, null)

  useEffect(() => {
    setProgressValue(currentProgress)
  }, [currentProgress])

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button 
            variant="default" 
            size="sm" 
            className="gap-1.5 text-xs font-semibold text-white bg-[#144CC9] hover:bg-blue-700 rounded-full shadow-sm transition-all h-9 px-4 shrink-0"
          >
            Editar Avance
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[400px] rounded-2xl">
        <form action={action}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Activity className="h-5 w-5 text-blue-600" />
              Actualizar Avance Físico
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ajusta manualmente el porcentaje general de avance acumulado en la obra.
            </DialogDescription>
          </DialogHeader>

          {state?.error && (
            <div className="mt-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
              {state.error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="physical_progress" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Porcentaje de Avance Físico (%)
                </Label>
                <span className="text-lg font-black text-blue-600">
                  {progressValue}%
                </span>
              </div>

              {/* Slider de control rápido */}
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              {/* Campo numérico manual */}
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Percent className="h-4 w-4" />
                </div>
                <Input
                  id="physical_progress"
                  name="physical_progress"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  required
                  className="pl-9 h-11 bg-slate-50/50 border-slate-200 rounded-xl font-bold text-slate-900 text-base"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 gap-2">
              {isPending ? (
                'Guardando...'
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar %
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
