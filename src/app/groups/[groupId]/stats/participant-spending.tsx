'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Currency } from '@/lib/currency'
import { ParticipantSpending } from '@/lib/totals'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  participants?: ParticipantSpending[]
  currency?: Currency
  activeParticipantId?: string
}

export function ParticipantSpendingStats({
  participants,
  currency,
  activeParticipantId,
}: Props) {
  const t = useTranslations('Stats.ByParticipant')

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!participants || !currency ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
        ) : participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ParticipantTable
            participants={participants}
            currency={currency}
            activeParticipantId={activeParticipantId}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ParticipantTable({
  participants,
  currency,
  activeParticipantId,
}: {
  participants: ParticipantSpending[]
  currency: Currency
  activeParticipantId?: string
}) {
  const locale = useLocale()
  const t = useTranslations('Stats.ByParticipant')
  const you = useTranslations('Stats')

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 px-2">{t('participant')}</TableHead>
          <TableHead className="h-8 px-2 text-right">{t('paid')}</TableHead>
          <TableHead className="h-8 px-2 text-right">{t('count')}</TableHead>
          <TableHead className="h-8 px-2 text-right">{t('share')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.map((participant) => {
          const isYou = participant.participantId === activeParticipantId
          return (
            <TableRow
              key={participant.participantId}
              data-active={isYou ? 'true' : 'false'}
              className={cn(isYou && 'bg-primary/15 font-extrabold')}
            >
              <TableCell className="p-2 font-medium">
                {isYou ? you('you') : participant.name}
              </TableCell>
              <TableCell className="p-2 text-right tabular-nums">
                {formatCurrency(currency, participant.paid, locale)}
              </TableCell>
              <TableCell className="p-2 text-right tabular-nums text-muted-foreground">
                {participant.paidCount}
              </TableCell>
              <TableCell className="p-2 text-right tabular-nums text-muted-foreground">
                {formatCurrency(currency, participant.share, locale)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
