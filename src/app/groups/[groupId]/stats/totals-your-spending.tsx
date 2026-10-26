'use client'

import { Currency } from '@/lib/currency'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

export function TotalsYourSpendings({
  totalParticipantSpendings = 0,
  currency,
  participantName,
}: {
  totalParticipantSpendings?: number
  currency: Currency
  participantName?: string
}) {
  const locale = useLocale()
  const t = useTranslations('Stats.Totals')

  const balance =
    totalParticipantSpendings < 0 ? 'yourEarnings' : 'yourSpendings'
  const named =
    totalParticipantSpendings < 0 ? 'namedEarnings' : 'namedSpendings'

  return (
    <div>
      <div className="text-muted-foreground">
        {participantName ? t(named, { name: participantName }) : t(balance)}
      </div>

      <div
        className={cn(
          'text-lg',
          totalParticipantSpendings < 0 ? 'text-green-600' : 'text-red-600',
        )}
      >
        {formatCurrency(currency, Math.abs(totalParticipantSpendings), locale)}
      </div>
    </div>
  )
}
