// Resumen financiero de una obra. El presupuesto autorizado NO es dinero en caja:
// se reporta por separado lo que entró, lo que se pagó y lo que queda por ejercer.

export type FinanceSummary = {
  /** Presupuesto autorizado de la obra. */
  budget: number
  /** Ingresos y anticipos recibidos del cliente. */
  incomes: number
  /** Gastos pagados (tickets registrados). */
  expenses: number
  /** Efectivo real: ingresos recibidos menos gastos pagados. */
  cash: number
  /** Presupuesto que aún no se ejerce: autorizado menos gastado. */
  budgetRemaining: number
  /** Porcentaje del presupuesto ya ejercido (0-100+), null sin presupuesto. */
  budgetUsedPct: number | null
}

const sum = (rows: { amount?: number | string | null }[] | null | undefined) =>
  (rows || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

export function summarizeFinance(
  budget: number | string | null | undefined,
  incomes: { amount?: number | string | null }[] | null | undefined,
  expenses: { amount?: number | string | null }[] | null | undefined
): FinanceSummary {
  const b = Number(budget) || 0
  const i = sum(incomes)
  const e = sum(expenses)
  return {
    budget: b,
    incomes: i,
    expenses: e,
    cash: i - e,
    budgetRemaining: b - e,
    budgetUsedPct: b > 0 ? Math.round((e / b) * 1000) / 10 : null,
  }
}

export function formatMoney(value: number): string {
  const abs = Math.abs(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${value < 0 ? '-' : ''}$${abs}`
}
