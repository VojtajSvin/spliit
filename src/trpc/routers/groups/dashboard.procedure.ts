import { getGroup, getGroupExpenses } from '@/lib/api'
import { getDashboard } from '@/lib/dashboard'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const getGroupDashboardProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1).max(64) }))
  .query(async ({ input: { groupId } }) => {
    const group = await getGroup(groupId)
    if (!group) return null
    const expenses = await getGroupExpenses(groupId)
    return getDashboard(expenses as any, group.participants, new Date(), {
      budget: group.budget,
      budgetFrom: group.budgetFrom,
      budgetTo: group.budgetTo,
    })
  })
