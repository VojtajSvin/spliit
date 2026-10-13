'use client'

import { cn } from '@/lib/utils'
import {
  BarChart3,
  Home,
  MoreHorizontal,
  Plus,
  Receipt,
  Scale,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ComponentType } from 'react'

type Props = {
  groupId: string
}

/** Bottom tab bar (mobile-first) plus the floating "add expense" button. */
export function GroupTabs({ groupId }: Props) {
  const t = useTranslations('Dashboard')
  const pathname = usePathname()
  const section = pathname.replace(/^\/groups\/[^/]+\/?/, '').split('/')[0]
  const isForm = /\/expenses\/(create|[^/]+\/edit)/.test(pathname)

  const tabs: { value: string; label: string; Icon: ComponentType<any> }[] = [
    { value: '', label: t('nav.home'), Icon: Home },
    { value: 'expenses', label: t('nav.expenses'), Icon: Receipt },
    { value: 'balances', label: t('nav.balances'), Icon: Scale },
    { value: 'stats', label: t('nav.stats'), Icon: BarChart3 },
    { value: 'edit', label: t('nav.more'), Icon: MoreHorizontal },
  ]
  const moreSections = ['edit', 'information', 'activity']

  return (
    <>
      {!isForm && (
        <Link
          href={`/groups/${groupId}/expenses/create`}
          className="fixed z-40 right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] clay bg-primary text-primary-foreground !rounded-full h-14 pl-4 pr-5 flex items-center gap-2 font-extrabold active:scale-95 transition-transform"
          data-testid="fab-add-expense"
        >
          <Plus className="w-6 h-6" />
          {t('add')}
        </Link>
      )}
      <nav
        aria-label="Menu"
        className="fixed z-40 bottom-0 inset-x-0 px-3 pb-safe pointer-events-none"
      >
        <ul className="pointer-events-auto max-w-md mx-auto clay bg-secondary flex justify-between px-2 py-2">
          {tabs.map(({ value, label, Icon }) => {
            const active =
              value === 'edit'
                ? moreSections.includes(section)
                : section === value
            return (
              <li key={value} className="flex-1">
                <Link
                  href={`/groups/${groupId}${value ? `/${value}` : ''}`}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold text-secondary-foreground/70',
                    active && 'bg-card clay-sm text-secondary-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
