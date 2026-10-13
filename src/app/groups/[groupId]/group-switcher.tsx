'use client'

import {
  getArchivedGroups,
  getRecentGroups,
  RecentGroup,
} from '@/app/groups/recent-groups-helpers'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/** Chips for switching between the groups opened on this device. */
export function GroupSwitcher({
  groupId,
  groupName,
}: {
  groupId: string
  groupName: string
}) {
  const t = useTranslations('Dashboard')
  const [groups, setGroups] = useState<RecentGroup[]>([])

  useEffect(() => {
    const archived = new Set(getArchivedGroups())
    const recent = getRecentGroups().filter(
      (g) => !archived.has(g.id) || g.id === groupId,
    )
    if (!recent.some((g) => g.id === groupId))
      recent.unshift({ id: groupId, name: groupName })
    setGroups(recent)
  }, [groupId, groupName])

  return (
    <nav
      aria-label={t('groups')}
      className="-mx-4 px-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {groups.map((g) => (
        <Link
          key={g.id}
          href={`/groups/${g.id}`}
          className={cn(
            'clay-sm shrink-0 px-4 py-2 text-sm font-extrabold whitespace-nowrap',
            g.id === groupId ? 'bg-sage-strong text-white' : 'bg-card',
          )}
          aria-current={g.id === groupId ? 'page' : undefined}
        >
          {g.name}
        </Link>
      ))}
      <Link
        href={`/groups/create?from=${groupId}`}
        className="clay-sm shrink-0 px-4 py-2 text-sm font-extrabold whitespace-nowrap bg-butter flex items-center gap-1"
        data-testid="new-group"
      >
        <Plus className="w-4 h-4" />
        {t('newGroup')}
      </Link>
    </nav>
  )
}
