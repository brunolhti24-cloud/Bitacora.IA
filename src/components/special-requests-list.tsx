'use client'

import { formatDateOnly, formatDateTime, todayInObra } from '@/lib/dates'
import { useState, useTransition } from 'react'
import { updateSpecialRequestStatus, advanceSpecialRequest } from '@/app/dashboard/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Package, Truck, Wrench, HardHat, Clock, CheckCircle2, XCircle, AlertCircle, MessageSquare } from 'lucide-react'

export interface SpecialRequest {
  id: string
  project_id: string
  category: 'materiales' | 'maquinaria' | 'herramientas' | 'equipo_pesado'
  title: string
  description?: string
  quantity: number
  unit: string
  urgency: 'baja' | 'normal' | 'alta' | 'urgente'
  status: 'pendiente' | 'aprobada' | 'rechazada'
  director_comment?: string
  created_at: string
  needed_by?: string | null
  stage?: 'aprobada' | 'comprada' | 'entregada' | 'recibida' | null
  events?: { stage: string; note: string | null; created_at: string; actor: { full_name: string | null } | null }[]
  projects?: { name: string }
  profiles?: { full_name: string; role: string }
}

const TRACK: { stage: string; label: string }[] = [
  { stage: 'solicitada', label: 'Solicitada' },
  { stage: 'aprobada', label: 'Aprobada' },
  { stage: 'comprada', label: 'Comprada' },
  { stage: 'entregada', label: 'Entregada en obra' },
  { stage: 'recibida', label: 'Recibida' },
]
const NEXT: Record<string, { stage: 'comprada' | 'entregada' | 'recibida'; action: string; roles: string[] }> = {
  aprobada: { stage: 'comprada', action: 'Registrar compra', roles: ['admin', 'director', 'administracion'] },
  comprada: { stage: 'entregada', action: 'Registrar entrega en obra', roles: ['admin', 'director', 'administracion', 'residente'] },
  entregada: { stage: 'recibida', action: 'Confirmar recepción', roles: ['admin', 'director', 'residente'] },
}

function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86400000)
}

