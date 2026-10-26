import { Button } from '@/components/ui/button'
import { Participant } from '@/generated/prisma/browser'
import { chosenParticipantId } from '@/lib/active-user'
import { Reimbursement } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { useActiveUser } from '@/lib/hooks'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

type Props = {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: Currency
  groupId: string
}

export function ReimbursementList({
  reimbursements,
  participants,
  currency,
  groupId,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('Balances.Reimbursements')
  const activeId = chosenParticipantId(
    useActiveUser(groupId),
    participants.map((p) => p.id),
  )
  if (reimbursements.length === 0) {
    return <p className="text-sm pb-6">{t('noImbursements')}</p>
  }

  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  const label = (id: string) => getParticipant(id)?.name ?? ''
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => (
        <div
          className={cn(
            'py-4 flex justify-between rounded-lg',
            (reimbursement.from === activeId ||
              reimbursement.to === activeId) &&
              'bg-primary/15 px-2 font-extrabold ring-2 ring-primary/40',
          )}
          key={index}
          data-testid="reimbursement-row"
          data-from={getParticipant(reimbursement.from)?.name ?? ''}
          data-to={getParticipant(reimbursement.to)?.name ?? ''}
          data-active={
            reimbursement.from === activeId || reimbursement.to === activeId
              ? 'true'
              : 'false'
          }
        >
          <div className="flex flex-col gap-1 items-start sm:flex-row sm:items-baseline sm:gap-4">
            <div>
              {t.rich('owes', {
                from: label(reimbursement.from),
                to: label(reimbursement.to),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </div>
            <Button variant="link" asChild className="-mx-4 -my-3">
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`}
              >
                {t('markAsPaid')}
              </Link>
            </Button>
          </div>
          <div>{formatCurrency(currency, reimbursement.amount, locale)}</div>
        </div>
      ))}
    </div>
  )
}
