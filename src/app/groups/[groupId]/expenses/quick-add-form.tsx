'use client'

import { CurrencySelector } from '@/components/currency-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Locale } from '@/i18n/request'
import {
  activeUserStorageKey,
  chosenParticipantId,
  openActiveUserPicker,
} from '@/lib/active-user'
import { defaultCurrencyList, getCurrency, type Currency } from '@/lib/currency'
import {
  amountsForGroupCurrency,
  parseLocaleDecimal,
  resolveConversionRate,
} from '@/lib/currency-conversion'
import { pragueToday } from '@/lib/dashboard'
import { useActiveUser, useCurrencyRate } from '@/lib/hooks'
import { randomId } from '@/lib/random'
import { cn, formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ChevronDown, Loader2, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const chip =
  'clay-sm bg-card px-3 py-1 text-xs font-bold whitespace-nowrap truncate max-w-[48%]'

/**
 * Compact add-expense screen: amount, title and the submit button fit above
 * the iPhone keyboard. Everything else sits in a collapsed "Další detaily".
 */
export function QuickAddForm({ groupId }: { groupId: string }) {
  const t = useTranslations('QuickAdd')
  const tc = useTranslations('Categories')
  const locale = useLocale() as Locale
  const router = useRouter()
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const { data: categoriesData } = trpc.categories.list.useQuery()
  const group = groupData?.group
  const create = trpc.groups.expenses.create.useMutation()

  const [expenseId, setExpenseId] = useState(() => randomId())
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [paidBy, setPaidBy] = useState<string>()
  const [payerTouched, setPayerTouched] = useState(false)
  const [paidFor, setPaidFor] = useState<string[]>([])
  const activeUser = useActiveUser(groupId)
  const [date, setDate] = useState(() => pragueToday())
  const [category, setCategory] = useState(0)
  const [notes, setNotes] = useState('')
  const [open, setOpen] = useState(false)
  // undefined until the group (and any remembered currency) has been read.
  const [currencyCode, setCurrencyCode] = useState<string | undefined>()
  const [customRate, setCustomRate] = useState('')
  const [manualRate, setManualRate] = useState(false)

  useEffect(() => {
    if (!group) return
    const ids = group.participants.map((p) => p.id)
    setPaidFor((current) => (current.length > 0 ? current : ids))
    if (payerTouched) return
    // Last payer on this device, then the person chosen in "Kdo jsi?".
    // Never the first participant: that is whoever created the group.
    const last = localStorage.getItem(`${groupId}-lastPayer`)
    const stored = localStorage.getItem(activeUserStorageKey(groupId))
    const payer = [last, stored, activeUser].find(
      (id): id is string => !!id && ids.includes(id),
    )
    setPaidBy(payer)
  }, [group, groupId, activeUser, payerTouched])

  useEffect(() => {
    if (!group) return
    setCurrencyCode((current) => {
      if (current !== undefined) return current
      const last = localStorage.getItem(`${groupId}-lastCurrency`)
      if (last && getCurrency(last, locale).code === last) return last
      return group.currencyCode ?? ''
    })
  }, [group, groupId, locale])

  const groupCurrency: Currency = group
    ? getCurrencyFromGroup(group)
    : getCurrency('CZK', locale)
  const selectedCode = currencyCode || group?.currencyCode || ''
  const selectedCurrency = getCurrency(selectedCode, locale)
  const canConvert = !!groupCurrency.code
  const converting =
    canConvert &&
    !!selectedCurrency.code &&
    selectedCurrency.code !== groupCurrency.code
  const exchangeRate = useCurrencyRate(
    new Date(`${date}T00:00:00Z`),
    converting ? selectedCurrency.code : '',
    groupCurrency.code,
  )
  const rate = converting
    ? resolveConversionRate(
        manualRate || !exchangeRate.data ? customRate : '',
        exchangeRate.data,
      )
    : null
  const money = amountsForGroupCurrency({
    enteredMajor: parseLocaleDecimal(amount) ?? NaN,
    entered: converting ? selectedCurrency : groupCurrency,
    group: groupCurrency,
    rate,
  })

  if (!group || currencyCode === undefined) return null
  const participantIds = group.participants.map((p) => p.id)
  const me = chosenParticipantId(activeUser, participantIds)
  const name = (id?: string) =>
    group.participants.find((p) => p.id === id)?.name ?? ''
  const labelOf = (id?: string) => {
    if (!id) return t('pickYou')
    return id === me ? t('you') : name(id)
  }
  const valid = money != null && !!paidBy && paidFor.length > 0
  const showRateInput =
    converting &&
    (manualRate || (!exchangeRate.isLoading && !exchangeRate.data))
  const convertedLabel =
    converting && money
      ? formatCurrency(groupCurrency, money.amount, locale)
      : null
  const todayLabel =
    date === pragueToday() ? t('today') : date.split('-').reverse().join('. ')
  const splitLabel =
    paidFor.length === group.participants.length
      ? t('splitEvenly')
      : t('onlyFor', { name: labelOf(paidFor[0]) })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!money || !paidBy || paidFor.length === 0) return
    try {
      await create.mutateAsync({
        groupId,
        participantId: paidBy,
        expenseId,
        expenseFormValues: {
          title: title.trim().length >= 2 ? title.trim() : t('defaultTitle'),
          expenseDate: new Date(`${date}T00:00:00Z`),
          amount: money.amount,
          ...(money.originalCurrency
            ? {
                originalAmount: money.originalAmount,
                originalCurrency: money.originalCurrency,
                conversionRate: money.conversionRate,
              }
            : {}),
          category,
          paidBy,
          paidFor: paidFor.map((participant) => ({ participant, shares: 100 })),
          splitMode: 'EVENLY',
          saveDefaultSplittingOptions: false,
          isReimbursement: false,
          documents: [],
          notes: notes || undefined,
          recurrenceRule: 'NONE',
        },
      })
    } catch {
      setExpenseId(randomId())
      toast({ description: t('error'), variant: 'destructive' })
      return
    }
    localStorage.setItem(`${groupId}-lastPayer`, paidBy)
    if (selectedCurrency.code)
      localStorage.setItem(`${groupId}-lastCurrency`, selectedCurrency.code)
    utils.groups.invalidate()
    router.push(`/groups/${groupId}`)
  }

  return (
    <form
      onSubmit={submit}
      className="clay bg-card p-4 flex flex-col gap-3"
      data-testid="quick-add"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-black text-lg">{t('title')}</h2>
        <Link
          href={`/groups/${groupId}`}
          aria-label={t('cancel')}
          className="clay-sm bg-background w-8 h-8 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </Link>
      </div>

      <div className="clay-pressed bg-peach rounded-3xl px-4 py-2">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            enterKeyHint="next"
            placeholder="0"
            aria-label={t('amount')}
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value.replace(/[^0-9.,\s]/g, ''))
            }
            className="min-w-0 flex-1 bg-transparent text-4xl font-black tracking-tight outline-none placeholder:text-foreground/30"
            data-testid="quick-amount"
          />
          {canConvert ? (
            <CurrencySelector
              compact
              currencies={defaultCurrencyList(locale)}
              defaultValue={selectedCurrency.code}
              isLoading={converting && exchangeRate.isLoading}
              onValueChange={(code) => {
                if (code === currencyCode) return
                setCurrencyCode(code)
                setCustomRate('')
                setManualRate(false)
              }}
            />
          ) : (
            <span className="text-2xl font-black text-foreground/60">
              {groupCurrency.symbol}
            </span>
          )}
        </div>
        {converting && (
          <div
            className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs font-bold"
            data-testid="quick-conversion"
          >
            <span className="tabular-nums text-foreground/70">
              {exchangeRate.isLoading && !manualRate
                ? t('rateLoading')
                : convertedLabel
                  ? `≈ ${convertedLabel}`
                  : showRateInput
                    ? t('rateMissing')
                    : null}
            </span>
            <span className="ml-auto flex items-center gap-1">
              <span className="text-foreground/60">
                1 {selectedCurrency.code} =
              </span>
              {showRateInput ? (
                <input
                  inputMode="decimal"
                  aria-label={t('rate')}
                  placeholder="0"
                  value={customRate}
                  onChange={(e) => {
                    setManualRate(true)
                    setCustomRate(e.target.value.replace(/[^0-9.,]/g, ''))
                  }}
                  className="w-16 border-b border-foreground/30 bg-transparent text-right outline-none"
                  data-testid="quick-rate"
                />
              ) : (
                <button
                  type="button"
                  className="underline decoration-foreground/30 underline-offset-2"
                  onClick={() => {
                    if (exchangeRate.data)
                      setCustomRate(
                        new Intl.NumberFormat(locale, {
                          maximumFractionDigits: 6,
                          useGrouping: false,
                        }).format(exchangeRate.data),
                      )
                    setManualRate(true)
                  }}
                >
                  {exchangeRate.data
                    ? new Intl.NumberFormat(locale, {
                        maximumFractionDigits: 6,
                      }).format(exchangeRate.data)
                    : '…'}
                </button>
              )}
              <span className="text-foreground/60">{groupCurrency.symbol}</span>
            </span>
          </div>
        )}
      </div>

      <Input
        placeholder={t('titlePlaceholder')}
        aria-label={t('titleLabel')}
        value={title}
        enterKeyHint="done"
        onChange={(e) => setTitle(e.target.value)}
        className="h-11 text-base"
        maxLength={200}
      />

      <div className="flex gap-2 overflow-hidden">
        <button
          type="button"
          className={chip}
          data-testid="quick-payer"
          onClick={() => {
            if (!me) openActiveUserPicker()
            setOpen(true)
          }}
        >
          💳 {labelOf(paidBy)}
        </button>
        <button type="button" className={chip} onClick={() => setOpen(true)}>
          ⚖️ {splitLabel}
        </button>
        <button type="button" className={chip} onClick={() => setOpen(true)}>
          📅 {todayLabel}
        </button>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={!valid || create.isPending}
        data-testid="quick-submit"
      >
        {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {t('submit')}
      </Button>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center gap-1 text-sm font-bold text-foreground/70"
        aria-expanded={open}
      >
        {t('more')}
        <ChevronDown
          className={cn('w-4 h-4 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className="flex flex-col gap-3 text-sm"
          data-testid="quick-details"
        >
          <Field label={t('paidBy')}>
            <div className="flex gap-2 flex-wrap">
              {group.participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPayerTouched(true)
                    setPaidBy(p.id)
                  }}
                  className={cn(
                    'clay-sm px-3 py-1.5 font-bold',
                    paidBy === p.id
                      ? 'bg-sage-strong text-white'
                      : 'bg-background',
                    p.id === me && 'ring-2 ring-primary/50',
                  )}
                >
                  {labelOf(p.id)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('paidFor')}>
            <div className="flex gap-2 flex-wrap">
              {group.participants.map((p) => {
                const on = paidFor.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setPaidFor((cur) =>
                        on ? cur.filter((id) => id !== p.id) : [...cur, p.id],
                      )
                    }
                    className={cn(
                      'clay-sm px-3 py-1.5 font-bold',
                      on ? 'bg-sky-strong text-white' : 'bg-background',
                    )}
                  >
                    {on ? '✓ ' : ''}
                    {labelOf(p.id)}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label={t('date')}>
            <Input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </Field>
          <Field label={t('category')}>
            <select
              value={category}
              onChange={(e) => setCategory(Number(e.target.value))}
              className="h-10 w-full rounded-2xl border border-input bg-card px-3"
            >
              {categoriesData?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {tc(`${c.grouping}.heading`)} ·{' '}
                  {tc(`${c.grouping}.${c.name}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('notes')}>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={5000}
            />
          </Field>
          <Link
            href={`/groups/${groupId}/expenses/create?full=1`}
            className="text-center font-bold text-primary underline-offset-4 hover:underline"
          >
            {t('fullForm')}
          </Link>
        </div>
      )}
    </form>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-foreground/60">{label}</span>
      {children}
    </div>
  )
}
