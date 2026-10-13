'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { pragueToday } from '@/lib/dashboard'
import { randomId } from '@/lib/random'
import { amountAsMinorUnits, cn, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ChevronDown, Loader2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const [paidFor, setPaidFor] = useState<string[]>([])
  const [date, setDate] = useState(() => pragueToday())
  const [category, setCategory] = useState(0)
  const [notes, setNotes] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!group || paidBy) return
    const ids = group.participants.map((p) => p.id)
    const last = localStorage.getItem(`${groupId}-lastPayer`)
    const active = localStorage.getItem(`${groupId}-activeUser`)
    setPaidBy([last, active].find((id) => id && ids.includes(id)) ?? ids[0])
    setPaidFor(ids)
  }, [group, groupId, paidBy])

  if (!group) return null
  const currency = getCurrencyFromGroup(group)
  const name = (id?: string) =>
    group.participants.find((p) => p.id === id)?.name ?? ''
  const amountNumber = Number(amount.replace(',', '.').replace(/\s/g, ''))
  const valid =
    amount !== '' &&
    !Number.isNaN(amountNumber) &&
    amountNumber > 0 &&
    !!paidBy &&
    paidFor.length > 0
  const todayLabel =
    date === pragueToday() ? t('today') : date.split('-').reverse().join('. ')
  const splitLabel =
    paidFor.length === group.participants.length
      ? t('splitEvenly')
      : t('onlyFor', { name: name(paidFor[0]) })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || !paidBy) return
    try {
      await create.mutateAsync({
        groupId,
        participantId: paidBy,
        expenseId,
        expenseFormValues: {
          title: title.trim().length >= 2 ? title.trim() : t('defaultTitle'),
          expenseDate: new Date(`${date}T00:00:00Z`),
          amount: amountAsMinorUnits(amountNumber, currency),
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

      <label className="clay-pressed bg-peach rounded-3xl px-4 py-2 flex items-baseline gap-2">
        <input
          autoFocus
          inputMode="decimal"
          enterKeyHint="next"
          placeholder="0"
          aria-label={t('amount')}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,\s]/g, ''))}
          className="w-full bg-transparent text-4xl font-black tracking-tight outline-none placeholder:text-foreground/30"
          data-testid="quick-amount"
        />
        <span className="text-2xl font-black text-foreground/60">
          {currency.symbol}
        </span>
      </label>

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
        <button type="button" className={chip} onClick={() => setOpen(true)}>
          💳 {name(paidBy)}
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
                  onClick={() => setPaidBy(p.id)}
                  className={cn(
                    'clay-sm px-3 py-1.5 font-bold',
                    paidBy === p.id
                      ? 'bg-sage-strong text-white'
                      : 'bg-background',
                  )}
                >
                  {p.name}
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
                    {p.name}
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
