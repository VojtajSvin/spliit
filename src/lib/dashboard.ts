import { getBalances, getSuggestedReimbursements } from '@/lib/balances'

type DashboardExpense = {
  id: string
  title: string
  amount: number
  expenseDate: Date
  isReimbursement: boolean
  paidBy: { id: string; name: string }
  category: { id: number; grouping: string; name: string } | null
  paidFor: { participant: { id: string; name: string }; shares: number }[]
  splitMode: string
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** Today's calendar date in Prague, as YYYY-MM-DD. */
export function pragueToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Derives everything the group dashboard shows from the group's expenses.
 * Reimbursements count toward balances but not toward spending.
 */
export function getDashboard(
  expenses: DashboardExpense[],
  participants: { id: string; name: string }[],
  now = new Date(),
) {
  const today = pragueToday(now)
  const month = today.slice(0, 7)
  const spending = expenses.filter((e) => !e.isReimbursement)

  const total = spending.reduce((s, e) => s + e.amount, 0)
  const thisMonthExpenses = spending.filter(
    (e) => dayKey(e.expenseDate).slice(0, 7) === month,
  )
  const thisMonth = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)

  const todayDate = new Date(`${today}T00:00:00Z`)
  const from30 = new Date(todayDate.getTime() - 29 * 86400000)
  const last30 = spending
    .filter((e) => e.expenseDate >= from30 && e.expenseDate <= todayDate)
    .reduce((s, e) => s + e.amount, 0)

  // Last 6 calendar months, oldest first.
  const [y, m] = month.split('-').map(Number)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1))
    return { month: d.toISOString().slice(0, 7), amount: 0 }
  })
  for (const e of spending) {
    const slot = months.find(
      (x) => x.month === dayKey(e.expenseDate).slice(0, 7),
    )
    if (slot) slot.amount += e.amount
  }

  const byPayer = participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    amount: spending
      .filter((e) => e.paidBy.id === p.id)
      .reduce((s, e) => s + e.amount, 0),
  }))

  const balances = getBalances(expenses as any)
  const reimbursements = getSuggestedReimbursements(balances)

  const recent = [...expenses]
    .sort(
      (a, b) =>
        b.expenseDate.getTime() - a.expenseDate.getTime() ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      expenseDate: dayKey(e.expenseDate),
      isReimbursement: e.isReimbursement,
      paidByName: e.paidBy.name,
      categoryGrouping: e.category?.grouping ?? null,
      categoryName: e.category?.name ?? null,
    }))

  return {
    total,
    count: spending.length,
    thisMonth,
    thisMonthCount: thisMonthExpenses.length,
    perDay: Math.round(last30 / 30),
    months,
    byPayer,
    reimbursements,
    recent,
  }
}
