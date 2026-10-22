import { formatDateOnly } from '@/lib/dates'
import { summarizeFinance, formatMoney } from '@/lib/finance'
import { ProgressTape } from '@/components/progress-tape'
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

  // El presupuesto autorizado no es efectivo: se muestran por separado
  const fin = summarizeFinance(baseBudget, incomes, expenses)

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
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Presupuesto: cuánto se autorizó y cuánto falta por ejercer */}
        <section aria-labelledby="fin-presupuesto" className="rounded-lg border border-border bg-card p-5">
          <h3 id="fin-presupuesto" className="text-base font-bold text-plano">Presupuesto de la obra</h3>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <dt className="text-sm text-muted-foreground">Autorizado</dt>
              <dd className="text-xl font-bold text-plano">{formatMoney(fin.budget)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Ejercido</dt>
              <dd className="text-xl font-bold text-plano">{formatMoney(fin.expenses)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Por ejercer</dt>
              <dd className={`text-xl font-bold ${fin.budgetRemaining < 0 ? 'text-destructive' : 'text-plano'}`}>{formatMoney(fin.budgetRemaining)}</dd>
            </div>
          </dl>
          {fin.budgetUsedPct !== null ? (
            <div className="mt-4 space-y-1.5">
              <ProgressTape value={fin.budgetUsedPct} label="Presupuesto ejercido" />
              <p className="text-sm text-muted-foreground">
                {fin.budgetUsedPct > 100
                  ? `Se rebasó el presupuesto: se ha gastado el ${fin.budgetUsedPct}% de lo autorizado.`
                  : `Se ha ejercido el ${fin.budgetUsedPct}% del presupuesto.`}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Esta obra no tiene presupuesto autorizado. Agrégalo al editar la obra.</p>
          )}
        </section>

        {/* Caja: dinero que realmente entró y salió */}
        <section aria-labelledby="fin-caja" className="rounded-lg border border-border bg-card p-5">
          <h3 id="fin-caja" className="text-base font-bold text-plano">Flujo de efectivo</h3>
          {isAdmin ? (
            <>
              <dl className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Ingresos recibidos</dt>
                  <dd className="text-xl font-bold text-ok">{formatMoney(fin.incomes)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Gastos pagados</dt>
                  <dd className="text-xl font-bold text-plano">{formatMoney(fin.expenses)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Saldo de caja</dt>
                  <dd className={`text-xl font-bold ${fin.cash < 0 ? 'text-destructive' : 'text-plano'}`}>{formatMoney(fin.cash)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">
                {fin.cash < 0
                  ? 'Se ha pagado más de lo que el cliente ha depositado. Registra los anticipos pendientes o revisa los gastos.'
                  : 'Saldo de caja = ingresos recibidos menos gastos pagados. No incluye el presupuesto autorizado.'}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Los ingresos y el saldo de caja solo los ve el director de obra.</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Sección de Gastos y Tickets */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="text-lg font-bold text-plano flex items-center gap-2">
                <Receipt className="h-5 w-5 text-ok" />
                Tickets y comprobantes de gastos
              </h3>
              <p className="text-xs text-muted-foreground">Registrados por residentes, administradores y subcontratistas</p>
            </div>
            
            {/* Modal para Subir Ticket desde Usuario y Admin */}
            <div className="flex flex-wrap items-center gap-2">
              <ExportExpensesButton expenses={exportItems} title="Reporte de Contabilidad y Tickets de la Obra" />
              <NewTicketModal projectId={projectId} buttonText="Subir ticket" />
            </div>
          </div>
          
          {expenses?.length === 0 ? (
            <div className="p-8 text-center bg-muted/50 rounded-lg border border-dashed border-border">
              <Receipt className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No hay tickets de gastos registrados.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Utiliza el botón superior para subir el primer comprobante.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses?.map((exp) => (
                <Card key={exp.id} className="p-4 border border-border/80 shadow-sm hover:shadow-md transition-all rounded-md bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {exp.receipt_url ? (
                      <a href={exp.receipt_url} target="_blank" rel="noreferrer" aria-label={`Abrir comprobante de ${exp.description || exp.concept}`} className="h-12 w-12 rounded-lg border overflow-hidden shrink-0 bg-muted group relative block">
                        <img src={exp.receipt_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      </a>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <Receipt className="h-6 w-6" />
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-plano text-sm leading-tight">
                        {exp.description || exp.concept}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-1 font-medium text-plano/80 bg-muted px-2 py-0.5 rounded-md text-xs">
                          {exp.category || 'Gasto'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {exp.expense_date ? formatDateOnly(exp.expense_date, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sin fecha'}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          {exp.profiles?.full_name || 'Usuario'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 pt-2 sm:pt-0">
                    <p className="font-extrabold text-destructive text-base">
                      -${(Number(exp.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>

                    {exp.receipt_url && (
                      <a 
                        href={exp.receipt_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1 text-xs text-obra font-semibold hover:underline mt-0.5"
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
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-plano flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-ok" />
                  Ingresos y anticipos de cliente
                </h3>
                <p className="text-xs text-muted-foreground">Manejo de flujo de caja y aportaciones</p>
              </div>

              <Link href={`/dashboard/projects/${projectId}/incomes/new`}>
                <Button size="sm" variant="outline" className="rounded-md border-junta">
                  + Registrar Ingreso
                </Button>
              </Link>
            </div>
            
            {incomes?.length === 0 ? (
              <div className="p-8 text-center bg-muted/50 rounded-lg border border-dashed border-border">
                <DollarSign className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No hay ingresos o anticipos registrados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomes?.map((inc) => (
                  <Card key={inc.id} className="p-4 border border-border/80 shadow-sm rounded-md bg-white flex items-center justify-between">
                    <div>
                      <p className="font-bold text-plano text-sm">{inc.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateOnly(inc.income_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-ok text-base">
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
