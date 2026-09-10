'use client'

import { useState, useTransition } from 'react'
import { updateSpecialRequestStatus } from '@/app/dashboard/actions'
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
  projects?: { name: string }
  profiles?: { full_name: string; role: string }
}

export function SpecialRequestsList({ 
  requests = [], 
  isAdmin = false 
}: { 
  requests: SpecialRequest[]
  isAdmin?: boolean 
}) {
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <Package className="w-3.5 h-3.5" /> Materiales
          </span>
        )
      case 'maquinaria':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <Truck className="w-3.5 h-3.5" /> Maquinaria
          </span>
        )
      case 'herramientas':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Wrench className="w-3.5 h-3.5" /> Herramientas
          </span>
        )
      case 'equipo_pesado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            <HardHat className="w-3.5 h-3.5" /> Equipo Pesado
          </span>
        )
      default:
        return null
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'urgente':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white animate-pulse">🚨 Urgente</span>
      case 'alta':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500 text-white">Alta</span>
      case 'normal':
        return <span className="px-2 py-0.5 rounded text-xs font-medium border border-slate-300 text-slate-700">Normal</span>
      case 'baja':
        return <span className="px-2 py-0.5 rounded text-xs font-medium border border-slate-200 text-slate-500">Baja</span>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> En revisión por Director
          </span>
        )
      case 'aprobada':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprobada
          </span>
        )
      case 'rechazada':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" /> Rechazada
          </span>
        )
      default:
        return null
    }
  }

  const handleStatusUpdate = (requestId: string, newStatus: 'aprobada' | 'rechazada') => {
    startTransition(async () => {
      await updateSpecialRequestStatus(requestId, newStatus, directorComment)
      setCommentingId(null)
      setDirectorComment('')
    })
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Categoría:</span>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'materiales', label: 'Materiales' },
            { id: 'maquinaria', label: 'Maquinaria' },
            { id: 'herramientas', label: 'Herramientas' },
            { id: 'equipo_pesado', label: 'Equipo Pesado' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Estado:</span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pendiente', label: 'Pendientes' },
            { id: 'aprobada', label: 'Aprobadas' },
            { id: 'rechazada', label: 'Rechazadas' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === st.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <CardTitle className="text-lg text-slate-700">No hay solicitudes registradas</CardTitle>
          <CardDescription className="mt-1">
            Usa el botón "Nueva Solicitud Especial" para solicitar materiales o equipos.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map(req => (
            <Card key={req.id} className="flex flex-col justify-between border hover:shadow-md transition-shadow relative overflow-hidden bg-white">
              <div className={`h-1.5 w-full ${
                req.status === 'aprobada' ? 'bg-emerald-500' :
                req.status === 'rechazada' ? 'bg-red-500' : 'bg-amber-500'
              }`} />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  {getCategoryBadge(req.category)}
                  {getUrgencyBadge(req.urgency)}
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 leading-snug">
                  {req.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">
                  <span className="font-semibold text-slate-700">Cantidad:</span> {req.quantity} {req.unit}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {req.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100 italic">
                      "{req.description}"
                    </p>
                  )}

                  <div className="space-y-1 text-xs text-slate-500 pt-2 border-t">
                    {req.projects?.name && (
                      <p><strong className="text-slate-700">Proyecto:</strong> {req.projects.name}</p>
                    )}
                    {req.profiles?.full_name && (
                      <p><strong className="text-slate-700">Solicitado por:</strong> {req.profiles.full_name}</p>
                    )}
                    <p><strong className="text-slate-700">Fecha:</strong> {new Date(req.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(req.status)}
                  </div>

                  {/* Comentario del Director */}
                  {req.director_comment && (
                    <div className="text-xs p-2.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
                      <div className="font-bold flex items-center gap-1 text-blue-700 mb-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Nota del Director:
                      </div>
                      {req.director_comment}
                    </div>
                  )}

                  {/* Acciones para el Director (Admin) */}
                  {isAdmin && (
                    <div className="pt-2 border-t space-y-2">
                      {commentingId === req.id ? (
                        <div className="space-y-2 bg-slate-50 p-3 rounded-lg border">
                          <label className="text-xs font-semibold text-slate-700 block">
                            Comentario para el solicitante (opcional):
                          </label>
                          <Input
                            placeholder="Ej: Aprobado para entrega el viernes..."
                            value={directorComment}
                            onChange={(e) => setDirectorComment(e.target.value)}
                            className="text-xs bg-white"
                          />
                          <div className="flex gap-2 justify-end pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setCommentingId(null); setDirectorComment(''); }}
                              className="text-xs h-8"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleStatusUpdate(req.id, 'rechazada')}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleStatusUpdate(req.id, 'aprobada')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
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
                          className="w-full text-xs h-8 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Responder Solicitud
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
