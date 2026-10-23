import { Participant } from '@/generated/prisma/browser'
import { chosenParticipantId } from '@/lib/active-user'
import { Balances } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { useActiveUser } from '@/lib/hooks'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  balances: Balances
  participants: Participant[]
  currency: Currency
  groupId: string
}

export function BalancesList({
  balances,
  participants,
  currency,
  groupId,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('Balances')
  const activeId = chosenParticipantId(
    useActiveUser(groupId),
    participants.map((p) => p.id),
  )
  const maxBalance = Math.max(
    ...Object.values(balances).map((b) => Math.abs(b.total)),
  )

  return (
    <div className="text-sm">
      {participants.map((participant) => {
        const balance = balances[participant.id]?.total ?? 0
        const isLeft = balance >= 0
        const isYou = participant.id === activeId
        return (
          <div
            key={participant.id}
            data-testid="balance-row"
            data-participant={participant.name}
            data-active={isYou ? 'true' : 'false'}
            className={cn(
              'flex rounded-lg',
              isLeft || 'flex-row-reverse',
              isYou && 'bg-primary/15 font-extrabold ring-2 ring-primary/40',
            )}
          >
            <div className={cn('w-1/2 p-2', isLeft && 'text-right')}>
              {isYou ? t('you') : participant.name}
            </div>
            <div className={cn('w-1/2 relative', isLeft || 'text-right')}>
              <div className="absolute inset-0 p-2 z-20">
                {formatCurrency(currency, balance, locale)}
              </div>
              {balance !== 0 && (
                <div
                  className={cn(
                    'absolute top-1 h-7 z-10',
                    isLeft
                      ? 'bg-green-200 dark:bg-green-800 left-0 rounded-r-lg border border-green-300 dark:border-green-700'
                      : 'bg-red-200 dark:bg-red-800 right-0 rounded-l-lg border  border-red-300 dark:border-red-700',
                  )}
                  style={{
                    width: (Math.abs(balance) / maxBalance) * 100 + '%',
                  }}
                ></div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
