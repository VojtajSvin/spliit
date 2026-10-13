'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackPage } from '@/lib/analytics/track-page'
import { cn, formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ChevronRight, Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect } from 'react'
import { useCurrentGroup } from './current-group-context'

const TILE_COLORS = [
  { bg: 'bg-sage', badge: 'bg-sage-strong', emoji: '🛒' },
  { bg: 'bg-peach', badge: 'bg-peach-strong', emoji: '💸' },
  { bg: 'bg-butter', badge: 'bg-butter-strong', emoji: '🧾' },
  { bg: 'bg-sky', badge: 'bg-sky-strong', emoji: '📅' },
]
const BAR_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-1))',
]
const DONUT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
]

const GROUPING_EMOJI: Record<string, string> = {
  Uncategorized: '🧺',
  Entertainment: '🎬',
  'Food and Drink': '🍽️',
  Home: '🏠',
  Life: '🌿',
  Transportation: '🚗',
  Utilities: '💡',
  Payment: '🤝',
}

export function GroupDashboard() {
  const { groupId, group } = useCurrentGroup()
  const t = useTranslations('Dashboard')
  const locale = useLocale()
  const utils = trpc.useUtils()
  const { data, isLoading, isError } = trpc.groups.dashboard.useQuery({
    groupId,
  })

  useEffect(() => {
    utils.groups.dashboard.invalidate()
  }, [utils])

  if (isError) {
    return <p className="text-sm text-muted-foreground">{t('loadError')}</p>
  }
  if (isLoading || !data || !group) return <DashboardSkeleton />

  const currency = getCurrencyFromGroup(group)
  const money = (amount: number) => formatCurrency(currency, amount, locale)
  const name = (id: string) =>
    group.participants.find((p) => p.id === id)?.name ?? ''
  const debt = data.reimbursements[0]
  const maxMonth = Math.max(1, ...data.months.map((m) => m.amount))
  const payerTotal = data.byPayer.reduce((s, p) => s + p.amount, 0) || 1
  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat(locale, { month: 'short' })
      .format(new Date(`${m}-01T00:00:00Z`))
      .replace('.', '')

  const tiles = [
    {
      label: t('thisMonth'),
      value: money(data.thisMonth),
      hint: t('thisMonthHint', { count: data.thisMonthCount }),
    },
    { label: t('total'), value: money(data.total), hint: t('sinceStart') },
    { label: t('count'), value: String(data.count), hint: t('countHint') },
    { label: t('perDay'), value: money(data.perDay), hint: t('perDayHint') },
  ]

  // Donut geometry
  const donut = data.byPayer.map((p, i) => {
    const pct = (p.amount / payerTotal) * 100
    const start = data.byPayer
      .slice(0, i)
      .reduce((sum, q) => sum + (q.amount / payerTotal) * 100, 0)
    return { ...p, pct, start }
  })
  const R = 15.915 // circumference = 100

  return (
    <div className="flex flex-col gap-4" data-testid="group-dashboard">
      <TrackPage path={`/groups/${groupId}`} />

      {/* Hero */}
      <section className="clay bg-peach relative overflow-hidden p-5 pr-24">
        <div className="absolute -right-2 bottom-0 text-[84px] leading-none select-none drop-shadow-md">
          {debt ? '🪴' : '🎉'}
        </div>
        <p className="font-extrabold text-lg">{t('hello')}</p>
        {debt ? (
          <>
            <p className="mt-2 text-sm font-semibold text-foreground/70">
              {t('owes', { from: name(debt.from), to: name(debt.to) })}
            </p>
            <p
              className="text-3xl font-black tracking-tight mt-1"
              data-testid="dashboard-debt"
            >
              {money(debt.amount)}
            </p>
            <Button asChild className="mt-4" size="lg">
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${debt.from}&to=${debt.to}&amount=${debt.amount}`}
              >
                🤝 {t('settle')}
              </Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-2xl font-black mt-2">{t('settled')}</p>
            <p className="text-sm text-foreground/70">{t('settledText')}</p>
          </>
        )}
      </section>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-3">
        {tiles.map((tile, i) => (
          <div key={tile.label} className={cn('clay p-4', TILE_COLORS[i].bg)}>
            <div
              className={cn(
                'clay-sm w-10 h-10 flex items-center justify-center text-xl',
                TILE_COLORS[i].badge,
              )}
            >
              {TILE_COLORS[i].emoji}
            </div>
            <p className="mt-3 text-xs font-bold text-foreground/70">
              {tile.label}
            </p>
            <p className="text-xl font-black tracking-tight">{tile.value}</p>
            <p className="text-[11px] font-semibold text-foreground/60">
              {tile.hint}
            </p>
          </div>
        ))}
      </section>

      {/* Monthly bars */}
      <section className="clay bg-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-extrabold">{t('months')}</h2>
          <span className="clay-sm bg-background text-[11px] font-bold px-3 py-1">
            {t('lastSixMonths')}
          </span>
        </div>
        <div className="flex items-end gap-3 h-36 px-1">
          {data.months.map((m, i) => (
            <div
              key={m.month}
              className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
            >
              <span className="text-[10px] font-bold text-foreground/60 whitespace-nowrap">
                {m.amount ? Math.round(m.amount / 100 / 1000) + ' tis.' : ''}
              </span>
              <div
                className="w-full max-w-8 rounded-full clay-sm"
                style={{
                  height: `${Math.max(6, (m.amount / maxMonth) * 100)}%`,
                  backgroundColor: BAR_COLORS[i],
                }}
              />
              <span className="text-[11px] font-bold capitalize">
                {monthLabel(m.month)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Who paid donut */}
      <section className="clay bg-card p-4">
        <h2 className="font-extrabold mb-3">{t('whoPaid')}</h2>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 42 42" className="w-28 h-28 shrink-0 -rotate-90">
            <circle
              cx="21"
              cy="21"
              r={R}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="7"
            />
            {donut.map((p, i) => (
              <circle
                key={p.participantId}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="7"
                strokeDasharray={`${p.pct} ${100 - p.pct}`}
                strokeDashoffset={-p.start}
              />
            ))}
          </svg>
          <ul className="flex-1 flex flex-col gap-2 text-sm">
            {data.byPayer.map((p, i) => (
              <li key={p.participantId} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                  }}
                />
                <span className="flex-1 font-semibold truncate">{p.name}</span>
                <span className="font-bold">
                  {Math.round((p.amount / payerTotal) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent */}
      <section className="clay bg-card p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-extrabold">{t('recent')}</h2>
          <Link
            href={`/groups/${groupId}/expenses`}
            className="clay-sm bg-background text-[11px] font-bold px-3 py-1"
          >
            {t('seeAll')}
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.recent.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/groups/${groupId}/expenses/${e.id}/edit`}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="clay-sm bg-butter w-11 h-11 flex items-center justify-center text-xl shrink-0">
                    {e.isReimbursement
                      ? '🤝'
                      : (GROUPING_EMOJI[e.categoryGrouping ?? ''] ?? '🧺')}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold truncate">{e.title}</span>
                    <span className="block text-xs text-foreground/60">
                      {t('paidBy', { name: e.paidByName })} ·{' '}
                      {new Intl.DateTimeFormat(locale, {
                        day: 'numeric',
                        month: 'numeric',
                        timeZone: 'UTC',
                      }).format(new Date(`${e.expenseDate}T00:00:00Z`))}
                    </span>
                  </span>
                  <span className="font-extrabold whitespace-nowrap">
                    {money(e.amount)}
                  </span>
                  <span className="clay-sm bg-background w-8 h-8 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Banner CTA */}
      <section className="clay bg-sage flex items-center gap-3 p-4">
        <span className="text-4xl drop-shadow">⭐</span>
        <div className="flex-1">
          <p className="font-extrabold text-sm">{t('bannerTitle')}</p>
          <p className="text-xs text-foreground/70">{t('bannerText')}</p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-sage-strong hover:bg-sage-strong/90"
        >
          <Link href={`/groups/${groupId}/expenses/create`}>
            <Plus className="w-4 h-4 mr-1" />
            {t('add')}
          </Link>
        </Button>
      </section>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-44 rounded-[28px]" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-[28px]" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-[28px]" />
    </div>
  )
}