export function SpecialRequestsList({
  requests = [],
  isAdmin = false,
  userRole = '',
}: {
  requests: SpecialRequest[]
  isAdmin?: boolean
  userRole?: string
}) {
  const today = todayInObra()
  const [stageError, setStageError] = useState<{ id: string; message: string } | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [commentingId, setCommentingId] = useState<string | null>(null)
  const [directorComment, setDirectorComment] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const filteredRequests = requests.filter(req => {
    if (filterCategory !== 'all' && req.category !== filterCategory) return false
    if (filterStatus !== 'all' && req.status !== filterStatus) return false
    return true
  })

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'materiales':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-obra-strong">
            <Package className="w-3.5 h-3.5" aria-hidden /> Materiales
          </span>
        )
      case 'maquinaria':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-senal-soft text-senal">
            <Truck className="w-3.5 h-3.5" aria-hidden /> Maquinaria
          </span>
        )
      case 'herramientas':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-ok-soft text-ok">
            <Wrench className="w-3.5 h-3.5" aria-hidden /> Herramientas
          </span>
        )
      case 'equipo_pesado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-plano">
            <HardHat className="w-3.5 h-3.5" aria-hidden /> Equipo pesado
          </span>
        )
      default:
        return null
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'urgente':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-destructive text-white">Urgente</span>
      case 'alta':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-senal text-white">Alta</span>
      case 'normal':
        return <span className="px-2 py-0.5 rounded text-xs font-medium border border-junta text-plano/80">Normal</span>
      case 'baja':
        return <span className="px-2 py-0.5 rounded text-xs font-medium border border-border text-muted-foreground">Baja</span>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-senal-soft text-senal border border-senal/30">
            <Clock className="w-3.5 h-3.5 text-senal" aria-hidden /> En revisión del director
          </span>
        )
      case 'aprobada':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-ok-soft text-ok border border-ok/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok" aria-hidden /> Aprobada
          </span>
        )
      case 'rechazada':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-destructive/5 text-destructive border border-destructive/30">
            <XCircle className="w-3.5 h-3.5 text-destructive" aria-hidden /> Rechazada
          </span>
        )
      default:
        return null
    }
  }

  const handleStatusUpdate = (requestId: string, newStatus: 'aprobada' | 'rechazada') => {
    startTransition(async () => {
      const res = await updateSpecialRequestStatus(requestId, newStatus, directorComment)
      if (res?.error) return setStageError({ id: requestId, message: res.error })
      setCommentingId(null)
      setDirectorComment('')
    })
  }

  const handleAdvance = (requestId: string, stage: 'comprada' | 'entregada' | 'recibida') => {
    setStageError(null)
    startTransition(async () => {
      const res = await advanceSpecialRequest(requestId, stage)
      if (res?.error) setStageError({ id: requestId, message: res.error })
    })
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-2">Categoría:</span>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'materiales', label: 'Materiales' },
            { id: 'maquinaria', label: 'Maquinaria' },
            { id: 'herramientas', label: 'Herramientas' },
            { id: 'equipo_pesado', label: 'Equipo pesado' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              aria-pressed={filterCategory === cat.id}
              className={`min-h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                filterCategory === cat.id
                  ? 'bg-plano text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-2">Estado:</span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pendiente', label: 'Pendientes' },
            { id: 'aprobada', label: 'Aprobadas' },
            { id: 'rechazada', label: 'Rechazadas' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              aria-pressed={filterStatus === st.id}
              className={`min-h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                filterStatus === st.id
                  ? 'bg-senal text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de solicitudes */}
      {filteredRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" aria-hidden />
          <CardTitle className="text-lg text-plano/80">No hay solicitudes registradas</CardTitle>
          <CardDescription className="mt-1">
            Usa “Nueva solicitud” para pedir materiales, maquinaria o equipo con la fecha en que se necesitan.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map(req => (
            <Card key={req.id} className="relative flex flex-col justify-between overflow-hidden bg-white pt-0">
              <div className={`h-1.5 w-full ${
                req.status === 'aprobada' ? 'bg-ok' :
                req.status === 'rechazada' ? 'bg-destructive' : 'bg-senal'
              }`} />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  {getCategoryBadge(req.category)}
                  {getUrgencyBadge(req.urgency)}
                </div>
                <CardTitle className="text-lg font-bold text-plano leading-snug">
                  {req.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded w-fit border border-border">
                  <span className="font-semibold text-plano/80">Cantidad:</span> {req.quantity} {req.unit}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {req.description && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-md border border-border italic">
                      “{req.description}”
                    </p>
                  )}

                  <div className="space-y-1 text-xs text-muted-foreground pt-2 border-t">
                    {req.projects?.name && (
                      <p><strong className="text-plano/80">Proyecto:</strong> {req.projects.name}</p>
                    )}
                    {req.profiles?.full_name && (
                      <p><strong className="text-plano/80">Solicitado por:</strong> {req.profiles.full_name}</p>
                    )}
                    <p><strong className="text-plano/80">Solicitada:</strong> {formatDateTime(req.created_at)}</p>
                  </div>

                  {req.needed_by && (() => {
                    const d = daysUntil(req.needed_by, today)
                    const done = req.stage === 'recibida' || req.status === 'rechazada'
                    const late = !done && d < 0
                    return (
                      <p className={`rounded-md px-2.5 py-1.5 text-sm ${late ? 'bg-destructive/10 font-semibold text-destructive' : !done && d <= 2 ? 'bg-senal-soft text-senal' : 'bg-muted text-plano'}`}>
                        Se necesita el {formatDateOnly(req.needed_by, { day: 'numeric', month: 'short', year: 'numeric' })}
                        {!done && (late ? ` · atrasada ${-d} ${-d === 1 ? 'día' : 'días'}` : d === 0 ? ' · hoy' : ` · faltan ${d} ${d === 1 ? 'día' : 'días'}`)}
                      </p>
                    )
                  })()}
                </div>

                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(req.status)}
                  </div>

                  {/* Seguimiento: cada etapa con quién y cuándo */}
                  {req.status !== 'rechazada' && (
                    <ol className="space-y-1.5" aria-label="Seguimiento de la solicitud">
                      {TRACK.map((step) => {
                        const ev = [...(req.events || [])].reverse().find((e) => e.stage === step.stage)
                        const reached = !!ev || (step.stage === 'solicitada') || (step.stage === 'aprobada' && req.status === 'aprobada')
                        return (
                          <li key={step.stage} className="flex items-start gap-2 text-xs">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${reached ? 'bg-ok' : 'bg-junta'}`} aria-hidden />
                            <span className={reached ? 'text-plano' : 'text-muted-foreground'}>
                              <strong className="font-semibold">{step.label}</strong>
                              {ev ? ` · ${ev.actor?.full_name || 'Sin nombre'}, ${formatDateTime(ev.created_at)}` : reached ? '' : ' · pendiente'}
                              {ev?.note && step.stage !== 'aprobada' && <span className="block text-muted-foreground">{ev.note}</span>}
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  )}

                  {req.status === 'aprobada' && NEXT[req.stage || 'aprobada'] && NEXT[req.stage || 'aprobada'].roles.includes(userRole) && (
                    <Button
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleAdvance(req.id, NEXT[req.stage || 'aprobada'].stage)}
                      className="w-full"
                    >
                      {NEXT[req.stage || 'aprobada'].action}
                    </Button>
                  )}

                  {stageError?.id === req.id && (
                    <p role="alert" className="text-sm text-destructive">{stageError.message}</p>
                  )}

                  {/* Comentario del Director */}
                  {req.director_comment && (
                    <div className="text-xs p-2.5 rounded-lg bg-accent text-obra-strong border border-obra/25">
                      <div className="font-bold flex items-center gap-1 text-obra-strong mb-1">
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden /> Nota del director
                      </div>
                      {req.director_comment}
                    </div>
                  )}

                  {/* Acciones para el Director (Admin) */}
                  {isAdmin && req.status === 'pendiente' && (
                    <div className="pt-2 border-t space-y-2">
                      {commentingId === req.id ? (
                        <div className="space-y-2 bg-muted/50 p-3 rounded-lg border">
                          <label htmlFor={`comment-${req.id}`} className="text-sm font-semibold text-plano block">
                            Comentario para quien solicita <span className="font-normal text-muted-foreground">(opcional)</span>
                          </label>
                          <Input
                            id={`comment-${req.id}`}
                            placeholder="Aprobado, se entrega el viernes"
                            value={directorComment}
                            onChange={(e) => setDirectorComment(e.target.value)}
                            className="text-xs bg-white"
                          />
                          <div className="flex gap-2 justify-end pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setCommentingId(null); setDirectorComment(''); }}
                              className="h-10 text-sm"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleStatusUpdate(req.id, 'rechazada')}
                              className="bg-destructive hover:bg-destructive/90 text-white h-10 text-sm"
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleStatusUpdate(req.id, 'aprobada')}
                              className="bg-ok hover:bg-ok/90 text-white h-10 text-sm"
                            >
                              Aprobar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCommentingId(req.id)}
                          className="w-full h-10 text-sm border-border hover:bg-muted/50 text-plano/80 font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-ok" aria-hidden /> Responder solicitud
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
