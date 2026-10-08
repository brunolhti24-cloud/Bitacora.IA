'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquare, X, Send, CheckCircle2, Loader2 } from 'lucide-react'

export function ChatWidget({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')

  const { messages, sendMessage, status, setMessages } = useChat({
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isAdmin) return null // Solo mostrar a admins

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const textToSend = input
    setInput('')
    sendMessage({ text: textToSend })
  }

  // Función auxiliar para extraer texto visible de un mensaje
  function getMessageText(message: any): string {
    let text = ''
    if (message.parts && Array.isArray(message.parts)) {
      text = message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('')

      if (!text.trim()) {
        // Buscar mensajes dentro del output de las herramientas si no hay texto del modelo
        const toolOutputs = message.parts
          .filter((p: any) => (p.type?.startsWith('tool-') || p.type === 'dynamic-tool') && (p.output || p.result))
          .map((p: any) => {
            const out = p.output || p.result
            if (typeof out === 'string') return out
            if (out?.message) return out.message
            if (out?.error) return out.error
            return null
          })
          .filter(Boolean)
          .join('\n')

        if (toolOutputs) text = toolOutputs
      }
    }
    return text || message.content || ''
  }

  // Verificar si un mensaje tiene tool invocations en progreso
  function hasActiveToolCalls(message: any): boolean {
    if (!message.parts) return false
    return message.parts.some(
      (p: any) => (p.type?.startsWith('tool-') || p.type === 'dynamic-tool') && p.state !== 'output-available' && p.state !== 'result' && p.output === undefined
    )
  }

  // Verificar si un mensaje tiene tool invocations completadas
  function hasCompletedToolCalls(message: any): boolean {
    if (!message.parts) return false
    return message.parts.some(
      (p: any) => (p.type?.startsWith('tool-') || p.type === 'dynamic-tool') && (p.state === 'output-available' || p.state === 'result' || p.output !== undefined)
    )
  }

  // Mostrar todos los mensajes que tengan texto O herramientas completadas
  const visibleMessages = messages.filter(m => {
    const text = getMessageText(m)
    if (m.role === 'assistant' && !text.trim() && !hasCompletedToolCalls(m) && !hasActiveToolCalls(m)) {
      return false
    }
    return true
  })

  // Función para renderizar enlaces markdown simples
  function renderMessageText(text: string) {
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-extrabold transition-colors"
        >
          {match[1]}
        </a>
      )
      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return (
    <>
      {/* Botón flotante */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-xl transition-transform hover:scale-110 z-50 bg-blue-600 hover:bg-blue-700 text-white ${isOpen ? 'scale-0' : 'scale-100'}`}
        aria-label="Abrir asistente IA"
      >
        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Ventana de Chat */}
      <Card 
        className={`fixed inset-x-3 bottom-3 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px] h-[480px] sm:h-[520px] max-h-[85vh] shadow-2xl flex flex-col z-50 transition-all duration-300 ease-in-out origin-bottom-right rounded-2xl overflow-hidden border border-slate-700/60 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        <CardHeader className="p-4 border-b bg-gray-900 text-white rounded-t-xl flex flex-row justify-between items-center space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Asistente Bitacor.AI
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white hover:bg-gray-800 h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {visibleMessages.length === 0 && !isLoading && (
              <div className="text-center text-sm text-gray-500 mt-10">
                <p>¡Hola! Soy el asistente IA de la constructora.</p>
                <p className="mt-2">Puedes preguntarme cosas como:</p>
                <ul className="mt-2 space-y-1 italic text-xs">
                  <li>"Dime el saldo del proyecto Torre Alta"</li>
                  <li>"¿Cuáles son los últimos reportes del proyecto X?"</li>
                  <li>"En el proyecto X, crea el área Recámara 1"</li>
                </ul>
              </div>
            )}
            
            {visibleMessages.map(m => {
              const text = getMessageText(m)
              const showToolIndicator = m.role === 'assistant' && hasActiveToolCalls(m) && !text.trim()

              if (showToolIndicator) {
                return (
                  <div key={m.id} className="flex flex-col items-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-white border text-gray-500 rounded-bl-none shadow-sm flex items-center gap-2 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      Ejecutando acción en la base de datos...
                    </div>
                  </div>
                )
              }

              if (!text.trim()) return null

              const isUser = m.role === 'user'

              return (
                <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                      isUser 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {isUser ? text : renderMessageText(text)}
                    {m.role === 'assistant' && hasCompletedToolCalls(m) && (
                      <div className="mt-1.5 flex items-center gap-1 text-emerald-600 text-xs font-medium border-t border-slate-100 pt-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Acción ejecutada correctamente
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {isLoading && !messages.some(m => m.role === 'assistant' && hasActiveToolCalls(m)) && (
              <div className="flex items-start">
                <div className="bg-white border text-gray-400 rounded-2xl rounded-bl-none shadow-sm px-4 py-2 text-sm animate-pulse flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  Pensando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulario */}
          <form onSubmit={onSubmit} className="p-3 bg-white border-t">
            <div className="flex relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta o pide una acción..."
                className="pr-10"
                disabled={isLoading}
              />
              <Button type="submit" size="sm" variant="ghost" disabled={isLoading || !input.trim()} className="absolute right-0 top-0 h-full text-blue-600 hover:text-blue-700 hover:bg-transparent disabled:opacity-40">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}

