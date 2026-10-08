'use client'

import { useState, useActionState, useEffect } from 'react'
import { createExpense } from '@/app/dashboard/projects/[id]/actions'
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
import { 
  Receipt, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  Loader2, 
  Image as ImageIcon 
} from 'lucide-react'

interface Project {
  id: string
  name: string
}

export function NewTicketModal({
  projectId,
  projects = [],
  buttonText = 'Subir Ticket de Gasto'
}: {
  projectId?: string
  projects?: Project[]
  buttonText?: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || projects[0]?.id || '')
  
  // Estados para auto-llenado con IA
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Materiales')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)

  const actionWithProjectId = createExpense.bind(null, selectedProjectId)
  const [state, action, isPending] = useActionState(actionWithProjectId, null)

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
      setImagePreview(null)
      setSelectedFile(null)
      setConcept('')
      setAmount('')
    }
  }, [state])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    if (parts.length > 2) parts.pop()
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    if (parts[1]) parts[1] = parts[1].slice(0, 2)
    setAmount(parts.join('.'))
  }

  // Función para escanear el ticket con GPT-4o Vision
  const handleScanTicketWithAI = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona primero una imagen del ticket.')
      return
    }

    setScanning(true)
    setScanMessage(null)

    try {
      // Convertir archivo a base64
      const reader = new FileReader()
      reader.readAsDataURL(selectedFile)
      reader.onload = async () => {
        const base64String = reader.result as string

        const res = await fetch('/api/ai/scan-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64String })
        })

        const data = await res.json()
        if (res.ok && data.ticketData) {
          const { concept: aiConcept, amount: aiAmount, category: aiCategory, date: aiDate } = data.ticketData
          if (aiConcept) setConcept(aiConcept)
          if (aiAmount) setAmount(String(aiAmount))
          if (aiCategory) setCategory(aiCategory)
          if (aiDate) setExpenseDate(aiDate)
          setScanMessage('✨ ¡Datos extraídos automáticamente del ticket!')
        } else {
          alert(data.error || 'No se pudo leer el ticket con IA.')
        }
        setScanning(false)
      }
    } catch (err: any) {
      alert('Error de lectura con la IA')
      setScanning(false)
    }
  }

  const selectClasses = "flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:bg-white focus:border-blue-500 focus:outline-none"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm">
            <Receipt className="h-4 w-4" />
            {buttonText}
          </Button>
        }
      />
      <DialogContent className="w-[95vw] sm:max-w-[520px] rounded-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <form action={action}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Registrar Ticket de Gasto
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sube la foto de tu comprobante y usa IA para autollenar los campos al instante.
            </DialogDescription>
          </DialogHeader>

          {state?.error && (
            <div className="mt-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
              {state.error}
            </div>
          )}

          {scanMessage && (
            <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-700 border border-blue-200">
              {scanMessage}
            </div>
          )}

          <div className="grid gap-4 py-4">
            {/* Selección de Proyecto si aplica */}
            {!projectId && projects.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="project_id" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Proyecto u Obra *
                </Label>
                <select
                  id="project_id"
                  className={selectClasses}
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Foto del Ticket + Botón Escanear con IA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="receipt" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Foto del Comprobante / Ticket *
                </Label>
                
                {selectedFile && (
                  <Button
                    type="button"
                    onClick={handleScanTicketWithAI}
                    disabled={scanning}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                        Leyendo ticket...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-blue-600" />
                        Escanear con IA
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                {imagePreview ? (
                  <div className="h-16 w-20 rounded-lg overflow-hidden border bg-white shrink-0">
                    <img src={imagePreview} alt="Ticket Preview" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <Input
                    id="receipt"
                    name="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleImageChange}
                    className="text-xs cursor-pointer file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  <p className="text-[11px] text-slate-500">Selecciona la foto y presiona 'Escanear con IA'.</p>
                </div>
              </div>
            </div>

            {/* Concepto del Gasto */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Concepto / Descripción del Ticket *
              </Label>
              <input type="hidden" name="concept" value={concept} />
              <Input
                id="description"
                name="description"
                placeholder="Ej. Compra de 10 bultos cemento, Diésel camioneta..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                required
                className="h-11 bg-slate-50/50 border-slate-200 rounded-xl"
              />
            </div>

            {/* Monto y Fecha en 2 columnas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Monto ($ MXN) *
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input type="hidden" name="amount" value={amount.replace(/,/g, '')} />
                  <Input
                    id="amount_display"
                    type="text"
                    placeholder="0.00"
                    value={amount}
                    onChange={handleAmountChange}
                    required
                    className="pl-9 h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense_date" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Fecha del Ticket *
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <Input
                    id="expense_date"
                    name="expense_date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                    className="pl-9 h-11 bg-slate-50/50 border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Categoría */}
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Categoría *
              </Label>
              <select 
                id="category" 
                name="category" 
                className={selectClasses} 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Materiales">🧱 Materiales de Construcción</option>
                <option value="Mano de Obra">👷 Mano de Obra / Salarios</option>
                <option value="Herramientas">🛠️ Herramientas y Equipamiento</option>
                <option value="Combustible">⛽ Combustible y Viáticos</option>
                <option value="Varios">📦 Gastos Varios</option>
              </select>
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6">
              {isPending ? 'Guardando Ticket...' : 'Registrar Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
