import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NewTicketModal } from '@/components/new-ticket-modal'
import { ExportExpensesButton } from '@/components/export-expenses-button'
import Link from 'next/link'
import { Receipt, DollarSign, TrendingDown, TrendingUp, Calendar, User, ExternalLink, Image as ImageIcon } from 'lucide-react'

export async function FinanceTab({ projectId, baseBudget, isAdmin }: { projectId: string, baseBudget: number, isAdmin: boolean }) {
  const supabase = await createClient()

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, profiles:recorded_by(full_name)')
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false })

  const { data: incomes } = isAdmin ? await supabase
    .from('incomes')
    .select('*, profiles(full_name)')
    .eq('project_id', projectId)
    .order('income_date', { ascending: false }) : { data: [] }

  const totalExpenses = expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0
  const totalIncomes = incomes?.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0) || 0
  const availableBalance = baseBudget + totalIncomes - totalExpenses

  const exportItems = (expenses || []).map((exp: any) => ({
    id: exp.id,
    concept: exp.concept,
    amount: exp.amount,
    expense_date: exp.expense_date,
    created_by_name: exp.profiles?.full_name,
    category: exp.category
  }))

  return (
    <div className="space-y-6">
      {/* Resumen Financiero */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Presupuesto Base + Ingresos
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">
              ${(baseBudget + totalIncomes).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Gastos Totales (Tickets)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600 flex items-center gap-1">
              <TrendingDown className="h-5 w-5" />
              -${totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Saldo Disponible
            </CardDescription>
            <CardTitle className={`text-2xl font-bold ${availableBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              ${availableBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Sección de Gastos y Tickets */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                Tickets y Comprobantes de Gastos
              </h3>
              <p className="text-xs text-slate-500">Registrados por residentes, administradores y subcontratistas</p>
            </div>
            
            {/* Modal para Subir Ticket desde Usuario y Admin */}
            <div className="flex flex-wrap items-center gap-2">
              <ExportExpensesButton expenses={exportItems} title="Reporte de Contabilidad y Tickets de la Obra" />
              <NewTicketModal projectId={projectId} buttonText="+ Subir Ticket" />
            </div>
          </div>
          
          {expenses?.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No hay tickets de gastos registrados.</p>
              <p className="text-xs text-slate-400 mt-0.5">Utiliza el botón superior para subir el primer comprobante.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses?.map((exp) => (
                <Card key={exp.id} className="p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all rounded-xl bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {exp.receipt_url ? (
                      <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="h-12 w-12 rounded-lg border overflow-hidden shrink-0 bg-slate-100 group relative block">
                        <img src={exp.receipt_url} alt="Comprobante" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      </a>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Receipt className="h-6 w-6" />
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">
                        {exp.description || exp.concept}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {exp.category || 'Gasto'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('es-MX') : 'Sin fecha'}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <User className="h-3 w-3" />
                          {exp.profiles?.full_name || 'Usuario'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 pt-2 sm:pt-0">
                    <p className="font-extrabold text-red-600 text-base">
                      -${(Number(exp.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>

                    {exp.receipt_url && (
                      <a 
                        href={exp.receipt_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline mt-0.5"
                      >
                        Ver comprobante <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Ingresos / Anticipos (Solo Admin) */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Ingresos y Anticipos de Cliente
                </h3>
                <p className="text-xs text-slate-500">Manejo de flujo de caja y aportaciones</p>
              </div>

              <Link href={`/dashboard/projects/${projectId}/incomes/new`}>
                <Button size="sm" variant="outline" className="rounded-xl border-slate-300">
                  + Registrar Ingreso
                </Button>
              </Link>
            </div>
            
            {incomes?.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No hay ingresos o anticipos registrados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomes?.map((inc) => (
                  <Card key={inc.id} className="p-4 border border-slate-200/80 shadow-sm rounded-xl bg-white flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{inc.description}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(inc.income_date).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-emerald-600 text-base">
                        +${(Number(inc.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
