'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCircle2, AlertCircle, Info, ExternalLink, Check, Trash2, X } from 'lucide-react'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  link?: string
  read: boolean
  created_at: string
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Obtener notificaciones al cargar
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setNotifications(data)
      }
    } catch (err) {
      console.error('Error cargando notificaciones:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Suscripción a cambios en tiempo real en la tabla notifications
    const channel = supabase
      .channel('realtime:user_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotif = payload.new as NotificationItem
          setNotifications((prev) => [newNotif, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = async (id: string, link?: string) => {
    // Actualizar estado local primero
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

    // Actualizar en Supabase
    await supabase.from('notifications').update({ read: true }).eq('id', id)

    if (link) {
      setIsOpen(false)
      router.push(link)
    }
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  }

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-ok shrink-0 mt-0.5" />
      default:
        return <Info className="w-5 h-5 text-obra shrink-0 mt-0.5" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de la Campanita */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-senal border-2 border-plano" />
        )}
      </button>

      {/* Panel Desplegable de Notificaciones */}
      {isOpen && (
        <>
          {/* Backdrop para móvil */}
          <div
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3 top-14 z-50 max-w-sm mx-auto sm:max-w-none sm:mx-0 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-lg bg-white text-foreground shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-bold text-plano text-sm">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="bg-accent text-obra-strong text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-obra hover:text-obra-strong font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Check className="w-3.5 h-3.5" /> Marcar leídas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-plano"
                  aria-label="Cerrar notificaciones"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground font-medium">Cargando alertas…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-muted-foreground">Al día con todo</p>
                <p className="text-xs text-muted-foreground">No tienes notificaciones pendientes.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id, notif.link)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-muted/50 transition-colors cursor-pointer relative group ${
                    !notif.read ? 'bg-accent/40 font-medium' : ''
                  }`}
                >
                  {getIcon(notif.type)}

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-plano truncate">{notif.title}</p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-obra shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        {new Date(notif.created_at).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {notif.link && (
                        <span className="text-xs text-obra font-semibold flex items-center gap-0.5 hover:underline">
                          Ver detalles <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => deleteNotification(e, notif.id)}
                    className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </>
    )}
    </div>
  )
}
