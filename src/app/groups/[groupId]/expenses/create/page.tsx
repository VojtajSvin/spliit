import { CreateExpenseForm } from '@/app/groups/[groupId]/expenses/create-expense-form'
import { QuickAddForm } from '@/app/groups/[groupId]/expenses/quick-add-form'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('ExpenseForm')

  return {
    title: t('Expense.create'),
  }
}

// Prefilled flows (reimbursement, receipt scan, duplicate…) and ?full=1 use
// the full form; a plain "add expense" opens the compact quick-add screen.
const FULL_FORM_PARAMS = [
  'full',
  'reimbursement',
  'imageUrl',
  'title',
  'amount',
  'from',
  'categoryId',
  'date',
]

export default async function ExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { groupId } = await params
  const query = await searchParams
  if (!FULL_FORM_PARAMS.some((key) => query[key] !== undefined)) {
    return <QuickAddForm groupId={groupId} />
  }
  return (
    <CreateExpenseForm
      groupId={groupId}
      runtimeFeatureFlags={await getRuntimeFeatureFlags()}
    />
  )
}
