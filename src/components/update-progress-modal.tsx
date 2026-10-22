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
            className="h-11 shrink-0 gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-plano transition-colors hover:bg-white/85"
          >
            Actualizar avance
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[400px] rounded-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-plano">
              <Activity className="h-5 w-5 text-obra" />
              Actualizar avance físico
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajusta manualmente el porcentaje general de avance acumulado en la obra.
            </DialogDescription>
          </DialogHeader>

          {state?.error && (
            <div className="mt-2 rounded-md bg-destructive/5 p-3 text-xs font-medium text-destructive border border-destructive/30">
              {state.error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="physical_progress">
                  Porcentaje de avance físico (%)
                </Label>
                <span className="text-lg font-black text-obra">
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
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              {/* Campo numérico manual */}
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
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
                  className="pl-9 h-11 bg-muted/40 border-border rounded-md font-bold text-plano text-base"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-md">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-obra hover:bg-obra-strong text-white font-bold rounded-md px-6 gap-2">
              {isPending ? (
                'Guardando…'
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
