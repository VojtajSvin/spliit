import { getDashboard, pragueToday } from './dashboard'

const a = { id: 'a', name: 'Hlava rodiny' }
const b = { id: 'b', name: 'domácí mazlíček' }
const exp = (
  id: string,
  date: string,
  amount: number,
  payer = a,
  isReimbursement = false,
) => ({
  id,
  title: id,
  amount,
  expenseDate: new Date(`${date}T00:00:00Z`),
  isReimbursement,
  paidBy: payer,
  category: null,
  splitMode: 'EVENLY',
  paidFor: [
    { participant: a, shares: 100 },
    { participant: b, shares: 100 },
  ],
})

describe('getDashboard', () => {
  const now = new Date('2026-10-13T10:00:00Z')

  it('uses the Prague calendar date', () => {
    expect(pragueToday(new Date('2026-10-12T22:30:00Z'))).toBe('2026-10-13')
  })

  it('aggregates spending and excludes reimbursements', () => {
    const d = getDashboard(
      [
        exp('1', '2026-10-01', 1000),
        exp('2', '2026-09-15', 3000, b),
        exp('3', '2026-10-02', 500, b, true),
      ],
      [a, b],
      now,
    )
    expect(d.total).toBe(4000)
    expect(d.count).toBe(2)
    expect(d.thisMonth).toBe(1000)
    expect(d.months).toHaveLength(6)
    expect(d.months[5]).toEqual({ month: '2026-10', amount: 1000 })
    expect(d.byPayer.map((p) => p.amount)).toEqual([1000, 3000])
    expect(d.recent[0].id).toBe('3')
    expect(d.reimbursements).toHaveLength(1)
  })

  it('computes a monthly budget and a ranged budget', () => {
    const list = [exp('1', '2026-10-01', 1000), exp('2', '2026-09-15', 3000)]
    expect(getDashboard(list, [a, b], now).budget).toBeNull()
    expect(
      getDashboard(list, [a, b], now, {
        budget: 5000,
        budgetFrom: null,
        budgetTo: null,
      }).budget,
    ).toMatchObject({ amount: 5000, spent: 1000, monthly: true })
    expect(
      getDashboard(list, [a, b], now, {
        budget: 2000,
        budgetFrom: new Date('2026-09-01T00:00:00Z'),
        budgetTo: new Date('2026-09-30T00:00:00Z'),
      }).budget,
    ).toMatchObject({ spent: 3000, monthly: false, from: '2026-09-01' })
  })
})
